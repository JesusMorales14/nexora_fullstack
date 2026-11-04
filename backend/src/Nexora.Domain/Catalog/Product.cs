using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public sealed class Product
{
    public const int NameMaxLength = 200;
    public const int DescriptionMaxLength = 5_000;

    private readonly List<ProductVariant> _variants = [];
    private readonly List<ProductImage> _images = [];

    // Required by EF Core for materialization.
    private Product()
    {
        Name = null!;
        Slug = null!;
        Description = null!;
        Category = null!;
        Brand = null!;
    }

    public Product(string name, string slug, string description, Category category, Brand brand, DateTimeOffset createdAt)
    {
        ArgumentNullException.ThrowIfNull(category);
        ArgumentNullException.ThrowIfNull(brand);

        Id = Guid.CreateVersion7();
        Name = Guard.RequiredText(name, NameMaxLength, "Product name");
        Slug = Guard.Slug(slug);
        Description = Guard.RequiredText(description, DescriptionMaxLength, "Product description");
        Category = category;
        CategoryId = category.Id;
        Brand = brand;
        BrandId = brand.Id;
        CreatedAt = createdAt;
        UpdatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string Slug { get; private set; }

    public string Description { get; private set; }

    public Guid CategoryId { get; private set; }

    public Category Category { get; private set; }

    public Guid BrandId { get; private set; }

    public Brand Brand { get; private set; }

    /// <summary>Only published products are visible in the storefront.</summary>
    public bool IsPublished { get; private set; }

    public bool IsFeatured { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyList<ProductVariant> Variants => _variants;

    public IReadOnlyList<ProductImage> Images => _images;

    public ProductVariant AddVariant(
        string sku,
        string name,
        decimal price,
        decimal? compareAtPrice = null,
        int initialStock = 0,
        int lowStockThreshold = InventoryItem.DefaultLowStockThreshold)
    {
        var variant = new ProductVariant(Id, sku, name, price, compareAtPrice, initialStock, lowStockThreshold);

        if (_variants.Exists(existing => existing.Sku == variant.Sku))
        {
            throw new DomainException($"SKU '{variant.Sku}' already exists in this product.");
        }

        _variants.Add(variant);
        return variant;
    }

    public ProductImage AddImage(string url, string altText, int width, int height)
    {
        var image = new ProductImage(Id, url, altText, width, height, sortOrder: _images.Count);
        _images.Add(image);
        return image;
    }

    public void UpdateDetails(string name, string slug, string description, Category category, Brand brand, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(category);
        ArgumentNullException.ThrowIfNull(brand);

        Name = Guard.RequiredText(name, NameMaxLength, "Product name");
        Slug = Guard.Slug(slug);
        Description = Guard.RequiredText(description, DescriptionMaxLength, "Product description");
        Category = category;
        CategoryId = category.Id;
        Brand = brand;
        BrandId = brand.Id;
        UpdatedAt = now;
    }

    /// <summary>Hides the product from the storefront without deleting it (orders keep referencing it).</summary>
    public void Unpublish(DateTimeOffset now)
    {
        IsPublished = false;
        UpdatedAt = now;
    }

    public void RemoveImage(Guid imageId, DateTimeOffset now)
    {
        if (_images.RemoveAll(image => image.Id == imageId) == 0)
        {
            throw new DomainException("Image not found in this product.");
        }

        UpdatedAt = now;
    }

    public ProductVariant UpdateVariant(Guid variantId, string name, decimal price, decimal? compareAtPrice, DateTimeOffset now)
    {
        var variant = _variants.Find(candidate => candidate.Id == variantId)
            ?? throw new DomainException("Variant not found in this product.");

        variant.Rename(name);
        variant.SetPrice(price, compareAtPrice);
        UpdatedAt = now;
        return variant;
    }

    /// <summary>A product without purchasable variants cannot be shown in the store.</summary>
    public void Publish(DateTimeOffset now)
    {
        if (_variants.Count == 0)
        {
            throw new DomainException("A product needs at least one variant before it can be published.");
        }

        IsPublished = true;
        UpdatedAt = now;
    }

    public void SetFeatured(bool isFeatured, DateTimeOffset now)
    {
        IsFeatured = isFeatured;
        UpdatedAt = now;
    }
}
