using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Nexora.Infrastructure;
using Nexora.IntegrationTests;
using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(NexoraApiFactory))]

namespace Nexora.IntegrationTests;

/// <summary>
/// Boots the real API against a throwaway PostgreSQL container (same major version as
/// docker-compose), applies the migrations and seeds the demo catalog once per test run.
/// Tests must treat the seeded data as read-only.
/// </summary>
public sealed class NexoraApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18-alpine").Build();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        await Services.InitializeDatabaseAsync(seedSampleData: true);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" skips the Development-only startup work (auto-migrate, OpenAPI UI) and
        // user-secrets, so tests never touch the developer's local database.
        builder.UseEnvironment("Testing");
        builder.UseSetting($"ConnectionStrings:{DependencyInjection.ConnectionStringName}", _postgres.GetConnectionString());
    }
}
