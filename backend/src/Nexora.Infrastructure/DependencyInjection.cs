using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nexora.Application.Admin;
using Nexora.Application.Auth;
using Nexora.Application.Catalog;
using Nexora.Application.Checkout;
using Nexora.Application.Orders;
using Nexora.Infrastructure.Admin;
using Nexora.Infrastructure.Catalog;
using Nexora.Infrastructure.Email;
using Nexora.Infrastructure.Identity;
using Nexora.Infrastructure.Ordering;
using Nexora.Infrastructure.Payments;
using Nexora.Infrastructure.Persistence;
using Nexora.Infrastructure.Persistence.Seeding;

namespace Nexora.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "Nexora";
    public const string AdminSeedSectionName = "Seed:Admin";

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

        services.AddOptions<SmtpOptions>()
            .BindConfiguration(SmtpOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<ShippingOptions>().BindConfiguration(ShippingOptions.SectionName);
        services.AddOptions<TaxOptions>().BindConfiguration(TaxOptions.SectionName);
        services.AddOptions<PaymentOptions>()
            .BindConfiguration(PaymentOptions.SectionName)
            .Validate(options => options.IsFakeProvider, "Only the simulated payment provider is implemented (Payments:Provider = Fake).")
            .ValidateOnStart();

        services.AddScoped<IProductCatalog, ProductCatalog>();
        services.AddScoped<ISitemapSource, SitemapSource>();
        services.AddScoped<IAdminDashboard, AdminDashboard>();
        services.AddScoped<IAccountEmailSender, SmtpAccountEmailSender>();
        services.AddScoped<ICheckoutService, CheckoutService>();
        services.AddScoped<IOrderQueries, OrderQueries>();
        services.AddScoped<AuditTrail>();
        services.AddScoped<IAuditLogQueries, AuditLogQueries>();
        services.AddScoped<IAdminCatalogService, AdminCatalogService>();
        services.AddScoped<IAdminInventoryService, AdminInventoryService>();
        services.AddScoped<IAdminOperationsService, AdminOperationsService>();
        services.AddSingleton<IPaymentGateway, SimulatedPaymentGateway>();
        services.AddHostedService<PendingOrderExpirationService>();

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
        var provider = scope.ServiceProvider;
        var db = provider.GetRequiredService<NexoraDbContext>();
        var timeProvider = provider.GetRequiredService<TimeProvider>();

        await db.Database.MigrateAsync(cancellationToken);

        if (!seedSampleData)
        {
            return;
        }

        await CatalogSeeder.SeedAsync(db, timeProvider, cancellationToken);

        var adminSeed = provider.GetRequiredService<IConfiguration>().GetSection(AdminSeedSectionName);
        if (adminSeed["Email"] is { Length: > 0 } adminEmail && adminSeed["Password"] is { Length: > 0 } adminPassword)
        {
            await IdentitySeeder.EnsureAdminAsync(
                provider.GetRequiredService<UserManager<ApplicationUser>>(), adminEmail, adminPassword, timeProvider);
        }
    }
}
