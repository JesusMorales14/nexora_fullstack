using Microsoft.AspNetCore.Identity;
using Nexora.Application.Auth;

namespace Nexora.Infrastructure.Identity;

public static class IdentitySeeder
{
    /// <summary>
    /// Creates the first administrator if it does not exist yet. Credentials come from
    /// configuration (user-secrets locally), never from source code.
    /// </summary>
    public static async Task EnsureAdminAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string password,
        TimeProvider timeProvider)
    {
        ArgumentNullException.ThrowIfNull(userManager);
        ArgumentNullException.ThrowIfNull(timeProvider);

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var admin = new ApplicationUser
        {
            Id = Guid.CreateVersion7(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = "Administrador Nexora",
            CreatedAt = timeProvider.GetUtcNow(),
        };

        var created = await userManager.CreateAsync(admin, password);
        if (!created.Succeeded)
        {
            throw new InvalidOperationException(
                $"Could not seed the admin user: {string.Join(", ", created.Errors.Select(error => error.Code))}");
        }

        await userManager.AddToRoleAsync(admin, AppRoles.Admin);
    }
}
