using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nexora.Application.Catalog;
using Nexora.Infrastructure.Catalog;
using Nexora.Infrastructure.Persistence;
using Nexora.Infrastructure.Persistence.Seeding;

namespace Nexora.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "Nexora";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);

        // The connection string is resolved lazily so test hosts can override configuration.
        services.AddDbContext<NexoraDbContext>((serviceProvider, options) =>
        {
            var connectionString = serviceProvider.GetRequiredService<IConfiguration>().GetConnectionString(ConnectionStringName)
                ?? throw new InvalidOperationException(
                    $"Connection string '{ConnectionStringName}' is not configured. See README (dotnet user-secrets).");

            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
        });

        services.AddScoped<IProductCatalog, ProductCatalog>();

        return services;
    }

    /// <summary>
    /// Applies pending migrations and optionally seeds demo data. Only for Development and tests:
    /// production migrations run as a controlled deployment step, never on app start.
    /// </summary>
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        bool seedSampleData,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NexoraDbContext>();

        await db.Database.MigrateAsync(cancellationToken);

        if (seedSampleData)
        {
            await CatalogSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<TimeProvider>(), cancellationToken);
        }
    }
}
