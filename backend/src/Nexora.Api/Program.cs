using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Nexora.Api.Auth;
using Nexora.Api.Common;
using Nexora.Api.Configuration;
using Nexora.Api.Realtime;
using Nexora.Api.Seo;
using Nexora.Application.Checkout;
using Nexora.Application.Common;
using Nexora.Application.Realtime;
using Nexora.Infrastructure;
using Nexora.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // The API only receives small JSON bodies (no file uploads): reject anything larger early.
    options.Limits.MaxRequestBodySize = 1_048_576;
    // Do not advertise the server software.
    options.AddServerHeader = false;
});

builder.Services.AddControllers(options =>
    {
        // CSRF defense for cookie auth: every POST/PUT/PATCH/DELETE must carry a valid antiforgery token.
        options.Filters.Add<AntiforgeryValidationFilter>();
        // Validation error keys use the JSON (camelCase) names the client sends, e.g. "password".
        options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());
    })
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddValidatorsFromAssemblyContaining<CheckoutRequestValidator>();
builder.Services.AddOpenApi();

// RFC 9457 Problem Details for every error response (validation, 404, unhandled exceptions).
// The traceId lets support correlate a user-visible error with the server logs.
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
});

builder.Services.AddOptions<FrontendOptions>()
    .BindConfiguration(FrontendOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddExceptionHandler<BadHttpRequestExceptionHandler>();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

builder.Services.AddInfrastructure();
builder.Services.AddNexoraAuth(builder.Configuration, builder.Environment);

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IIndexHtmlTemplate, HttpIndexHtmlTemplate>(client => client.Timeout = TimeSpan.FromSeconds(5));

builder.Services.AddSignalR();
builder.Services.AddSingleton<IRealtimeNotifier, SignalRNotifier>();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<NexoraDbContext>("database");

var app = builder.Build();

app.UseMiddleware<SecurityHeadersMiddleware>();

// Unhandled exceptions become a generic 500 Problem Details: no stack traces leak to clients.
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    // Development runs over plain HTTP behind the Vite proxy; everywhere else HTTPS is mandatory.
    app.UseHsts();
    app.UseHttpsRedirection();
}
// Empty 4xx responses (unknown routes, 401/403, antiforgery failures) get a Problem Details body.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    await app.Services.InitializeDatabaseAsync(seedSampleData: true);
}

app.UseCors(AuthSetup.CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<HubOriginValidationMiddleware>();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<NotificationsHub>(NotificationsHub.Path, options =>
    // A long-lived connection must not outlive the session that opened it (logout, expiry).
    options.CloseOnAuthenticationExpiration = true);

await app.RunAsync();

/// <summary>Exposed so integration tests can boot the API with WebApplicationFactory.</summary>
public partial class Program;
