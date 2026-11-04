using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexora.Api.Checkout;
using Nexora.Api.Orders;
using Nexora.Application.Checkout;
using Nexora.Application.Orders;
using Nexora.Infrastructure.Persistence;
using Nexora.IntegrationTests.Support;

namespace Nexora.IntegrationTests.Checkout;

public sealed class CheckoutEndpointTests(NexoraApiFactory factory)
{
    private const string Password = "una-clave-larga-y-segura";

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    private async Task<ApiSession> NewCustomerAsync()
    {
        var session = factory.CreateSession();
        await session.RegisterAsync($"cliente-{Guid.NewGuid():N}@nexora.test", Password);
        return session;
    }

    private static CheckoutRequest CheckoutFor(Guid variantId, int quantity, string phone = "987654321") => new()
    {
        Items = [new CartItemRequest { VariantId = variantId, Quantity = quantity }],
        ShippingAddress = new ShippingAddressRequest
        {
            RecipientName = "Ana Pérez",
            Phone = phone,
            Department = "Arequipa",
            Province = "Arequipa",
            District = "Yanahuara",
            AddressLine = "Calle Misti 456",
        },
    };

    private static Task<HttpResponseMessage> PlaceOrderAsync(ApiSession session, CheckoutRequest request, Guid? idempotencyKey = null) =>
        session.PostAsync(
            "/api/v1/checkout",
            request,
            headers: new Dictionary<string, string> { [CheckoutController.IdempotencyKeyHeader] = (idempotencyKey ?? Guid.NewGuid()).ToString() });

    [Fact]
    public async Task QuoteUsesServerPricesAndDestinationShipping()
    {
        var variant = await factory.CreateVariantAsync(price: 100m, stock: 5);
        using var session = factory.CreateSession();

        var response = await session.PostAsync("/api/v1/cart/quote", new CartQuoteRequest
        {
            Items = [new CartItemRequest { VariantId = variant.Id, Quantity = 2 }],
            Department = "Arequipa",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var quote = await response.Content.ReadFromJsonAsync<CartQuoteResponse>(CancellationToken);
        Assert.NotNull(quote);
        Assert.Equal(200m, quote.Subtotal);
        Assert.Equal("provincias", quote.Shipping?.Code);
        Assert.Equal(25m, quote.Shipping?.Cost);
        Assert.Equal(225m, quote.Total);
        Assert.Equal(quote.Total, quote.Tax.TaxableAmount + quote.Tax.TaxAmount);
        Assert.True(quote.CanCheckout);
    }

    [Fact]
    public async Task QuoteFlagsMissingVariantsAndInsufficientStock()
    {
        var variant = await factory.CreateVariantAsync(price: 50m, stock: 1);
        var unknownVariantId = Guid.NewGuid();
        using var session = factory.CreateSession();

        var response = await session.PostAsync("/api/v1/cart/quote", new CartQuoteRequest
        {
            Items = [new CartItemRequest { VariantId = variant.Id, Quantity = 2 }, new CartItemRequest { VariantId = unknownVariantId, Quantity = 1 }],
        });
        var quote = await response.Content.ReadFromJsonAsync<CartQuoteResponse>(CancellationToken);

        Assert.NotNull(quote);
        var line = Assert.Single(quote.Lines);
        Assert.False(line.IsAvailable);
        Assert.Equal(1, line.MaxQuantity);
        Assert.Equal([unknownVariantId], quote.UnavailableVariantIds);
        Assert.Null(quote.Shipping);
        Assert.False(quote.CanCheckout);
    }

    [Fact]
    public async Task CheckoutRequiresSessionAndIdempotencyKey()
    {
        var variant = await factory.CreateVariantAsync(price: 50m, stock: 5);

        using var anonymous = factory.CreateSession();
        Assert.Equal(HttpStatusCode.Unauthorized, (await PlaceOrderAsync(anonymous, CheckoutFor(variant.Id, 1))).StatusCode);

        using var customer = await NewCustomerAsync();
        var withoutKey = await customer.PostAsync("/api/v1/checkout", CheckoutFor(variant.Id, 1));
        Assert.Equal(HttpStatusCode.BadRequest, withoutKey.StatusCode);
    }

    [Fact]
    public async Task InvalidAddressErrorsUseJsonFieldPaths()
    {
        var variant = await factory.CreateVariantAsync(price: 50m, stock: 5);
        using var customer = await NewCustomerAsync();

        var response = await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 1, phone: "12345"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(CancellationToken);
        Assert.Contains("shippingAddress.phone", problem!.Errors.Keys);
    }

    [Fact]
    public async Task CheckoutReservesStockAndApprovedPaymentTurnsItIntoASale()
    {
        var variant = await factory.CreateVariantAsync(price: 120m, stock: 5);
        using var customer = await NewCustomerAsync();

        var placed = await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 2));
        Assert.Equal(HttpStatusCode.Created, placed.StatusCode);
        var checkout = await placed.Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        Assert.NotNull(checkout);
        var orderNumber = checkout.Order.OrderNumber;
        Assert.Equal("PendingPayment", checkout.Order.Status);
        Assert.Equal(240m + 25m, checkout.Order.Total);
        Assert.Equal($"/checkout/pay/{orderNumber}", checkout.PaymentUrl);
        Assert.Equal((5, 2), await factory.GetInventoryAsync(variant.Id));

        var paid = await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });
        Assert.Equal(HttpStatusCode.OK, paid.StatusCode);
        var order = await paid.Content.ReadFromJsonAsync<OrderResponse>(CancellationToken);
        Assert.Equal("Paid", order!.Status);
        Assert.NotNull(order.PaidAt);
        Assert.Equal((3, 0), await factory.GetInventoryAsync(variant.Id));

        var history = await customer.Client.GetFromJsonAsync<List<OrderSummaryResponse>>(new Uri("/api/v1/orders", UriKind.Relative), CancellationToken);
        Assert.Contains(history!, summary => summary.OrderNumber == orderNumber && summary.Status == "Paid");

        var payAgain = await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = false });
        Assert.Equal(HttpStatusCode.Conflict, payAgain.StatusCode);
    }

    [Fact]
    public async Task RetryingWithTheSameIdempotencyKeyReturnsTheSameOrder()
    {
        var variant = await factory.CreateVariantAsync(price: 80m, stock: 5);
        using var customer = await NewCustomerAsync();
        var key = Guid.NewGuid();

        var first = await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 1), key);
        var retry = await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 1), key);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        var firstOrder = await first.Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        var retriedOrder = await retry.Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        Assert.Equal(firstOrder!.Order.OrderNumber, retriedOrder!.Order.OrderNumber);
        Assert.Equal((5, 1), await factory.GetInventoryAsync(variant.Id));
    }

    [Fact]
    public async Task RejectedPaymentReleasesTheReservation()
    {
        var variant = await factory.CreateVariantAsync(price: 60m, stock: 3);
        using var customer = await NewCustomerAsync();
        var checkout = await (await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 3))).Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);

        var rejected = await customer.PostAsync($"/api/v1/orders/{checkout!.Order.OrderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = false });

        var order = await rejected.Content.ReadFromJsonAsync<OrderResponse>(CancellationToken);
        Assert.Equal("PaymentFailed", order!.Status);
        Assert.Equal((3, 0), await factory.GetInventoryAsync(variant.Id));
    }

    [Fact]
    public async Task OrdersOfOtherCustomersAreNotFound()
    {
        var variant = await factory.CreateVariantAsync(price: 70m, stock: 2);
        using var owner = await NewCustomerAsync();
        var checkout = await (await PlaceOrderAsync(owner, CheckoutFor(variant.Id, 1))).Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        var orderNumber = checkout!.Order.OrderNumber;

        using var intruder = await NewCustomerAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.GetAsync($"/api/v1/orders/{orderNumber}")).StatusCode);
        var payForSomeoneElse = await intruder.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });
        Assert.Equal(HttpStatusCode.NotFound, payForSomeoneElse.StatusCode);
    }

    [Fact]
    public async Task ConcurrentCheckoutsCannotOversellTheLastUnit()
    {
        var variant = await factory.CreateVariantAsync(price: 999m, stock: 1);
        var customers = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => NewCustomerAsync()));

        try
        {
            var responses = await Task.WhenAll(customers.Select(customer => PlaceOrderAsync(customer, CheckoutFor(variant.Id, 1))));

            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
            Assert.Equal(4, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
            Assert.Equal((1, 1), await factory.GetInventoryAsync(variant.Id));
        }
        finally
        {
            foreach (var customer in customers)
            {
                customer.Dispose();
            }
        }
    }

    [Fact]
    public async Task ExpiredUnpaidOrdersAreCancelledAndReleaseStock()
    {
        var variant = await factory.CreateVariantAsync(price: 40m, stock: 4);
        using var customer = await NewCustomerAsync();
        var checkout = await (await PlaceOrderAsync(customer, CheckoutFor(variant.Id, 2))).Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        var orderNumber = checkout!.Order.OrderNumber;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexoraDbContext>();
            // Move the order before the 30-minute payment window.
            await db.Orders
                .Where(order => order.OrderNumber == orderNumber)
                .ExecuteUpdateAsync(setters => setters.SetProperty(order => order.CreatedAt, DateTimeOffset.UtcNow.AddHours(-1)), CancellationToken);

            var expired = await scope.ServiceProvider.GetRequiredService<ICheckoutService>().ExpireStalePendingOrdersAsync(CancellationToken);
            Assert.True(expired >= 1);
        }

        var order = await customer.Client.GetFromJsonAsync<OrderResponse>(new Uri($"/api/v1/orders/{orderNumber}", UriKind.Relative), CancellationToken);
        Assert.Equal("Cancelled", order!.Status);
        Assert.Equal((4, 0), await factory.GetInventoryAsync(variant.Id));

        var lateApproval = await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });
        Assert.Equal(HttpStatusCode.Conflict, lateApproval.StatusCode);
    }
}
