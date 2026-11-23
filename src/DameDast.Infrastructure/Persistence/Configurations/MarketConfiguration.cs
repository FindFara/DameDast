using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DameDast.Infrastructure.Persistence.Configurations;

internal sealed class MarketSampleConfiguration : IEntityTypeConfiguration<MarketSample>
{
    public void Configure(EntityTypeBuilder<MarketSample> entity)
    {
        entity.HasKey(x => new { x.Symbol, x.Timestamp });
        entity.Property(x => x.Symbol).HasMaxLength(128);
        entity.Property(x => x.Price).HasColumnType("numeric");
        entity.ToTable("MarketSamples", table => table.HasCheckConstraint("CK_MarketSamples_Price", "\"Price\" > 0"));
    }
}
