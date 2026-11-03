using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Nexora.Api.Configuration;
using Nexora.Application.Auth;
using Nexora.Infrastructure.Identity;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Api.Auth;

public static class AuthSetup
{
    public const string AdminPolicy = "AdminOnly";
    public const string AuthRateLimitPolicy = "auth";
    public const string CorsPolicy = "storefront";
    public const string CsrfHeaderName = "X-XSRF-TOKEN";

    /// <summary>
    /// Cookie-based session auth with ASP.NET Core Identity (see ADR-0005):
    /// HttpOnly + Secure + SameSite=Lax session cookie, antiforgery header for unsafe methods,
    /// lockout and rate limiting against brute force.
    /// </summary>
    public static IServiceCollection AddNexoraAuth(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(environment);

        // Local development runs over plain HTTP (browser → Vite proxy → API). Everywhere else,
        // including the integration tests, cookies are Secure and use the __Host- prefix
        // (which browsers only accept on Secure cookies with Path=/ and no Domain).
        var isPlainHttpDevelopment = environment.IsDevelopment();
        var cookieSecurePolicy = isPlainHttpDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        var cookiePrefix = isPlainHttpDevelopment ? string.Empty : "__Host-";
        services.AddIdentityCore<ApplicationUser>(options =>
            {
                // NIST SP 800-63B: favour length over composition rules.
                options.Password.RequiredLength = 10;
                options.Password.RequiredUniqueChars = 4;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;

                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);

                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<NexoraDbContext>()
            .AddErrorDescriber<SpanishIdentityErrorDescriber>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        // Reset links expire quickly.
        services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(1));

        // How often a session re-checks the security stamp: password reset or logout-everywhere
        // revokes other sessions within this window.
        services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.FromMinutes(5));

        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = $"{cookiePrefix}nexora-session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = cookieSecurePolicy;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.ExpireTimeSpan = TimeSpan.FromDays(7);
            options.SlidingExpiration = true;

            // An API answers with status codes; it never redirects to an HTML login page.
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        services.AddAuthorizationBuilder()
            .AddPolicy(AdminPolicy, policy => policy.RequireRole(AppRoles.Admin));

        services.AddAntiforgery(options =>
        {
            options.HeaderName = CsrfHeaderName;
            options.Cookie.Name = $"{cookiePrefix}nexora-csrf";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = cookieSecurePolicy;
            options.Cookie.SameSite = SameSiteMode.Strict;
        });

        services.AddDataProtection()
            .SetApplicationName("nexora")
            .PersistKeysToDbContext<NexoraDbContext>();

        var authPermitLimit = configuration.GetValue("RateLimiting:Auth:PermitLimit", 10);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var problemDetails = context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
                await problemDetails.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context.HttpContext,
                    ProblemDetails =
                    {
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Too many requests",
                        Detail = "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
                    },
                });
            };

            // Per client IP. Behind a reverse proxy this requires ForwardedHeaders (phase 11).
            options.AddPolicy(AuthRateLimitPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = authPermitLimit,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }));
        });

        var allowedOrigins = configuration.GetSection(FrontendOptions.SectionName).Get<FrontendOptions>()?.AllowedCorsOrigins ?? [];
        services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
            // Explicit origins only: credentials are never combined with "any origin".
            policy.WithOrigins(allowedOrigins)
                .AllowCredentials()
                .WithHeaders("Content-Type", CsrfHeaderName)
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")));

        return services;
    }
}
