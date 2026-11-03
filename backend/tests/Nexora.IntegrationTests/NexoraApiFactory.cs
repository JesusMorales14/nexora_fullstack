using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nexora.Application.Auth;
using Nexora.Infrastructure;
using Nexora.Infrastructure.Persistence;
using Nexora.IntegrationTests;
using Nexora.IntegrationTests.Support;
using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(NexoraApiFactory))]

namespace Nexora.IntegrationTests;

/// <summary>
/// Boots the real API against a throwaway PostgreSQL container (same major version as
/// docker-compose), applies the migrations and seeds the demo catalog and an admin once per run.
/// Tests must treat the seeded data as read-only and create their own users.
/// </summary>
public sealed class NexoraApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@nexora.test";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18-alpine").Build();

    /// <summary>Random per run: test credentials are never hard-coded.</summary>
    public string AdminPassword { get; } = $"Admin-{Guid.NewGuid():N}";

    public FakeAccountEmailSender Emails { get; } = new();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();

        // Migrate before the host starts: hosted services (Data Protection key ring) query the
        // schema on startup. Program.cs does the same ordering in Development.
        var options = new DbContextOptionsBuilder<NexoraDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;
        await using (var db = new NexoraDbContext(options))
        {
            await db.Database.MigrateAsync();
        }

        await Services.InitializeDatabaseAsync(seedSampleData: true);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    /// <summary>A browser-like client: its own cookie jar, HTTPS so Secure/__Host- cookies are kept.</summary>
    public ApiSession CreateSession() =>
        new(CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
            AllowAutoRedirect = false,
        }));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" skips the Development-only startup work (auto-migrate, OpenAPI UI) and
        // user-secrets, so tests never touch the developer's local database.
        builder.UseEnvironment("Testing");
        builder.UseSetting($"ConnectionStrings:{DependencyInjection.ConnectionStringName}", _postgres.GetConnectionString());
        builder.UseSetting("Frontend:BaseUrl", "https://nexora.test");
        builder.UseSetting("Email:Smtp:Host", "localhost");
        builder.UseSetting("Email:Smtp:Port", "1025");
        builder.UseSetting("Email:Smtp:FromAddress", "no-reply@nexora.test");
        builder.UseSetting("Email:Smtp:FromName", "Nexora");
        builder.UseSetting($"{DependencyInjection.AdminSeedSectionName}:Email", AdminEmail);
        builder.UseSetting($"{DependencyInjection.AdminSeedSectionName}:Password", AdminPassword);
        // All test requests share one client IP; rate limiting has its own dedicated test.
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "10000");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IAccountEmailSender>();
            services.AddSingleton<IAccountEmailSender>(Emails);
        });
    }
}
