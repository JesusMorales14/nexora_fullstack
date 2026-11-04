using Microsoft.EntityFrameworkCore;
using Nexora.Domain.Ordering;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Ordering;

/// <summary>Shared by checkout (rejection, expiry) and the admin panel (manual cancellation).</summary>
internal static class StockReservations
{
    /// <summary>Returns the units an unpaid order was holding. Call inside the caller's transaction.</summary>
    public static async Task ReleaseAsync(NexoraDbContext db, Order order, CancellationToken cancellationToken)
    {
        foreach (var item in order.Items)
        {
            await db.InventoryItems
                .Where(inventory => inventory.VariantId == item.VariantId && inventory.Reserved >= item.Quantity)
                .ExecuteUpdateAsync(setters => setters.SetProperty(inventory => inventory.Reserved, inventory => inventory.Reserved - item.Quantity), cancellationToken);
        }
    }
}
