using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DameDast.Infrastructure.Persistence.Configurations;

internal sealed class WhiteboardConfiguration : IEntityTypeConfiguration<WhiteboardRow>
{
    public void Configure(EntityTypeBuilder<WhiteboardRow> entity)
    {
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).ValueGeneratedNever();
        entity.Property(x => x.OwnerId).HasMaxLength(256);
        entity.Property(x => x.Revision).IsConcurrencyToken();
        entity.Property(x => x.State).HasColumnType("jsonb");
        entity.HasIndex(x => new { x.OwnerId, x.UpdatedAt });
        entity.ToTable("Whiteboards", table => table.HasCheckConstraint("CK_Whiteboards_Revision", "\"Revision\" >= 0"));
    }
}

internal sealed class WhiteboardOperationConfiguration : IEntityTypeConfiguration<WhiteboardOperation>
{
    public void Configure(EntityTypeBuilder<WhiteboardOperation> entity)
    {
        entity.HasKey(x => new { x.DocumentId, x.OperationId });
        entity.Property(x => x.Digest).HasMaxLength(64);
        entity.HasOne<WhiteboardRow>().WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class WhiteboardShareConfiguration : IEntityTypeConfiguration<WhiteboardShare>
{
    public void Configure(EntityTypeBuilder<WhiteboardShare> entity)
    {
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).ValueGeneratedNever();
        entity.Property(x => x.TokenHash).HasMaxLength(64);
        entity.Property(x => x.Role).HasMaxLength(8);
        entity.HasIndex(x => x.TokenHash).IsUnique();
        entity.HasOne<WhiteboardRow>().WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
        entity.ToTable("WhiteboardShares", table => table.HasCheckConstraint("CK_WhiteboardShares_Role", "\"Role\" IN ('view', 'edit')"));
    }
}

internal sealed class WhiteboardLibraryConfiguration : IEntityTypeConfiguration<WhiteboardLibrary>
{
    public void Configure(EntityTypeBuilder<WhiteboardLibrary> entity)
    {
        entity.HasKey(x => x.UserId);
        entity.Property(x => x.UserId).HasMaxLength(256);
        entity.Property(x => x.Revision).IsConcurrencyToken();
        entity.Property(x => x.Items).HasColumnType("jsonb");
        entity.ToTable("WhiteboardLibraries", table => table.HasCheckConstraint("CK_WhiteboardLibraries_Revision", "\"Revision\" >= 0"));
    }
}
