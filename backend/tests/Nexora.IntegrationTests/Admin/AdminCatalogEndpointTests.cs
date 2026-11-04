using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Checkout;
using Nexora.Api.Orders;
using Nexora.Application.Admin;
using Nexora.Application.Checkout;
using Nexora.Application.Common;
using Nexora.Domain.Catalog;
using Nexora.IntegrationTests.Support;

namespace Nexora.IntegrationTests.Admin;

public sealed class AdminCatalogEndpointTests(NexoraApiFactory factory)
{
    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    private async Task<ApiSession> AdminSessionAsync()
    {
        var session = factory.CreateSession();
        await session.LoginAsync(NexoraApiFactory.AdminEmail, factory.AdminPassword);
        return session;
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..10];

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        var value = await response.Content.ReadFromJsonAsync<T>(CancellationToken);
        Assert.NotNull(value);
        return value;
    }

    private static async Task<(Guid CategoryId, Guid BrandId)> CreateCategoryAndBrandAsync(ApiSession admin)
    {
        var suffix = Unique();
        var category = await ReadAsync<AdminCategoryResponse>(await admin.PostAsync(
            "/api/v1/admin/categories", new CategoryRequest { Name = $"Tablets {suffix}", Slug = $"tablets-{suffix}" }));
        var brand = await ReadAsync<AdminBrandResponse>(await admin.PostAsync(
            "/api/v1/admin/brands", new BrandRequest { Name = $"Marca {suffix}", Slug = $"marca-{suffix}" }));
        return (category.Id, brand.Id);
    }

    private static CreateProductRequest NewProduct(Guid categoryId, Guid brandId, string suffix, bool isPublished = false) => new()
    {
        Name = $"Tablet {suffix}",
        Slug = $"tablet-{suffix}",
        Description = "Tablet de prueba creada desde el panel.",
        CategoryId = categoryId,
        BrandId = brandId,
        IsPublished = isPublished,
        Variant = new ProductVariantInput { Sku = $"TAB-{suffix}", Name = "64 GB", Price = 899m, InitialStock = 4 },
        Image = new ProductImageInput { Url = "/images/products/phone.svg", AltText = "Tablet", Width = 800, Height = 800 },
    };

    private static UpdateProductRequest ToUpdate(AdminProductDetails product, bool isPublished) => new()
    {
        Name = product.Name,
        Slug = product.Slug,
        Description = product.Description,
        CategoryId = product.CategoryId,
        BrandId = product.BrandId,
        IsPublished = isPublished,
        IsFeatured = product.IsFeatured,
        Version = product.Version,
    };

    [Fact]
    public async Task CustomersCannotUseAdminEndpoints()
    {
        using var customer = factory.CreateSession();
        await customer.RegisterAsync($"cliente-{Unique()}@nexora.test", "una-clave-larga-y-segura");

        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/admin/products")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await customer.PostAsync("/api/v1/admin/brands", new BrandRequest { Name = "X", Slug = "x" })).StatusCode);
    }

    [Fact]
    public async Task DraftProductIsHiddenUntilPublishedAndEveryChangeIsAudited()
    {
        using var admin = await AdminSessionAsync();
        var (categoryId, brandId) = await CreateCategoryAndBrandAsync(admin);
        var suffix = Unique();

        var created = await admin.PostAsync("/api/v1/admin/products", NewProduct(categoryId, brandId, suffix));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var product = await ReadAsync<AdminProductDetails>(created);
        Assert.False(product.IsPublished);
        Assert.Equal(4, Assert.Single(product.Variants).OnHand);

        using var visitor = factory.CreateSession();
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/v1/products/{product.Slug}")).StatusCode);

        var published = await admin.Client.PutAsJsonAsync(
            new Uri($"/api/v1/admin/products/{product.Id}", UriKind.Relative), ToUpdate(product, isPublished: true), CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, published.StatusCode); // PUT without the CSRF header is rejected.

        var updated = await PutAsync(admin, $"/api/v1/admin/products/{product.Id}", ToUpdate(product, isPublished: true));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await visitor.GetAsync($"/api/v1/products/{product.Slug}")).StatusCode);

        var audit = await admin.Client.GetFromJsonAsync<PagedResponse<AuditLogEntryResponse>>(
            new Uri("/api/v1/admin/audit-log?pageSize=100", UriKind.Relative), CancellationToken);
        var productEntries = audit!.Items.Where(entry => entry.EntityId == product.Id.ToString()).ToList();
        Assert.Contains(productEntries, entry => entry.Action == "product.created" && entry.ActorEmail == NexoraApiFactory.AdminEmail);
        Assert.Contains(productEntries, entry => entry.Action == "product.updated" && entry.Summary.Contains("Lo publicó", StringComparison.Ordinal));
    }

    [Fact]
    public async Task StaleVersionsAndDuplicatesAreConflicts()
    {
        using var admin = await AdminSessionAsync();
        var (categoryId, brandId) = await CreateCategoryAndBrandAsync(admin);
        var suffix = Unique();
        var product = await ReadAsync<AdminProductDetails>(await admin.PostAsync("/api/v1/admin/products", NewProduct(categoryId, brandId, suffix)));

        var firstSave = await PutAsync(admin, $"/api/v1/admin/products/{product.Id}", ToUpdate(product, isPublished: true));
        Assert.Equal(HttpStatusCode.OK, firstSave.StatusCode);

        // A second admin still holding the old version must not overwrite the first one's changes.
        var staleSave = await PutAsync(admin, $"/api/v1/admin/products/{product.Id}", ToUpdate(product, isPublished: false));
        Assert.Equal(HttpStatusCode.Conflict, staleSave.StatusCode);

        var duplicate = await admin.PostAsync("/api/v1/admin/products", NewProduct(categoryId, brandId, suffix));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task InvalidProductsReturnFieldErrors()
    {
        using var admin = await AdminSessionAsync();
        var (categoryId, brandId) = await CreateCategoryAndBrandAsync(admin);
        var request = NewProduct(categoryId, brandId, Unique());
        var invalid = new CreateProductRequest
        {
            Name = request.Name,
            Slug = "Slug Inválido",
            Description = request.Description,
            CategoryId = categoryId,
            BrandId = brandId,
            Variant = new ProductVariantInput { Sku = "TAB-X", Name = "64 GB", Price = 100m, CompareAtPrice = 90m },
        };

        var response = await admin.PostAsync("/api/v1/admin/products", invalid);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadAsync<ValidationProblemDetails>(response);
        Assert.Contains("slug", problem.Errors.Keys);
        Assert.Contains("variant.compareAtPrice", problem.Errors.Keys);
    }

    [Fact]
    public async Task InventoryAdjustmentsRespectReservationsAndAreLedgered()
    {
        using var admin = await AdminSessionAsync();
        var variant = await factory.CreateVariantAsync(price: 50m, stock: 3);

        // A customer reserves 2 units with a pending order, then pays for it.
        using var customer = factory.CreateSession();
        await customer.RegisterAsync($"cliente-{Unique()}@nexora.test", "una-clave-larga-y-segura");
        var checkout = await ReadAsync<CheckoutResponse>(await customer.PostAsync(
            "/api/v1/checkout",
            new CheckoutRequest
            {
                Items = [new CartItemRequest { VariantId = variant.Id, Quantity = 2 }],
                ShippingAddress = new ShippingAddressRequest
                {
                    RecipientName = "Ana",
                    Phone = "987654321",
                    Department = "Lima",
                    Province = "Lima",
                    District = "Surco",
                    AddressLine = "Av. Primavera 100",
                },
            },
            headers: new Dictionary<string, string> { [CheckoutController.IdempotencyKeyHeader] = Guid.NewGuid().ToString() }));

        var belowReserved = await admin.PostAsync(
            $"/api/v1/admin/inventory/{variant.Id}/adjustments",
            new InventoryAdjustmentRequest { QuantityChange = -2, Reason = InventoryMovementReason.Damage, Note = "Caja dañada" });
        Assert.Equal(HttpStatusCode.Conflict, belowReserved.StatusCode);

        var restock = await admin.PostAsync(
            $"/api/v1/admin/inventory/{variant.Id}/adjustments",
            new InventoryAdjustmentRequest { QuantityChange = 10, Reason = InventoryMovementReason.Restock });
        var item = await ReadAsync<InventoryItemResponse>(restock);
        Assert.Equal((13, 2, 11), (item.OnHand, item.Reserved, item.Available));

        await customer.PostAsync($"/api/v1/orders/{checkout.Order.OrderNumber}/simulated-payment", new SimulatedPaymentRequest { Approved = true });

        var movements = await admin.Client.GetFromJsonAsync<List<InventoryMovementResponse>>(
            new Uri($"/api/v1/admin/inventory/{variant.Id}/movements", UriKind.Relative), CancellationToken);
        Assert.Contains(movements!, movement => movement is { Reason: "Restock", QuantityChange: 10 });
        Assert.Contains(movements!, movement => movement.Reason == "Sale" && movement.QuantityChange == -2 && movement.Reference == checkout.Order.OrderNumber);
        Assert.Equal((11, 0), await factory.GetInventoryAsync(variant.Id));
    }

    [Fact]
    public async Task ManualSaleAdjustmentsAreNotAllowed()
    {
        using var admin = await AdminSessionAsync();
        var variant = await factory.CreateVariantAsync(price: 50m, stock: 3);

        var response = await admin.PostAsync(
            $"/api/v1/admin/inventory/{variant.Id}/adjustments",
            new InventoryAdjustmentRequest { QuantityChange = -1, Reason = InventoryMovementReason.Sale });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CategoryHierarchyAndDeletionRules()
    {
        using var admin = await AdminSessionAsync();
        var suffix = Unique();
        var parent = await ReadAsync<AdminCategoryResponse>(await admin.PostAsync(
            "/api/v1/admin/categories", new CategoryRequest { Name = $"Gaming {suffix}", Slug = $"gaming-{suffix}" }));
        var child = await ReadAsync<AdminCategoryResponse>(await admin.PostAsync(
            "/api/v1/admin/categories", new CategoryRequest { Name = $"Sillas {suffix}", Slug = $"sillas-{suffix}", ParentId = parent.Id }));
        Assert.Equal(parent.Id, child.ParentId);

        var thirdLevel = await admin.PostAsync(
            "/api/v1/admin/categories", new CategoryRequest { Name = "Nivel 3", Slug = $"nivel-3-{suffix}", ParentId = child.Id });
        Assert.Equal(HttpStatusCode.Conflict, thirdLevel.StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await DeleteAsync(admin, $"/api/v1/admin/categories/{parent.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(admin, $"/api/v1/admin/categories/{child.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(admin, $"/api/v1/admin/categories/{parent.Id}")).StatusCode);
    }

    private static async Task<HttpResponseMessage> PutAsync<T>(ApiSession session, string path, T body)
    {
        await session.RefreshCsrfTokenAsync();
        return await session.SendAsync(HttpMethod.Put, path, body);
    }

    private static async Task<HttpResponseMessage> DeleteAsync(ApiSession session, string path)
    {
        await session.RefreshCsrfTokenAsync();
        return await session.SendAsync<object?>(HttpMethod.Delete, path, null);
    }
}
