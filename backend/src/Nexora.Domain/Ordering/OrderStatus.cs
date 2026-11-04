namespace Nexora.Domain.Ordering;

public enum OrderStatus
{
    /// <summary>Created; stock is reserved until the payment is confirmed or the order expires.</summary>
    PendingPayment = 0,

    Paid = 1,

    /// <summary>The payment provider rejected the payment; the reservation was released.</summary>
    PaymentFailed = 2,

    /// <summary>Cancelled or expired before payment; the reservation was released.</summary>
    Cancelled = 3,

    Shipped = 4,

    Delivered = 5,
}
