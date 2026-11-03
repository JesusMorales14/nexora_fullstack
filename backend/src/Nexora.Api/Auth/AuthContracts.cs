using System.ComponentModel.DataAnnotations;
using Nexora.Infrastructure.Identity;

namespace Nexora.Api.Auth;

// Request DTOs: only the fields a client may set (prevents mass assignment of roles, lockout, etc.).
// [ApiController] turns DataAnnotations failures into 400 Problem Details automatically, keyed by
// the camelCase JSON name (SystemTextJsonValidationMetadataProvider in Program.cs).

public sealed class RegisterRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 10)]
    public string Password { get; init; } = string.Empty;

    [Required, StringLength(ApplicationUser.FullNameMaxLength, MinimumLength = 2)]
    public string FullName { get; init; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(128)]
    public string Password { get; init; } = string.Empty;

    public bool RememberMe { get; init; }
}

public sealed class ForgotPasswordRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(2048)]
    public string Token { get; init; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 10)]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed record CurrentUserResponse(Guid Id, string Email, string FullName, IReadOnlyList<string> Roles);

public sealed record CsrfTokenResponse(string Token);
