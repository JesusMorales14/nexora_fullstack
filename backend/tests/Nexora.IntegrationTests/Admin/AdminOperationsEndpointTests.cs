using System.Net;
using System.Net.Http.Json;
using Nexora.Api.Checkout;
using Nexora.Api.Orders;
using Nexora.Application.Admin;
using Nexora.Application.Checkout;
using Nexora.Application.Common;
using Nexora.IntegrationTests.Support;

namespace Nexora.IntegrationTests.Admin;

public sealed class AdminOperationsEndpointTests(NexoraApiFactory factory)
{
    private const string Password = "una-clave-larga-y-segura";

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    private static string Unique() => Guid.NewGuid().ToString("N")[..10];

    private async Task<ApiSession> AdminSessionAsync()
    {
        var session = factory.CreateSession();
        await session.LoginAsync(NexoraApiFactory.AdminEmail, factory.AdminPassword);
        return session;
    }

    private async Task<(ApiSession Customer, string Email)> NewCustomerAsync(string fullName = "Cliente de Prueba")
    {
        var email = $"cliente-{Unique()}@nexora.test";
        var session = factory.CreateSession();
        await session.RegisterAsync(email, Password, fullName);
        return (session, email);
    }

    private static async Task<string> PlaceOrderAsync(ApiSession customer, Guid variantId, int quantity, bool pay)
    {
        var response = await customer.PostAsync(
            "/api/v1/checkout",
            new CheckoutRequest
            {
                Items = [new CartItemRequest { VariantId = variantId, Quantity = quantity }],
                ShippingAddress = new ShippingAddressRequest
                {
                    RecipientName = "Ana",
                    Phone = "987654321",
                    Department = "Cusco",
                    Province = "Cusco",
                    District = "Wanchaq",
                    AddressLine = "Av. El Sol 200",
                },
            },
            headers: new Dictionary<string, string> { [CheckoutController.IdempotencyKeyHeader] = Guid.NewGuid().ToString() });
        var checkout = await response.Content.ReadFromJsonAsync<CheckoutResponse>(CancellationToken);
        var orderNumber = checkout!.Order.OrderNumber;

        if (pay)
        {
            await customer.PostAsync($"/api/v1/orders/{orderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });
        }

        return orderNumber;
    }

    private static Task<HttpResponseMessage> ChangeStatusAsync(ApiSession admin, string orderNumber, string status) =>
        admin.PostAsync($"/api/v1/admin/orders/{orderNumber}/status", new OrderStatusChangeRequest { Status = status });

    [Fact]
    public async Task PaidOrdersMoveThroughShippingAndDeliveryInOrder()
    {
        var variant = await factory.CreateVariantAsync(price: 300m, stock: 5);
        var (customer, email) = await NewCustomerAsync();
        using var _ = customer;
        var orderNumber = await PlaceOrderAsync(customer, variant.Id, 1, pay: true);
        using var admin = await AdminSessionAsync();

        var details = await admin.Client.GetFromJsonAsync<AdminOrderDetails>(new Uri($"/api/v1/admin/orders/{orderNumber}", UriKind.Relative), CancellationToken);
        Assert.Equal(email, details!.CustomerEmail);
        Assert.Equal(["Shipped"], details.AllowedTransitions);

        Assert.Equal(HttpStatusCode.Conflict, (await ChangeStatusAsync(admin, orderNumber, "Delivered")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ChangeStatusAsync(admin, orderNumber, "Shipped")).StatusCode);
        var delivered = await (await ChangeStatusAsync(admin, orderNumber, "Delivered")).Content.ReadFromJsonAsync<AdminOrderDetails>(CancellationToken);
        Assert.Equal("Delivered", delivered!.Order.Status);
        Assert.Empty(delivered.AllowedTransitions);

        // The customer sees the new status on their own order.
        var customerView = await customer.GetAsync($"/api/v1/orders/{orderNumber}");
        Assert.Contains("Delivered", await customerView.Content.ReadAsStringAsync(CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CancellingAnUnpaidOrderReleasesItsStock()
    {
        var variant = await factory.CreateVariantAsync(price: 120m, stock: 4);
        var (customer, _) = await NewCustomerAsync();
        using var __ = customer;
        var orderNumber = await PlaceOrderAsync(customer, variant.Id, 3, pay: false);
        Assert.Equal((4, 3), await factory.GetInventoryAsync(variant.Id));
        using var admin = await AdminSessionAsync();

        var response = await ChangeStatusAsync(admin, orderNumber, "Cancelled");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal((4, 0), await factory.GetInventoryAsync(variant.Id));
    }

    [Fact]
    public async Task OrdersCanBeSearchedByCustomerEmail()
    {
        var variant = await factory.CreateVariantAsync(price: 80m, stock: 5);
        var (customer, email) = await NewCustomerAsync();
        using var _ = customer;
        var orderNumber = await PlaceOrderAsync(customer, variant.Id, 1, pay: true);
        using var admin = await AdminSessionAsync();

        var page = await admin.Client.GetFromJsonAsync<PagedResponse<AdminOrderListItem>>(
            new Uri($"/api/v1/admin/orders?q={Uri.EscapeDataString(email)}&status=Paid", UriKind.Relative), CancellationToken);

        var order = Assert.Single(page!.Items);
        Assert.Equal(orderNumber, order.OrderNumber);
    }

    [Fact]
    public async Task CustomersListShowsSpendingFromPaidOrdersOnly()
    {
        var variant = await factory.CreateVariantAsync(price: 250m, stock: 10);
        var (customer, email) = await NewCustomerAsync();
        using var _ = customer;
        await PlaceOrderAsync(customer, variant.Id, 2, pay: true);
        await PlaceOrderAsync(customer, variant.Id, 1, pay: false);
        using var admin = await AdminSessionAsync();

        var page = await admin.Client.GetFromJsonAsync<PagedResponse<AdminCustomerListItem>>(
            new Uri($"/api/v1/admin/customers?q={Uri.EscapeDataString(email)}", UriKind.Relative), CancellationToken);

        var row = Assert.Single(page!.Items);
        Assert.Equal(2, row.OrderCount);
        Assert.Equal(500m, row.TotalSpent); // 2 × 250, free shipping; the unpaid order does not count.
    }

    [Fact]
    public async Task OrdersCsvIsProtectedAgainstFormulaInjection()
    {
        var variant = await factory.CreateVariantAsync(price: 99m, stock: 5);
        var (customer, _) = await NewCustomerAsync(fullName: "=HYPERLINK(\"http://evil.example\",\"x\")");
        using var _ = customer;
        var orderNumber = await PlaceOrderAsync(customer, variant.Id, 1, pay: true);
        using var admin = await AdminSessionAsync();

        var response = await admin.GetAsync("/api/v1/admin/reports/orders.csv");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var csv = await response.Content.ReadAsStringAsync(CancellationToken);
        var line = Assert.Single(csv.Split("\r\n"), row => row.StartsWith(orderNumber, StringComparison.Ordinal));
        Assert.Contains("'=HYPERLINK", line, StringComparison.Ordinal);
        Assert.Contains("Cusco", line, StringComparison.Ordinal);
    }

    [Fact]
    public async Task InvalidReportRangesAreRejected()
    {
        using var admin = await AdminSessionAsync();

        var reversed = await admin.GetAsync("/api/v1/admin/reports/orders.csv?from=2026-10-10&to=2026-10-01");
        var tooLong = await admin.GetAsync("/api/v1/admin/reports/orders.csv?from=2024-01-01&to=2026-01-01");

        Assert.Equal(HttpStatusCode.BadRequest, reversed.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    [Fact]
    public async Task AdministratorsCanBeGrantedAndRevokedButNotSelfRevoked()
    {
        var (candidate, email) = await NewCustomerAsync();
        candidate.Dispose();
        using var admin = await AdminSessionAsync();

        var unknown = await admin.PostAsync("/api/v1/admin/administrators", new GrantAdministratorRequest { Email = $"nadie-{Unique()}@nexora.test" });
        Assert.Equal(HttpStatusCode.Conflict, unknown.StatusCode);

        var granted = await admin.PostAsync("/api/v1/admin/administrators", new GrantAdministratorRequest { Email = email });
        Assert.Equal(HttpStatusCode.OK, granted.StatusCode);
        var newAdmin = await granted.Content.ReadFromJsonAsync<AdministratorResponse>(CancellationToken);

        var admins = await admin.Client.GetFromJsonAsync<List<AdministratorResponse>>(new Uri("/api/v1/admin/administrators", UriKind.Relative), CancellationToken);
        var self = Assert.Single(admins!, entry => entry.IsCurrentUser);
        Assert.Contains(admins!, entry => entry.Email == email);

        await admin.RefreshCsrfTokenAsync();
        var selfRevoke = await admin.SendAsync<object?>(HttpMethod.Delete, $"/api/v1/admin/administrators/{self.Id}", null);
        Assert.Equal(HttpStatusCode.Conflict, selfRevoke.StatusCode);

        var revoke = await admin.SendAsync<object?>(HttpMethod.Delete, $"/api/v1/admin/administrators/{newAdmin!.Id}", null);
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);

        var audit = await admin.Client.GetFromJsonAsync<PagedResponse<AuditLogEntryResponse>>(
            new Uri("/api/v1/admin/audit-log?pageSize=50", UriKind.Relative), CancellationToken);
        Assert.Contains(audit!.Items, entry => entry.Action == "admin.granted" && entry.Summary.Contains(email, StringComparison.Ordinal));
        Assert.Contains(audit.Items, entry => entry.Action == "admin.revoked" && entry.Summary.Contains(email, StringComparison.Ordinal));
    }
}
