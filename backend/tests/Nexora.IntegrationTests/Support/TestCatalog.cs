using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexora.Domain.Catalog;
using Nexora.Infrastructure.Persistence;

namespace Nexora.IntegrationTests.Support;

/// <summary>
/// Creates products owned by a single test, so stock-changing tests never touch the shared
/// seeded catalog that other tests read.
/// </summary>
public static class TestCatalog
{
    public static async Task<ProductVariant> CreateVariantAsync(this NexoraApiFactory factory, decimal price, int stock)
    {
        ArgumentNullException.ThrowIfNull(factory);

        var suffix = Guid.NewGuid().ToString("N")[..12];
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NexoraDbContext>();
        var now = DateTimeOffset.UtcNow;

        var category = new Category($"Categoría {suffix}", $"categoria-{suffix}");
        var brand = new Brand($"Marca {suffix}", $"marca-{suffix}");
        var product = new Product($"Producto {suffix}", $"producto-{suffix}", "Producto de prueba.", category, brand, now);
        var variant = product.AddVariant($"TEST-{suffix}", "Base", price, initialStock: stock);
        product.AddImage("/images/products/mouse.svg", "Producto de prueba", 800, 800);
        product.Publish(now);

        db.AddRange(category, brand, product);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return variant;
    }

    public static async Task<(int OnHand, int Reserved)> GetInventoryAsync(this NexoraApiFactory factory, Guid variantId)
    {
        ArgumentNullException.ThrowIfNull(factory);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NexoraDbContext>();
        var inventory = await db.InventoryItems.AsNoTracking()
            .SingleAsync(item => item.VariantId == variantId, TestContext.Current.CancellationToken);
        return (inventory.OnHand, inventory.Reserved);
    }
}
