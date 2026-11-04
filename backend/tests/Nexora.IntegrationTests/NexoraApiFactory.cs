using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nexora.Api.Seo;
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
    public ApiSession CreateSession()
    {
        var cookies = new CookieContainer();
        var client = new HttpClient(new CookieContainerHandler(cookies) { InnerHandler = Server.CreateHandler() })
        {
            BaseAddress = new Uri("https://localhost"),
        };
        return new ApiSession(client, cookies);
    }

    /// <summary>
    /// Opens the notifications hub with the session's cookies (long polling: the in-memory test
    /// server has no real sockets). The caller registers handlers before calling StartAsync.
    /// </summary>
    public HubConnection CreateHubConnection(ApiSession session)
    {
        ArgumentNullException.ThrowIfNull(session);

        return new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/hubs/notifications"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => new CookieContainerHandler(session.Cookies) { InnerHandler = Server.CreateHandler() };
            })
            .Build();
    }

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
        // The expiration sweep is exercised directly by its test, not on a background timer.
        builder.UseSetting("Payments:ExpirationSweepEnabled", "false");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IAccountEmailSender>();
            services.AddSingleton<IAccountEmailSender>(Emails);
            services.RemoveAll<IIndexHtmlTemplate>();
            services.AddSingleton<IIndexHtmlTemplate, FakeIndexHtmlTemplate>();
        });
    }
}
