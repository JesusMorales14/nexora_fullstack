using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Nexora.Application.Admin;
using Nexora.Application.Common;
using Nexora.Domain.Catalog;
using Nexora.Infrastructure.Persistence;
using Npgsql;

namespace Nexora.Infrastructure.Admin;

internal sealed class AdminCatalogService(
    NexoraDbContext db,
    AuditTrail audit,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IAdminCatalogService
{
    private const string StaleVersionMessage = "Otro administrador modificó este producto. Recarga la página para ver los cambios.";
    private const string DuplicateSlugMessage = "Ya existe un producto con ese slug.";
    private const string DuplicateSkuMessage = "Ya existe una variante con ese SKU.";
    private const string MissingCategoryOrBrandMessage = "La categoría o la marca seleccionada no existe.";

    // ---------- Products ----------

    public async Task<PagedResponse<AdminProductListItem>> ListProductsAsync(AdminProductListRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (page, pageSize) = Paging.Normalize(request.Page, request.PageSize);
        var products = db.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = Paging.ContainsPattern(request.Q);
            products = products.Where(product =>
                EF.Functions.ILike(product.Name, pattern, Paging.LikeEscape)
                || EF.Functions.ILike(product.Slug, pattern, Paging.LikeEscape)
                || product.Variants.Any(variant => EF.Functions.ILike(variant.Sku, pattern, Paging.LikeEscape)));
        }

        if (request.CategoryId is { } categoryId)
        {
            products = products.Where(product => product.CategoryId == categoryId);
        }

        products = request.Status switch
        {
            "published" => products.Where(product => product.IsPublished),
            "draft" => products.Where(product => !product.IsPublished),
            _ => products,
        };

        var total = await products.CountAsync(cancellationToken);
        var items = await products
            .OrderByDescending(product => product.UpdatedAt)
            .ThenBy(product => product.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(product => new AdminProductListItem(
                product.Id,
                product.Name,
                product.Slug,
                product.Brand.Name,
                product.Category.Name,
                product.IsPublished,
                product.IsFeatured,
                product.Variants.Count,
                product.Variants.Min(variant => (decimal?)variant.Price),
                product.Variants.Sum(variant => variant.Inventory.OnHand - variant.Inventory.Reserved),
                product.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AdminProductListItem>(items, page, pageSize, total);
    }

    public Task<AdminProductDetails?> GetProductAsync(Guid productId, CancellationToken cancellationToken) =>
        db.Products
            .AsNoTracking()
            .Where(product => product.Id == productId)
            .Select(product => new AdminProductDetails(
                product.Id,
                product.Name,
                product.Slug,
                product.Description,
                product.CategoryId,
                product.BrandId,
                product.IsPublished,
                product.IsFeatured,
                EF.Property<uint>(product, ConcurrencyVersion.PropertyName),
                product.UpdatedAt,
                product.Variants
                    .OrderBy(variant => variant.Sku)
                    .Select(variant => new AdminVariantResponse(
                        variant.Id,
                        variant.Sku,
                        variant.Name,
                        variant.Price,
                        variant.CompareAtPrice,
                        variant.Inventory.OnHand,
                        variant.Inventory.Reserved,
                        variant.Inventory.OnHand - variant.Inventory.Reserved,
                        variant.Inventory.LowStockThreshold))
                    .ToList(),
                product.Images
                    .OrderBy(image => image.SortOrder)
                    .Select(image => new AdminImageResponse(image.Id, image.Url, image.AltText, image.Width, image.Height))
                    .ToList()))
            .AsSplitQuery()
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<CommandResult<AdminProductDetails>> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var category = await db.Categories.FindAsync([request.CategoryId], cancellationToken);
        var brand = await db.Brands.FindAsync([request.BrandId], cancellationToken);
        if (category is null || brand is null)
        {
            return CommandResult.Conflict<AdminProductDetails>(MissingCategoryOrBrandMessage);
        }

        if (await db.Products.AnyAsync(product => product.Slug == request.Slug, cancellationToken))
        {
            return CommandResult.Conflict<AdminProductDetails>(DuplicateSlugMessage);
        }

        if (await IsSkuTakenAsync(request.Variant.Sku, cancellationToken))
        {
            return CommandResult.Conflict<AdminProductDetails>(DuplicateSkuMessage);
        }

        var now = timeProvider.GetUtcNow();
        var product = new Product(request.Name, request.Slug, request.Description, category, brand, now);
        var variant = AddVariantWithInitialStock(product, request.Variant, now);

        if (request.Image is { } image)
        {
            product.AddImage(image.Url, image.AltText, image.Width, image.Height);
        }

        product.SetFeatured(request.IsFeatured, now);
        if (request.IsPublished)
        {
            product.Publish(now);
        }

        db.Products.Add(product);
        audit.Record("product.created", "Product", product.Id, $"Creó \"{product.Name}\" con la variante {variant.Sku}.");

        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminProductDetails>> UpdateProductAsync(Guid productId, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var product = await db.Products
            .Include(candidate => candidate.Variants)
            .SingleOrDefaultAsync(candidate => candidate.Id == productId, cancellationToken);
        if (product is null)
        {
            return CommandResult.NotFound<AdminProductDetails>();
        }

        // The version the admin saw: if the row changed since, SaveChanges throws a concurrency error.
        db.Entry(product).Property<uint>(ConcurrencyVersion.PropertyName).OriginalValue = request.Version;

        var category = await db.Categories.FindAsync([request.CategoryId], cancellationToken);
        var brand = await db.Brands.FindAsync([request.BrandId], cancellationToken);
        if (category is null || brand is null)
        {
            return CommandResult.Conflict<AdminProductDetails>(MissingCategoryOrBrandMessage);
        }

        if (await db.Products.AnyAsync(other => other.Slug == request.Slug && other.Id != productId, cancellationToken))
        {
            return CommandResult.Conflict<AdminProductDetails>(DuplicateSlugMessage);
        }

        var now = timeProvider.GetUtcNow();
        var wasPublished = product.IsPublished;
        product.UpdateDetails(request.Name, request.Slug, request.Description, category, brand, now);
        product.SetFeatured(request.IsFeatured, now);

        if (request.IsPublished && !wasPublished)
        {
            product.Publish(now);
        }
        else if (!request.IsPublished && wasPublished)
        {
            product.Unpublish(now);
        }

        var visibility = wasPublished == request.IsPublished ? string.Empty : request.IsPublished ? " Lo publicó." : " Lo ocultó de la tienda.";
        audit.Record("product.updated", "Product", product.Id, $"Editó \"{product.Name}\".{visibility}");

        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminProductDetails>> AddVariantAsync(Guid productId, ProductVariantInput request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var product = await db.Products.Include(candidate => candidate.Variants)
            .SingleOrDefaultAsync(candidate => candidate.Id == productId, cancellationToken);
        if (product is null)
        {
            return CommandResult.NotFound<AdminProductDetails>();
        }

        if (await IsSkuTakenAsync(request.Sku, cancellationToken))
        {
            return CommandResult.Conflict<AdminProductDetails>(DuplicateSkuMessage);
        }

        var variant = AddVariantWithInitialStock(product, request, timeProvider.GetUtcNow());
        audit.Record("variant.created", "Product", product.Id, $"Agregó la variante {variant.Sku} a \"{product.Name}\" a {Money(variant.Price)}.");

        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminProductDetails>> UpdateVariantAsync(
        Guid productId,
        Guid variantId,
        UpdateVariantRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var product = await db.Products
            .Include(candidate => candidate.Variants).ThenInclude(variant => variant.Inventory)
            .SingleOrDefaultAsync(candidate => candidate.Id == productId, cancellationToken);
        var existing = product?.Variants.FirstOrDefault(variant => variant.Id == variantId);
        if (product is null || existing is null)
        {
            return CommandResult.NotFound<AdminProductDetails>();
        }

        var previousPrice = existing.Price;
        var variant = product.UpdateVariant(variantId, request.Name, request.Price, request.CompareAtPrice, timeProvider.GetUtcNow());
        variant.Inventory.SetLowStockThreshold(request.LowStockThreshold);

        var priceChange = previousPrice == variant.Price ? string.Empty : $" Precio: {Money(previousPrice)} → {Money(variant.Price)}.";
        audit.Record("variant.updated", "Product", product.Id, $"Editó la variante {variant.Sku} de \"{product.Name}\".{priceChange}");

        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminProductDetails>> AddImageAsync(Guid productId, ProductImageInput request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var product = await db.Products.Include(candidate => candidate.Images)
            .SingleOrDefaultAsync(candidate => candidate.Id == productId, cancellationToken);
        if (product is null)
        {
            return CommandResult.NotFound<AdminProductDetails>();
        }

        product.AddImage(request.Url, request.AltText, request.Width, request.Height);
        audit.Record("image.added", "Product", product.Id, $"Agregó una imagen a \"{product.Name}\".");
        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminProductDetails>> RemoveImageAsync(Guid productId, Guid imageId, CancellationToken cancellationToken)
    {
        var product = await db.Products.Include(candidate => candidate.Images)
            .SingleOrDefaultAsync(candidate => candidate.Id == productId, cancellationToken);
        if (product is null || product.Images.All(image => image.Id != imageId))
        {
            return CommandResult.NotFound<AdminProductDetails>();
        }

        product.RemoveImage(imageId, timeProvider.GetUtcNow());
        audit.Record("image.removed", "Product", product.Id, $"Quitó una imagen de \"{product.Name}\".");
        return await SaveAndReturnAsync(product.Id, cancellationToken);
    }

    // ---------- Categories ----------

    public async Task<IReadOnlyList<AdminCategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken) =>
        await db.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .Select(category => new AdminCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.ParentId,
                db.Products.Count(product => product.CategoryId == category.Id)))
            .ToListAsync(cancellationToken);

    public async Task<CommandResult<AdminCategoryResponse>> CreateCategoryAsync(CategoryRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (parent, parentError) = await ResolveParentAsync(request.ParentId, categoryId: null, cancellationToken);
        if (parentError is not null)
        {
            return CommandResult.Conflict<AdminCategoryResponse>(parentError);
        }

        if (await db.Categories.AnyAsync(category => category.Slug == request.Slug, cancellationToken))
        {
            return CommandResult.Conflict<AdminCategoryResponse>("Ya existe una categoría con ese slug.");
        }

        var created = new Category(request.Name, request.Slug, parent);
        db.Categories.Add(created);
        audit.Record("category.created", "Category", created.Id, $"Creó la categoría \"{created.Name}\".");

        return await SaveCategoryAsync(created.Id, cancellationToken);
    }

    public async Task<CommandResult<AdminCategoryResponse>> UpdateCategoryAsync(Guid categoryId, CategoryRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var category = await db.Categories.FindAsync([categoryId], cancellationToken);
        if (category is null)
        {
            return CommandResult.NotFound<AdminCategoryResponse>();
        }

        var (parent, parentError) = await ResolveParentAsync(request.ParentId, categoryId, cancellationToken);
        if (parentError is not null)
        {
            return CommandResult.Conflict<AdminCategoryResponse>(parentError);
        }

        var hasChildren = await db.Categories.AnyAsync(child => child.ParentId == categoryId, cancellationToken);
        if (parent is not null && hasChildren)
        {
            return CommandResult.Conflict<AdminCategoryResponse>("Una categoría con subcategorías no puede ser subcategoría.");
        }

        if (await db.Categories.AnyAsync(other => other.Slug == request.Slug && other.Id != categoryId, cancellationToken))
        {
            return CommandResult.Conflict<AdminCategoryResponse>("Ya existe una categoría con ese slug.");
        }

        category.Update(request.Name, request.Slug, parent, hasChildren);
        audit.Record("category.updated", "Category", category.Id, $"Editó la categoría \"{category.Name}\".");

        return await SaveCategoryAsync(category.Id, cancellationToken);
    }

    public async Task<CommandResult<bool>> DeleteCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FindAsync([categoryId], cancellationToken);
        if (category is null)
        {
            return CommandResult.NotFound<bool>();
        }

        var isInUse = await db.Products.AnyAsync(product => product.CategoryId == categoryId, cancellationToken)
            || await db.Categories.AnyAsync(child => child.ParentId == categoryId, cancellationToken);
        if (isInUse)
        {
            return CommandResult.Conflict<bool>("La categoría tiene productos o subcategorías. Muévelos antes de eliminarla.");
        }

        db.Categories.Remove(category);
        audit.Record("category.deleted", "Category", category.Id, $"Eliminó la categoría \"{category.Name}\".");
        await db.SaveChangesAsync(cancellationToken);
        return CommandResult.Ok(true);
    }

    // ---------- Brands ----------

    public async Task<IReadOnlyList<AdminBrandResponse>> ListBrandsAsync(CancellationToken cancellationToken) =>
        await db.Brands
            .AsNoTracking()
            .OrderBy(brand => brand.Name)
            .Select(brand => new AdminBrandResponse(brand.Id, brand.Name, brand.Slug, db.Products.Count(product => product.BrandId == brand.Id)))
            .ToListAsync(cancellationToken);

    public async Task<CommandResult<AdminBrandResponse>> CreateBrandAsync(BrandRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (await db.Brands.AnyAsync(brand => brand.Slug == request.Slug, cancellationToken))
        {
            return CommandResult.Conflict<AdminBrandResponse>("Ya existe una marca con ese slug.");
        }

        var brand = new Brand(request.Name, request.Slug);
        db.Brands.Add(brand);
        audit.Record("brand.created", "Brand", brand.Id, $"Creó la marca \"{brand.Name}\".");

        if (await TrySaveAsync(cancellationToken) is { } error)
        {
            return CommandResult.Conflict<AdminBrandResponse>(error);
        }

        return CommandResult.Ok(new AdminBrandResponse(brand.Id, brand.Name, brand.Slug, 0));
    }

    // ---------- Helpers ----------

    private ProductVariant AddVariantWithInitialStock(Product product, ProductVariantInput input, DateTimeOffset now)
    {
        var variant = product.AddVariant(input.Sku, input.Name, input.Price, input.CompareAtPrice, input.InitialStock, input.LowStockThreshold);

        if (input.InitialStock > 0)
        {
            db.InventoryMovements.Add(new InventoryMovement(
                variant.Id, input.InitialStock, InventoryMovementReason.Restock, "Stock inicial", currentUser.UserId, reference: null, now));
        }

        return variant;
    }

    private Task<bool> IsSkuTakenAsync(string sku, CancellationToken cancellationToken)
    {
        var normalized = sku.Trim().ToUpperInvariant();
        return db.ProductVariants.AnyAsync(variant => variant.Sku == normalized, cancellationToken);
    }

    private async Task<(Category? Parent, string? Error)> ResolveParentAsync(Guid? parentId, Guid? categoryId, CancellationToken cancellationToken)
    {
        if (parentId is null)
        {
            return (null, null);
        }

        if (parentId == categoryId)
        {
            return (null, "Una categoría no puede ser su propia categoría padre.");
        }

        var parent = await db.Categories.FindAsync([parentId.Value], cancellationToken);
        return parent switch
        {
            null => (null, "La categoría padre no existe."),
            { ParentId: not null } => (null, "Solo se permiten dos niveles: elige una categoría principal como padre."),
            _ => (parent, null),
        };
    }

    private async Task<CommandResult<AdminProductDetails>> SaveAndReturnAsync(Guid productId, CancellationToken cancellationToken)
    {
        if (await TrySaveAsync(cancellationToken) is { } error)
        {
            return CommandResult.Conflict<AdminProductDetails>(error);
        }

        var details = await GetProductAsync(productId, cancellationToken);
        return details is null ? CommandResult.NotFound<AdminProductDetails>() : CommandResult.Ok(details);
    }

    private async Task<CommandResult<AdminCategoryResponse>> SaveCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        if (await TrySaveAsync(cancellationToken) is { } error)
        {
            return CommandResult.Conflict<AdminCategoryResponse>(error);
        }

        var categories = await ListCategoriesAsync(cancellationToken);
        return CommandResult.Ok(categories.Single(category => category.Id == categoryId));
    }

    /// <summary>Returns a user-facing message for expected conflicts; unexpected errors propagate.</summary>
    private async Task<string?> TrySaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return StaleVersionMessage;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // A concurrent request created the same slug/SKU between our check and the insert.
            return "Ya existe un registro con ese slug o SKU.";
        }
    }

    private static string Money(decimal amount) => "S/ " + amount.ToString("N2", CultureInfo.InvariantCulture);
}
