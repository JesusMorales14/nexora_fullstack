using Microsoft.AspNetCore.Identity;

namespace Nexora.Infrastructure.Identity;

/// <summary>
/// Identity account. Password hashing, lockout and security stamps are handled by
/// ASP.NET Core Identity; we never implement our own crypto.
/// </summary>
public sealed class ApplicationUser : IdentityUser<Guid>
{
    public const int FullNameMaxLength = 120;

    public string FullName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
