using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Nexora.Api.Configuration;
using Nexora.Application.Auth;
using Nexora.Infrastructure.Identity;

namespace Nexora.Api.Auth;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IAntiforgery antiforgery,
    IAccountEmailSender emailSender,
    IOptions<FrontendOptions> frontendOptions,
    TimeProvider timeProvider) : ControllerBase
{
    private const string InvalidCredentialsDetail =
        "Correo o contraseña incorrectos. Tras varios intentos fallidos la cuenta se bloquea 15 minutos.";

    /// <summary>
    /// Issues an antiforgery request token bound to the current user. The SPA keeps it in memory
    /// and sends it in the X-XSRF-TOKEN header on every unsafe request. Call it again after
    /// login/logout, because the token is tied to the identity.
    /// </summary>
    [HttpGet("csrf")]
    [ProducesResponseType<CsrfTokenResponse>(StatusCodes.Status200OK, "application/json")]
    public IActionResult GetCsrfToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new CsrfTokenResponse(tokens.RequestToken ?? string.Empty));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
    public async Task<IActionResult> GetCurrentUserAsync()
    {
        var user = await userManager.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(await ToResponseAsync(user));
    }

    [HttpPost("register")]
    [EnableRateLimiting(AuthSetup.AuthRateLimitPolicy)]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status201Created, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> RegisterAsync(RegisterRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var user = new ApplicationUser
        {
            Id = Guid.CreateVersion7(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
            CreatedAt = timeProvider.GetUtcNow(),
        };

        var created = await userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return IdentityValidationProblem(created);
        }

        await userManager.AddToRoleAsync(user, AppRoles.Customer);
        await signInManager.SignInAsync(user, isPersistent: false);

        return StatusCode(StatusCodes.Status201Created, await ToResponseAsync(user));
    }

    [HttpPost("login")]
    [EnableRateLimiting(AuthSetup.AuthRateLimitPolicy)]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
    public async Task<IActionResult> LoginAsync(LoginRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return InvalidCredentials();
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, request.RememberMe, lockoutOnFailure: true);

        // Same response for wrong password, unknown email and lockout: no account enumeration.
        return result.Succeeded ? Ok(await ToResponseAsync(user)) : InvalidCredentials();
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LogoutAsync()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    /// <summary>Always 202, whether or not the email exists, so it cannot be used to discover accounts.</summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting(AuthSetup.AuthRateLimitPolicy)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user?.Email is { } email)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            await emailSender.SendPasswordResetAsync(email, user.FullName, BuildResetLink(email, token), cancellationToken);
        }

        return Accepted();
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting(AuthSetup.AuthRateLimitPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> ResetPasswordAsync(ResetPasswordRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            // Indistinguishable from an expired token.
            return IdentityValidationProblem(IdentityResult.Failed(userManager.ErrorDescriber.InvalidToken()));
        }

        // Also rotates the security stamp, which signs out the user's other sessions.
        var reset = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        return reset.Succeeded ? NoContent() : IdentityValidationProblem(reset);
    }

    private Uri BuildResetLink(string email, string token)
    {
        var baseUrl = frontendOptions.Value.BaseUrl.TrimEnd('/');
        var query = $"email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        return new Uri($"{baseUrl}/reset-password?{query}");
    }

    private async Task<CurrentUserResponse> ToResponseAsync(ApplicationUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.FullName, [.. await userManager.GetRolesAsync(user)]);

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid credentials", detail: InvalidCredentialsDetail);

    /// <summary>Maps Identity errors to the request field they belong to, so the form can show them inline.</summary>
    private ActionResult IdentityValidationProblem(IdentityResult result)
    {
        var errors = new ModelStateDictionary();

        foreach (var error in result.Errors)
        {
            var field = error.Code switch
            {
                _ when error.Code.StartsWith("Password", StringComparison.Ordinal) => "password",
                "DuplicateEmail" or "DuplicateUserName" or "InvalidEmail" or "InvalidUserName" => "email",
                "InvalidToken" => "token",
                _ => string.Empty,
            };

            if (errors[field]?.Errors.Any(existing => existing.ErrorMessage == error.Description) != true)
            {
                errors.AddModelError(field, error.Description);
            }
        }

        return ValidationProblem(errors);
    }
}
