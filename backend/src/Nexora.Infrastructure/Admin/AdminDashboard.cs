using Microsoft.EntityFrameworkCore;
using Nexora.Application.Admin;
using Nexora.Infrastructure.Persistence;
using Nexora.Infrastructure.Persistence.Configurations;

namespace Nexora.Infrastructure.Admin;

internal sealed class AdminDashboard(NexoraDbContext db) : IAdminDashboard
{
    public async Task<AdminSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        // Sequential on purpose: a DbContext does not support concurrent queries.
        var totalProducts = await db.Products.CountAsync(cancellationToken);
        var publishedProducts = await db.Products.CountAsync(product => product.IsPublished, cancellationToken);
        var lowStockVariants = await db.InventoryItems.CountAsync(
            inventory => inventory.OnHand - inventory.Reserved > 0
                && inventory.OnHand - inventory.Reserved <= inventory.LowStockThreshold,
            cancellationToken);
        var outOfStockVariants = await db.InventoryItems.CountAsync(
            inventory => inventory.OnHand - inventory.Reserved <= 0, cancellationToken);
        var customers = await db.UserRoles.CountAsync(
            userRole => userRole.RoleId == RoleConfiguration.CustomerRoleId, cancellationToken);

        return new AdminSummaryResponse(totalProducts, publishedProducts, lowStockVariants, outOfStockVariants, customers);
    }
}
