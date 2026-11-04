using Microsoft.EntityFrameworkCore;
using Nexora.Application.Admin;
using Nexora.Application.Common;
using Nexora.Domain.Catalog;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Admin;

internal sealed class AdminInventoryService(
    NexoraDbContext db,
    AuditTrail audit,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IAdminInventoryService
{
    private const int MovementsListed = 100;

    public async Task<PagedResponse<InventoryItemResponse>> ListAsync(AdminInventoryListRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (page, pageSize) = Paging.Normalize(request.Page, request.PageSize);
        var rows = Rows();

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = Paging.ContainsPattern(request.Q);
            rows = rows.Where(row =>
                EF.Functions.ILike(row.Sku, pattern, Paging.LikeEscape)
                || EF.Functions.ILike(row.ProductName, pattern, Paging.LikeEscape));
        }

        if (request.LowStockOnly == true)
        {
            rows = rows.Where(row => row.OnHand - row.Reserved <= row.LowStockThreshold);
        }

        var total = await rows.CountAsync(cancellationToken);
        var items = await rows
            // Most urgent first: what is about to run out.
            .OrderBy(row => row.OnHand - row.Reserved)
            .ThenBy(row => row.ProductName)
            .ThenBy(row => row.Sku)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<InventoryItemResponse>([.. items.Select(ToResponse)], page, pageSize, total);
    }

    public async Task<CommandResult<InventoryItemResponse>> AdjustAsync(Guid variantId, InventoryAdjustmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var current = await Rows().SingleOrDefaultAsync(row => row.VariantId == variantId, cancellationToken);
        if (current is null)
        {
            return CommandResult.NotFound<InventoryItemResponse>();
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Atomic and race-free like checkout: on-hand can never drop below what pending orders reserved.
        var change = request.QuantityChange;
        var updated = await db.InventoryItems
            .Where(inventory => inventory.VariantId == variantId && inventory.OnHand + change >= inventory.Reserved)
            .ExecuteUpdateAsync(setters => setters.SetProperty(inventory => inventory.OnHand, inventory => inventory.OnHand + change), cancellationToken);

        if (updated == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return CommandResult.Conflict<InventoryItemResponse>(
                $"No puedes dejar menos unidades que las reservadas por pedidos pendientes ({current.Reserved}).");
        }

        db.InventoryMovements.Add(new InventoryMovement(
            variantId, change, request.Reason, request.Note, currentUser.UserId, reference: null, timeProvider.GetUtcNow()));
        audit.Record(
            "inventory.adjusted",
            "ProductVariant",
            variantId,
            $"{current.Sku}: {(change > 0 ? "+" : string.Empty)}{change} unidades ({request.Reason}).");

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var refreshed = await Rows().SingleAsync(row => row.VariantId == variantId, cancellationToken);
        return CommandResult.Ok(ToResponse(refreshed));
    }

    public async Task<IReadOnlyList<InventoryMovementResponse>?> ListMovementsAsync(Guid variantId, CancellationToken cancellationToken)
    {
        if (!await db.ProductVariants.AnyAsync(variant => variant.Id == variantId, cancellationToken))
        {
            return null;
        }

        return await db.InventoryMovements
            .AsNoTracking()
            .Where(movement => movement.VariantId == variantId)
            .OrderByDescending(movement => movement.CreatedAt)
            .Take(MovementsListed)
            .Select(movement => new InventoryMovementResponse(
                movement.Id,
                movement.QuantityChange,
                movement.Reason.ToString(),
                movement.Note,
                movement.Reference,
                movement.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    // Member-initialized projection: unlike constructor projections, EF Core can keep filtering
    // and ordering on its properties in SQL.
    private IQueryable<InventoryRow> Rows() =>
        from variant in db.ProductVariants.AsNoTracking()
        join product in db.Products on variant.ProductId equals product.Id
        select new InventoryRow
        {
            VariantId = variant.Id,
            ProductId = product.Id,
            ProductName = product.Name,
            VariantName = variant.Name,
            Sku = variant.Sku,
            OnHand = variant.Inventory.OnHand,
            Reserved = variant.Inventory.Reserved,
            LowStockThreshold = variant.Inventory.LowStockThreshold,
        };

    private static InventoryItemResponse ToResponse(InventoryRow row)
    {
        var available = row.OnHand - row.Reserved;
        return new InventoryItemResponse(
            row.VariantId, row.ProductId, row.ProductName, row.VariantName, row.Sku,
            row.OnHand, row.Reserved, available, row.LowStockThreshold, available <= row.LowStockThreshold);
    }

    private sealed class InventoryRow
    {
        public Guid VariantId { get; init; }

        public Guid ProductId { get; init; }

        public string ProductName { get; init; } = string.Empty;

        public string VariantName { get; init; } = string.Empty;

        public string Sku { get; init; } = string.Empty;

        public int OnHand { get; init; }

        public int Reserved { get; init; }

        public int LowStockThreshold { get; init; }
    }
}
