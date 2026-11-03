using System.ComponentModel.DataAnnotations;

namespace Nexora.Infrastructure.Email;

public sealed class SmtpOptions
{
    public const string SectionName = "Email:Smtp";

    [Required]
    public string Host { get; init; } = string.Empty;

    [Range(1, 65535)]
    public int Port { get; init; }

    /// <summary>Must be true in production. Local MailPit does not use TLS.</summary>
    public bool UseStartTls { get; init; }

    public string? Username { get; init; }

    /// <summary>Secret: provided by user-secrets / environment, never committed.</summary>
    public string? Password { get; init; }

    [Required]
    [EmailAddress]
    public string FromAddress { get; init; } = string.Empty;

    [Required]
    public string FromName { get; init; } = string.Empty;
}
