using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexora.Domain.Auditing;
using Nexora.Domain.Catalog;

namespace Nexora.Infrastructure.Persistence.Configurations;

internal sealed class InventoryMovementConfiguration : IEntityTypeConfiguration<InventoryMovement>
{
    private const int ReasonMaxLength = 20;
    private const int ReferenceMaxLength = 40;

    public void Configure(EntityTypeBuilder<InventoryMovement> builder)
    {
        builder.HasKey(movement => movement.Id);
        builder.Property(movement => movement.Reason).HasConversion<string>().HasMaxLength(ReasonMaxLength);
        builder.Property(movement => movement.Note).HasMaxLength(InventoryMovement.NoteMaxLength);
        builder.Property(movement => movement.Reference).HasMaxLength(ReferenceMaxLength);
        builder.HasIndex(movement => new { movement.VariantId, movement.CreatedAt });

        builder.HasOne<ProductVariant>()
            .WithMany()
            .HasForeignKey(movement => movement.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(table => table.HasCheckConstraint("ck_inventory_movements_non_zero", "quantity_change <> 0"));
    }
}

internal sealed class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> builder)
    {
        builder.ToTable("audit_log");
        builder.HasKey(entry => entry.Id);
        builder.Property(entry => entry.ActorEmail).HasMaxLength(AuditLogEntry.ActorEmailMaxLength);
        builder.Property(entry => entry.Action).HasMaxLength(AuditLogEntry.ActionMaxLength);
        builder.Property(entry => entry.EntityType).HasMaxLength(AuditLogEntry.EntityTypeMaxLength);
        builder.Property(entry => entry.EntityId).HasMaxLength(AuditLogEntry.EntityIdMaxLength);
        builder.Property(entry => entry.Summary).HasMaxLength(AuditLogEntry.SummaryMaxLength);
        builder.HasIndex(entry => entry.CreatedAt);
        // No foreign key to users on purpose: the trail must survive if an account is removed.
    }
}
