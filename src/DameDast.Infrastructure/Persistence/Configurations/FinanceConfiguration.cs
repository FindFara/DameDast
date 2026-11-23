using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DameDast.Infrastructure.Persistence.Configurations;

internal sealed class LedgerConfiguration : IEntityTypeConfiguration<LedgerRow>
{
    public void Configure(EntityTypeBuilder<LedgerRow> entity)
    {
        entity.HasKey(x => x.UserId);
        entity.Property(x => x.UserId).HasMaxLength(256);
        entity.Property(x => x.Revision).IsConcurrencyToken();
        entity.HasMany(x => x.Records).WithOne().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.ToTable("Ledgers", table => table.HasCheckConstraint("CK_Ledgers_Revision", "\"Revision\" >= 0"));
    }
}

internal sealed class FinanceRecordConfiguration : IEntityTypeConfiguration<FinanceRecordRow>
{
    public void Configure(EntityTypeBuilder<FinanceRecordRow> entity)
    {
        entity.HasKey(x => new { x.UserId, x.Id });
        entity.Property(x => x.UserId).HasMaxLength(256);
        entity.Property(x => x.Id).ValueGeneratedNever();
        entity.Property(x => x.Kind).HasMaxLength(64);
        entity.Property(x => x.Version).IsConcurrencyToken();
        entity.Property(x => x.Data).HasColumnType("jsonb");
        entity.HasIndex(x => new { x.UserId, x.Kind, x.Deleted });
        entity.HasIndex(x => new { x.UserId, x.SortOrder });
        entity.HasIndex(x => new { x.UserId, x.Kind }).IsUnique().HasFilter("\"Kind\" = 'workbench' AND NOT \"Deleted\"");
        entity.ToTable("FinanceRecords", table =>
        {
            table.HasCheckConstraint("CK_FinanceRecords_Version", "\"Version\" > 0");
            table.HasCheckConstraint("CK_FinanceRecords_SortOrder", "\"SortOrder\" >= 0");
            table.HasCheckConstraint("CK_FinanceRecords_Kind", "length(\"Kind\") > 0");
        });
    }
}

internal sealed class ReceiptConfiguration : IEntityTypeConfiguration<Receipt>
{
    public void Configure(EntityTypeBuilder<Receipt> entity)
    {
        entity.HasKey(x => new { x.UserId, x.OperationId });
        entity.Property(x => x.UserId).HasMaxLength(256);
        // Keep the serialized request as text: idempotency compares its exact representation.
        entity.Property(x => x.Payload).IsRequired();
        entity.HasOne<LedgerRow>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
