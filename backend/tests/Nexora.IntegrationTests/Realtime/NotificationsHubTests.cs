using System.Net.Http.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Nexora.Api.Checkout;
using Nexora.Api.Orders;
using Nexora.Application.Admin;
using Nexora.Application.Checkout;
using Nexora.Application.Realtime;
using Nexora.IntegrationTests.Support;

namespace Nexora.IntegrationTests.Realtime;

public sealed class NotificationsHubTests(NexoraApiFactory factory)
{
    private static readonly TimeSpan EventTimeout = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan SilenceWindow = TimeSpan.FromSeconds(2);

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    private async Task<ApiSession> AdminSessionAsync()
    {
        var session = factory.CreateSession();
        await session.LoginAsync(NexoraApiFactory.AdminEmail, factory.AdminPassword);
        return session;
    }

    private async Task<ApiSession> CustomerSessionAsync()
    {
        var session = factory.CreateSession();
        await session.RegisterAsync($"cliente-{Guid.NewGuid():N}@nexora.test", "una-clave-larga-y-segura");
        return session;
    }

    private static async Task<string> PlaceOrderAsync(ApiSession customer, Guid variantId, bool pay)
    {
        var response = await customer.PostAsync(
            "/api/v1/checkout",
            new CheckoutRequest
            {
                Items = [new CartItemRequest { VariantId = variantId, Quantity = 1 }],
                ShippingAddress = new ShippingAddressRequest
                {
                    RecipientName = "Ana",
                    Phone = "987654321",
                    Department = "Lima",
                    Province = "Lima",
                    District = "Lince",
                    AddressLine = "Av. Arequipa 1000",
                },
            },
            headers: new Dictionary<string, string> { [CheckoutController.IdempotencyKeyHeader] = Guid.NewGuid().ToString() });
        var orderNumber = (await response.Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken))!.Order.OrderNumber;

        if (pay)
        {
            await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });
        }

        return orderNumber;
    }

    /// <summary>Completes with the first event matching the predicate (events from other tests are ignored).</summary>
    private static TaskCompletionSource<T> Expect<T>(HubConnection connection, string eventName, Func<T, bool> matches)
    {
        var received = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<T>(eventName, payload =>
        {
            if (matches(payload))
            {
                received.TrySetResult(payload);
            }
        });
        return received;
    }

    [Fact]
    public async Task AnonymousConnectionsAreRejected()
    {
        using var anonymous = factory.CreateSession();
        await using var connection = factory.CreateHubConnection(anonymous);

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() => connection.StartAsync(CancellationToken));
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, exception.StatusCode);
    }

    [Fact]
    public async Task AdminsAreNotifiedOfPaidOrdersAndLowStock()
    {
        // 3 units with the default threshold of 5: any sale leaves the variant "low".
        var variant = await factory.CreateVariantAsync(price: 75m, stock: 3);
        using var admin = await AdminSessionAsync();
        await using var adminConnection = factory.CreateHubConnection(admin);
        var orderPaid = new TaskCompletionSource<OrderPaidEvent>(TaskCreationOptions.RunContinuationsAsynchronously);
        string? expectedOrderNumber = null;
        adminConnection.On<OrderPaidEvent>("OrderPaid", payload =>
        {
            if (payload.OrderNumber == Volatile.Read(ref expectedOrderNumber))
            {
                orderPaid.TrySetResult(payload);
            }
        });
        var stockLow = Expect<StockLowEvent>(adminConnection, "StockLow", payload => payload.VariantId == variant.Id);
        await adminConnection.StartAsync(CancellationToken);

        using var customer = await CustomerSessionAsync();
        var orderNumber = await PlaceOrderAsync(customer, variant.Id, pay: false);
        Volatile.Write(ref expectedOrderNumber, orderNumber);
        await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });

        var paid = await orderPaid.Task.WaitAsync(EventTimeout, CancellationToken);
        Assert.Equal(75m + 15m, paid.Total); // price + Lima shipping
        var low = await stockLow.Task.WaitAsync(EventTimeout, CancellationToken);
        Assert.Equal(2, low.Available);
        Assert.Equal(variant.Sku, low.Sku);
    }

    [Fact]
    public async Task CustomersAreNotifiedOnlyAboutTheirOwnOrders()
    {
        var variant = await factory.CreateVariantAsync(price: 60m, stock: 10);
        using var owner = await CustomerSessionAsync();
        var orderNumber = await PlaceOrderAsync(owner, variant.Id, pay: true);

        await using var ownerConnection = factory.CreateHubConnection(owner);
        var ownerUpdate = Expect<OrderStatusChangedEvent>(ownerConnection, "OrderStatusChanged", payload => payload.OrderNumber == orderNumber);
        // Customers are never in the admins group.
        var ownerSawAdminEvent = Expect<OrderPaidEvent>(ownerConnection, "OrderPaid", _ => true);
        await ownerConnection.StartAsync(CancellationToken);

        using var stranger = await CustomerSessionAsync();
        await using var strangerConnection = factory.CreateHubConnection(stranger);
        var strangerUpdate = Expect<OrderStatusChangedEvent>(strangerConnection, "OrderStatusChanged", payload => payload.OrderNumber == orderNumber);
        await strangerConnection.StartAsync(CancellationToken);

        using var admin = await AdminSessionAsync();
        await admin.PostAsync($"/api/v1/admin/orders/{orderNumber}/status", new OrderStatusChangeRequest { Status = "Shipped" });

        var update = await ownerUpdate.Task.WaitAsync(EventTimeout, CancellationToken);
        Assert.Equal("Shipped", update.Status);

        await Task.Delay(SilenceWindow, CancellationToken);
        Assert.False(strangerUpdate.Task.IsCompleted);
        Assert.False(ownerSawAdminEvent.Task.IsCompleted);
    }
}
