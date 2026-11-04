using Nexora.Application.Common;
using Nexora.Application.Orders;
using Nexora.Domain.Ordering;

namespace Nexora.Infrastructure.Ordering;

internal static class OrderMapping
{
    public static OrderResponse ToResponse(Order order) =>
        new(
            order.OrderNumber,
            order.Status.ToString(),
            order.CreatedAt,
            order.PaidAt,
            [.. order.Items.Select(item => new OrderItemResponse(
                item.VariantId, item.ProductSlug, item.ProductName, item.VariantName, item.Sku, item.UnitPrice, item.Quantity, item.LineTotal))],
            new OrderAddressResponse(
                order.ShippingAddress.RecipientName,
                order.ShippingAddress.Phone,
                order.ShippingAddress.Department,
                order.ShippingAddress.Province,
                order.ShippingAddress.District,
                order.ShippingAddress.AddressLine,
                order.ShippingAddress.Reference),
            order.ShippingMethodLabel,
            order.ShippingCost,
            order.Subtotal,
            order.Total,
            order.TaxRate,
            order.TaxableAmount,
            order.TaxAmount,
            StoreCurrency.Code);
}
