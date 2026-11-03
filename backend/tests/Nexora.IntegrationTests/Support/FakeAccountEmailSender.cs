using System.Collections.Concurrent;
using Nexora.Application.Auth;

namespace Nexora.IntegrationTests.Support;

/// <summary>Captures password reset links instead of sending email.</summary>
public sealed class FakeAccountEmailSender : IAccountEmailSender
{
    private readonly ConcurrentDictionary<string, Uri> _lastResetLinkByEmail = new(StringComparer.OrdinalIgnoreCase);

    public Task SendPasswordResetAsync(string email, string fullName, Uri resetLink, CancellationToken cancellationToken)
    {
        _lastResetLinkByEmail[email] = resetLink;
        return Task.CompletedTask;
    }

    public Uri? LastResetLinkFor(string email) => _lastResetLinkByEmail.GetValueOrDefault(email);
}
