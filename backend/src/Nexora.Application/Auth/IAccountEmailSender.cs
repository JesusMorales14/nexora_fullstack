namespace Nexora.Application.Auth;

/// <summary>Transactional account emails. Implemented with SMTP in Infrastructure; faked in tests.</summary>
public interface IAccountEmailSender
{
    Task SendPasswordResetAsync(string email, string fullName, Uri resetLink, CancellationToken cancellationToken);
}
