using System.Net;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Nexora.Application.Auth;

namespace Nexora.Infrastructure.Email;

internal sealed class SmtpAccountEmailSender(IOptions<SmtpOptions> options) : IAccountEmailSender
{
    public async Task SendPasswordResetAsync(string email, string fullName, Uri resetLink, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(resetLink);

        var smtp = options.Value;
        // User-provided values are HTML-encoded before going into the email body.
        var safeName = WebUtility.HtmlEncode(fullName);
        var safeLink = WebUtility.HtmlEncode(resetLink.AbsoluteUri);

        using var message = new MimeMessage();
        message.From.Add(new MailboxAddress(smtp.FromName, smtp.FromAddress));
        message.To.Add(new MailboxAddress(fullName, email));
        message.Subject = "Restablece tu contraseña de Nexora";
        message.Body = new BodyBuilder
        {
            TextBody =
                $"Hola {fullName}:\n\nPara restablecer tu contraseña abre este enlace (válido por 1 hora):\n{resetLink.AbsoluteUri}\n\nSi no lo solicitaste, ignora este correo.",
            HtmlBody =
                $"<p>Hola {safeName}:</p><p>Para restablecer tu contraseña haz clic en el siguiente enlace (válido por 1 hora):</p><p><a href=\"{safeLink}\">Restablecer contraseña</a></p><p>Si no lo solicitaste, ignora este correo.</p>",
        }.ToMessageBody();

        using var client = new SmtpClient();
        var security = smtp.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None;
        await client.ConnectAsync(smtp.Host, smtp.Port, security, cancellationToken);

        if (!string.IsNullOrEmpty(smtp.Username))
        {
            await client.AuthenticateAsync(smtp.Username, smtp.Password ?? string.Empty, cancellationToken);
        }

        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);
    }
}
