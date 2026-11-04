using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexora.Domain.Catalog;
using Nexora.Domain.Ordering;
using Nexora.Infrastructure.Identity;

namespace Nexora.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    private const int StatusMaxLength = 20;

    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(order => order.Id);
        builder.Property(order => order.OrderNumber).HasMaxLength(Order.OrderNumberLength);
        builder.HasIndex(order => order.OrderNumber).IsUnique();

        // Idempotency is enforced by the database: one order per (user, key), even under races.
        builder.HasIndex(order => new { order.UserId, order.IdempotencyKey }).IsUnique();
        builder.HasIndex(order => new { order.UserId, order.CreatedAt });
        // Supports the expiration sweep (pending orders older than the payment window).
        builder.HasIndex(order => new { order.Status, order.CreatedAt });

        // Stored as text: readable in SQL and safe if enum members are reordered.
        builder.Property(order => order.Status).HasConversion<string>().HasMaxLength(StatusMaxLength);

        builder.Property(order => order.ShippingMethodCode).HasMaxLength(Order.ShippingCodeMaxLength);
        builder.Property(order => order.ShippingMethodLabel).HasMaxLength(Order.ShippingLabelMaxLength);
        builder.Property(order => order.PaymentReference).HasMaxLength(Order.PaymentReferenceMaxLength);

        foreach (var money in new[] { nameof(Order.ShippingCost), nameof(Order.Subtotal), nameof(Order.Total), nameof(Order.TaxableAmount), nameof(Order.TaxAmount) })
        {
            builder.Property<decimal>(money).HasPrecision(Price.Precision, Price.Scale);
        }

        builder.Property(order => order.TaxRate).HasPrecision(5, 4);

        // Optimistic concurrency on PostgreSQL's xmin system column: the payment confirmation and
        // the expiration sweep can never both change the same order.
        builder.Property<uint>("Version").IsRowVersion();

        builder.ComplexProperty(order => order.ShippingAddress, address =>
        {
            address.Property(value => value.RecipientName).HasMaxLength(ShippingAddress.NameMaxLength);
            address.Property(value => value.Phone).HasMaxLength(ShippingAddress.PhoneMaxLength);
            address.Property(value => value.Department).HasMaxLength(ShippingAddress.RegionMaxLength);
            address.Property(value => value.Province).HasMaxLength(ShippingAddress.RegionMaxLength);
            address.Property(value => value.District).HasMaxLength(ShippingAddress.RegionMaxLength);
            address.Property(value => value.AddressLine).HasMaxLength(ShippingAddress.AddressLineMaxLength);
            address.Property(value => value.Reference).HasMaxLength(ShippingAddress.ReferenceMaxLength);
        });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(order => order.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(order => order.Items)
            .WithOne()
            .HasForeignKey(item => item.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_orders_total_matches", "total = subtotal + shipping_cost");
            table.HasCheckConstraint("ck_orders_tax_matches", "taxable_amount + tax_amount = total");
        });
    }
}

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(item => item.Id);
        builder.Property(item => item.ProductSlug).HasMaxLength(Domain.Common.Guard.SlugMaxLength);
        builder.Property(item => item.ProductName).HasMaxLength(Product.NameMaxLength);
        builder.Property(item => item.VariantName).HasMaxLength(ProductVariant.NameMaxLength);
        builder.Property(item => item.Sku).HasMaxLength(ProductVariant.SkuMaxLength);
        builder.Property(item => item.UnitPrice).HasPrecision(Price.Precision, Price.Scale);

        // A variant that was sold can never be hard-deleted: order history must stay intact.
        builder.HasOne<ProductVariant>()
            .WithMany()
            .HasForeignKey(item => item.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ToTable("order_items", table =>
            table.HasCheckConstraint("ck_order_items_quantity_range", $"quantity BETWEEN 1 AND {OrderItem.MaxQuantity}"));
    }
}
