using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DameDast.Infrastructure.Persistence.Configurations;

internal sealed class PushSubscriptionConfiguration : IEntityTypeConfiguration<DeviceSubscription>
{
    public void Configure(EntityTypeBuilder<DeviceSubscription> entity)
    {
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).HasMaxLength(64);
        entity.Property(x => x.UserId).HasMaxLength(256);
        entity.Property(x => x.Language).HasMaxLength(8);
        entity.HasIndex(x => x.UserId);
    }
}

internal sealed class ReminderReceiptConfiguration : IEntityTypeConfiguration<ReminderReceipt>
{
    public void Configure(EntityTypeBuilder<ReminderReceipt> entity)
    {
        entity.HasKey(x => x.Key);
        entity.HasIndex(x => x.SentAt);
    }
}
