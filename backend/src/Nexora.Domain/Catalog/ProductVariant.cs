using System.Text.RegularExpressions;
using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public sealed partial class ProductVariant
{
    public const int SkuMaxLength = 40;
    public const int NameMaxLength = 120;

    // Required by EF Core for materialization.
    private ProductVariant()
    {
        Sku = null!;
        Name = null!;
        Inventory = null!;
    }

    internal ProductVariant(
        Guid productId,
        string sku,
        string name,
        decimal price,
        decimal? compareAtPrice,
        int initialStock,
        int lowStockThreshold)
    {
        Id = Guid.CreateVersion7();
        ProductId = productId;
        Sku = NormalizeSku(sku);
        Name = Guard.RequiredText(name, NameMaxLength, "Variant name");
        SetPrice(price, compareAtPrice);
        Inventory = new InventoryItem(Id, initialStock, lowStockThreshold);
    }

    public Guid Id { get; private set; }

    public Guid ProductId { get; private set; }

    public string Sku { get; private set; }

    public string Name { get; private set; }

    /// <summary>Final consumer price in PEN, IGV included.</summary>
    public decimal Price { get; private set; }

    /// <summary>Optional "before" price shown crossed out; must be higher than <see cref="Price"/>.</summary>
    public decimal? CompareAtPrice { get; private set; }

    public InventoryItem Inventory { get; private set; }

    public void Rename(string name) => Name = Guard.RequiredText(name, NameMaxLength, "Variant name");

    public void SetPrice(decimal price, decimal? compareAtPrice)
    {
        Price = Catalog.Price.EnsureValid(price, "Price");

        if (compareAtPrice is { } compareAt)
        {
            Catalog.Price.EnsureValid(compareAt, "Compare-at price");

            if (compareAt <= price)
            {
                throw new DomainException("Compare-at price must be greater than the price.");
            }
        }

        CompareAtPrice = compareAtPrice;
    }

    private static string NormalizeSku(string sku)
    {
        var normalized = Guard.RequiredText(sku, SkuMaxLength, "SKU").ToUpperInvariant();

        if (!SkuPattern().IsMatch(normalized))
        {
            throw new DomainException($"SKU '{normalized}' must contain only letters, digits and hyphens.");
        }

        return normalized;
    }

    [GeneratedRegex("^[A-Z0-9]+(?:-[A-Z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex SkuPattern();
}
