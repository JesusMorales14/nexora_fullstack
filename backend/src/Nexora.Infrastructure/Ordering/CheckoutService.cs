using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Nexora.Application.Catalog;
using Nexora.Application.Checkout;
using Nexora.Application.Common;
using Nexora.Domain.Catalog;
using Nexora.Domain.Ordering;
using Nexora.Infrastructure.Persistence;
using Npgsql;

namespace Nexora.Infrastructure.Ordering;

internal sealed class CheckoutService(
    NexoraDbContext db,
    IPaymentGateway paymentGateway,
    IOptions<ShippingOptions> shippingOptions,
    IOptions<TaxOptions> taxOptions,
    IOptions<PaymentOptions> paymentOptions,
    TimeProvider timeProvider) : ICheckoutService
{
    private const int ExpirationBatchSize = 100;

    public async Task<CartQuoteResponse> QuoteAsync(CartQuoteRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var variants = await LoadVariantsAsync(request.Items.Select(item => item.VariantId), cancellationToken);
        var lines = new List<CartLineResponse>();
        var unavailable = new List<Guid>();

        foreach (var item in request.Items)
        {
            if (!variants.TryGetValue(item.VariantId, out var variant))
            {
                unavailable.Add(item.VariantId);
                continue;
            }

            lines.Add(new CartLineResponse(
                variant.VariantId,
                variant.ProductSlug,
                variant.ProductName,
                variant.VariantName,
                variant.Sku,
                variant.Image,
                variant.Price,
                variant.CompareAtPrice,
                item.Quantity,
                variant.Price * item.Quantity,
                IsAvailable: variant.Available >= item.Quantity,
                // Caps what the UI offers without revealing exact stock levels above the limit.
                MaxQuantity: Math.Clamp(variant.Available, 0, OrderItem.MaxQuantity)));
        }

        var subtotal = lines.Sum(line => line.LineTotal);
        var shipping = request.Department is { } department
            ? ShippingCalculator.Quote(department, subtotal, shippingOptions.Value)
            : (ShippingQuote?)null;
        var total = subtotal + (shipping?.Cost ?? 0m);
        var tax = TaxBreakdown.FromGross(total, taxOptions.Value.IgvRate);

        return new CartQuoteResponse(
            lines,
            unavailable,
            subtotal,
            shipping is { } quote ? new ShippingQuoteResponse(quote.Code, quote.Label, quote.Cost, quote.EstimatedDelivery) : null,
            shippingOptions.Value.FreeShippingThreshold,
            total,
            new TaxResponse(tax.Rate, tax.TaxableAmount, tax.TaxAmount),
            StoreCurrency.Code,
            CanCheckout: lines.Count > 0 && unavailable.Count == 0 && lines.TrueForAll(line => line.IsAvailable));
    }

    public async Task<CheckoutResult> PlaceOrderAsync(
        Guid userId,
        Guid idempotencyKey,
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // A retried request (double click, flaky network) returns the order it already created.
        if (await FindByIdempotencyKeyAsync(userId, idempotencyKey, cancellationToken) is { } existing)
        {
            return CheckoutResult.Success(await ToCheckoutResponseAsync(existing, cancellationToken), isReplay: true);
        }

        // Prices are read from the database right now; nothing economic comes from the client.
        var variants = await LoadVariantsAsync(request.Items.Select(item => item.VariantId), cancellationToken);
        var missing = request.Items.Where(item => !variants.ContainsKey(item.VariantId)).Select(item => item.VariantId.ToString()).ToList();
        if (missing.Count > 0)
        {
            return CheckoutResult.Failure(CheckoutOutcome.Unavailable, missing);
        }

        var lines = request.Items
            .Select(item =>
            {
                var variant = variants[item.VariantId];
                return new OrderLine(variant.VariantId, variant.ProductSlug, variant.ProductName, variant.VariantName, variant.Sku, variant.Price, item.Quantity);
            })
            .ToList();

        var addressRequest = request.ShippingAddress;
        var address = new ShippingAddress(
            addressRequest.RecipientName,
            addressRequest.Phone,
            addressRequest.Department,
            addressRequest.Province,
            addressRequest.District,
            addressRequest.AddressLine,
            addressRequest.Reference);
        var shipping = ShippingCalculator.Quote(address.Department, lines.Sum(line => line.UnitPrice * line.Quantity), shippingOptions.Value);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        foreach (var line in lines)
        {
            // Atomic check-and-reserve: the WHERE clause and the update run as one statement, so two
            // concurrent checkouts can never both take the last unit (no read-then-write race).
            var reservedRows = await db.InventoryItems
                .Where(inventory => inventory.VariantId == line.VariantId && inventory.OnHand - inventory.Reserved >= line.Quantity)
                .ExecuteUpdateAsync(setters => setters.SetProperty(inventory => inventory.Reserved, inventory => inventory.Reserved + line.Quantity), cancellationToken);

            if (reservedRows == 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                return CheckoutResult.Failure(CheckoutOutcome.OutOfStock, [line.Sku]);
            }
        }

        var order = Order.Create(userId, idempotencyKey, address, shipping, lines, taxOptions.Value.IgvRate, timeProvider.GetUtcNow());
        db.Orders.Add(order);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Two requests with the same key raced: the other one won and its reservation stands.
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var winner = await FindByIdempotencyKeyAsync(userId, idempotencyKey, cancellationToken);
            if (winner is null)
            {
                throw;
            }

            return CheckoutResult.Success(await ToCheckoutResponseAsync(winner, cancellationToken), isReplay: true);
        }

        return CheckoutResult.Success(await ToCheckoutResponseAsync(order, cancellationToken), isReplay: false);
    }

    public async Task<PaymentConfirmationOutcome> ConfirmPaymentAsync(
        Guid userId,
        string orderNumber,
        bool isApproved,
        string paymentReference,
        CancellationToken cancellationToken)
    {
        var order = await db.Orders
            .Include(candidate => candidate.Items)
            .SingleOrDefaultAsync(candidate => candidate.OrderNumber == orderNumber && candidate.UserId == userId, cancellationToken);

        if (order is null)
        {
            return PaymentConfirmationOutcome.NotFound;
        }

        if (order.Status == OrderStatus.Paid)
        {
            // Providers may notify the same payment more than once.
            return isApproved ? PaymentConfirmationOutcome.AlreadyPaid : PaymentConfirmationOutcome.NotPending;
        }

        if (order.Status != OrderStatus.PendingPayment)
        {
            return PaymentConfirmationOutcome.NotPending;
        }

        var now = timeProvider.GetUtcNow();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        PaymentConfirmationOutcome outcome;

        if (IsPaymentWindowOver(order, now))
        {
            await StockReservations.ReleaseAsync(db, order, cancellationToken);
            order.Cancel(now);
            outcome = PaymentConfirmationOutcome.Expired;
        }
        else if (isApproved)
        {
            foreach (var item in order.Items)
            {
                // The reserved units become a sale: they leave both "reserved" and "on hand".
                var updated = await db.InventoryItems
                    .Where(inventory => inventory.VariantId == item.VariantId && inventory.Reserved >= item.Quantity)
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(inventory => inventory.OnHand, inventory => inventory.OnHand - item.Quantity)
                            .SetProperty(inventory => inventory.Reserved, inventory => inventory.Reserved - item.Quantity),
                        cancellationToken);

                if (updated == 0)
                {
                    throw new InvalidOperationException($"Reservation for {item.Sku} in order {order.OrderNumber} is missing.");
                }

                // Every on-hand change is explained in the inventory ledger.
                db.InventoryMovements.Add(new InventoryMovement(
                    item.VariantId, -item.Quantity, InventoryMovementReason.Sale, note: null, actorUserId: null, order.OrderNumber, now));
            }

            order.MarkPaid(paymentReference, now);
            outcome = PaymentConfirmationOutcome.Confirmed;
        }
        else
        {
            await StockReservations.ReleaseAsync(db, order, cancellationToken);
            order.MarkPaymentFailed(now);
            outcome = PaymentConfirmationOutcome.Rejected;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return outcome;
        }
        catch (DbUpdateConcurrencyException)
        {
            // The expiration sweep (or another notification) changed the order first; the
            // transaction rolls back, including the stock updates above.
            await transaction.RollbackAsync(cancellationToken);
            return PaymentConfirmationOutcome.NotPending;
        }
    }

    public async Task<int> ExpireStalePendingOrdersAsync(CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        var cutoff = now - TimeSpan.FromMinutes(paymentOptions.Value.PendingPaymentTimeoutMinutes);

        var staleOrders = await db.Orders
            .Include(order => order.Items)
            .Where(order => order.Status == OrderStatus.PendingPayment && order.CreatedAt < cutoff)
            .OrderBy(order => order.CreatedAt)
            .Take(ExpirationBatchSize)
            .ToListAsync(cancellationToken);

        var expired = 0;
        foreach (var order in staleOrders)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await StockReservations.ReleaseAsync(db, order, cancellationToken);
                order.Cancel(now);
                await db.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                expired++;
            }
            catch (DbUpdateConcurrencyException)
            {
                // Paid in the meantime: leave it alone.
                await transaction.RollbackAsync(cancellationToken);
                db.Entry(order).State = EntityState.Detached;
            }
        }

        return expired;
    }

    private bool IsPaymentWindowOver(Order order, DateTimeOffset now) =>
        order.CreatedAt.AddMinutes(paymentOptions.Value.PendingPaymentTimeoutMinutes) < now;

    private Task<Order?> FindByIdempotencyKeyAsync(Guid userId, Guid idempotencyKey, CancellationToken cancellationToken) =>
        db.Orders
            .Include(order => order.Items)
            .SingleOrDefaultAsync(order => order.UserId == userId && order.IdempotencyKey == idempotencyKey, cancellationToken);

    private async Task<CheckoutResponse> ToCheckoutResponseAsync(Order order, CancellationToken cancellationToken) =>
        new(OrderMapping.ToResponse(order), await paymentGateway.CreatePaymentUrlAsync(order.OrderNumber, order.Total, cancellationToken));

    private async Task<Dictionary<Guid, VariantSnapshot>> LoadVariantsAsync(IEnumerable<Guid> variantIds, CancellationToken cancellationToken)
    {
        var ids = variantIds.Distinct().ToList();

        return await (
                from variant in db.ProductVariants
                join product in db.Products on variant.ProductId equals product.Id
                where product.IsPublished && ids.Contains(variant.Id)
                select new VariantSnapshot(
                    variant.Id,
                    product.Slug,
                    product.Name,
                    variant.Name,
                    variant.Sku,
                    variant.Price,
                    variant.CompareAtPrice,
                    variant.Inventory.OnHand - variant.Inventory.Reserved,
                    product.Images
                        .OrderBy(image => image.SortOrder)
                        .Select(image => new ProductImageResponse(image.Url, image.AltText, image.Width, image.Height))
                        .FirstOrDefault()))
            .ToDictionaryAsync(snapshot => snapshot.VariantId, cancellationToken);
    }

    private sealed record VariantSnapshot(
        Guid VariantId,
        string ProductSlug,
        string ProductName,
        string VariantName,
        string Sku,
        decimal Price,
        decimal? CompareAtPrice,
        int Available,
        ProductImageResponse? Image);
}
