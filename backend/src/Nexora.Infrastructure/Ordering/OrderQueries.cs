using Microsoft.EntityFrameworkCore;
using Nexora.Application.Common;
using Nexora.Application.Orders;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Ordering;

internal sealed class OrderQueries(NexoraDbContext db) : IOrderQueries
{
    private const int MaxOrdersListed = 50;

    public async Task<IReadOnlyList<OrderSummaryResponse>> ListForUserAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.Orders
            .AsNoTracking()
            .Where(order => order.UserId == userId)
            .OrderByDescending(order => order.CreatedAt)
            .Take(MaxOrdersListed)
            .Select(order => new OrderSummaryResponse(
                order.OrderNumber,
                order.Status.ToString(),
                order.CreatedAt,
                order.Items.Sum(item => item.Quantity),
                order.Total,
                StoreCurrency.Code))
            .ToListAsync(cancellationToken);

    public async Task<OrderResponse?> GetForUserAsync(Guid userId, string orderNumber, CancellationToken cancellationToken)
    {
        // Filtering by owner in the query itself: another user's order is simply "not found".
        var order = await db.Orders
            .AsNoTracking()
            .Include(candidate => candidate.Items)
            .SingleOrDefaultAsync(candidate => candidate.OrderNumber == orderNumber && candidate.UserId == userId, cancellationToken);

        return order is null ? null : OrderMapping.ToResponse(order);
    }
}
