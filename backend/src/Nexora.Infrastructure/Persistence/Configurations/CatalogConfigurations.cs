using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexora.Domain.Catalog;
using Nexora.Domain.Common;

namespace Nexora.Infrastructure.Persistence.Configurations;

// Column names are snake_case (UseSnakeCaseNamingConvention), so raw SQL in check
// constraints must use the snake_case names.

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(category => category.Id);
        builder.Property(category => category.Name).HasMaxLength(Category.NameMaxLength);
        builder.Property(category => category.Slug).HasMaxLength(Guard.SlugMaxLength);
        builder.HasIndex(category => category.Slug).IsUnique();

        builder.HasOne(category => category.Parent)
            .WithMany()
            .HasForeignKey(category => category.ParentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.HasKey(brand => brand.Id);
        builder.Property(brand => brand.Name).HasMaxLength(Brand.NameMaxLength);
        builder.Property(brand => brand.Slug).HasMaxLength(Guard.SlugMaxLength);
        builder.HasIndex(brand => brand.Slug).IsUnique();
    }
}

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(product => product.Id);
        builder.Property(product => product.Name).HasMaxLength(Product.NameMaxLength);
        builder.Property(product => product.Slug).HasMaxLength(Guard.SlugMaxLength);
        builder.Property(product => product.Description).HasMaxLength(Product.DescriptionMaxLength);

        builder.HasIndex(product => product.Slug).IsUnique();
        builder.HasIndex(product => new { product.CategoryId, product.IsPublished });

        // Optimistic concurrency (PostgreSQL xmin): two admins editing the same product cannot
        // silently overwrite each other; the second save gets a 409.
        builder.Property<uint>(ConcurrencyVersion.PropertyName).IsRowVersion();
        builder.HasIndex(product => product.Name).HasMethod("gin").HasOperators("gin_trgm_ops");

        // Deleting a category or brand that still has products must fail, not cascade.
        builder.HasOne(product => product.Category)
            .WithMany()
            .HasForeignKey(product => product.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(product => product.Brand)
            .WithMany()
            .HasForeignKey(product => product.BrandId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(product => product.Variants)
            .WithOne()
            .HasForeignKey(variant => variant.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(product => product.Images)
            .WithOne()
            .HasForeignKey(image => image.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.HasKey(variant => variant.Id);
        builder.Property(variant => variant.Sku).HasMaxLength(ProductVariant.SkuMaxLength);
        builder.Property(variant => variant.Name).HasMaxLength(ProductVariant.NameMaxLength);
        builder.Property(variant => variant.Price).HasPrecision(Price.Precision, Price.Scale);
        builder.Property(variant => variant.CompareAtPrice).HasPrecision(Price.Precision, Price.Scale);

        builder.HasIndex(variant => variant.Sku).IsUnique();

        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_product_variants_price_positive", "price > 0");
            table.HasCheckConstraint(
                "ck_product_variants_compare_at_above_price",
                "compare_at_price IS NULL OR compare_at_price > price");
        });

        builder.HasOne(variant => variant.Inventory)
            .WithOne()
            .HasForeignKey<InventoryItem>(inventory => inventory.VariantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> builder)
    {
        builder.HasKey(image => image.Id);
        builder.Property(image => image.Url).HasMaxLength(ProductImage.UrlMaxLength);
        builder.Property(image => image.AltText).HasMaxLength(ProductImage.AltTextMaxLength);
        builder.HasIndex(image => new { image.ProductId, image.SortOrder });

        builder.ToTable(table =>
            table.HasCheckConstraint("ck_product_images_dimensions_positive", "width > 0 AND height > 0"));
    }
}

internal sealed class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.HasKey(inventory => inventory.VariantId);

        // Last line of defense against overselling: the database itself rejects negative stock.
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_inventory_items_on_hand_non_negative", "on_hand >= 0");
            table.HasCheckConstraint("ck_inventory_items_reserved_within_on_hand", "reserved >= 0 AND reserved <= on_hand");
            table.HasCheckConstraint("ck_inventory_items_threshold_non_negative", "low_stock_threshold >= 0");
        });
    }
}
