namespace Nexora.Application.Checkout;

public enum CheckoutOutcome
{
    Placed,

    /// <summary>Same idempotency key as an earlier checkout: the existing order is returned.</summary>
    Replayed,

    /// <summary>Some variants no longer exist or are unpublished.</summary>
    Unavailable,

    /// <summary>Not enough stock for at least one line (possibly taken by a concurrent checkout).</summary>
    OutOfStock,
}

public sealed record CheckoutResult(CheckoutOutcome Outcome, CheckoutResponse? Response, IReadOnlyList<string> ProblemSkus)
{
    public static CheckoutResult Success(CheckoutResponse response, bool isReplay) =>
        new(isReplay ? CheckoutOutcome.Replayed : CheckoutOutcome.Placed, response, []);

    public static CheckoutResult Failure(CheckoutOutcome outcome, IReadOnlyList<string> problemSkus) =>
        new(outcome, null, problemSkus);
}

public enum PaymentConfirmationOutcome
{
    Confirmed,
    Rejected,
    AlreadyPaid,
    NotFound,
    NotPending,
    Expired,
}

public interface ICheckoutService
{
    Task<CartQuoteResponse> QuoteAsync(CartQuoteRequest request, CancellationToken cancellationToken);

    /// <summary>Validates prices and stock again, reserves stock atomically and creates the order.</summary>
    Task<CheckoutResult> PlaceOrderAsync(Guid userId, Guid idempotencyKey, CheckoutRequest request, CancellationToken cancellationToken);

    /// <summary>Applies a payment provider's verdict: converts the reservation into a sale or releases it.</summary>
    Task<PaymentConfirmationOutcome> ConfirmPaymentAsync(
        Guid userId, string orderNumber, bool isApproved, string paymentReference, CancellationToken cancellationToken);

    /// <summary>Cancels unpaid orders older than the payment window and releases their stock.</summary>
    Task<int> ExpireStalePendingOrdersAsync(CancellationToken cancellationToken);
}
