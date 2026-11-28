using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DameDast.Infrastructure.Persistence.Configurations;

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> e)
    {
        e.ToTable("Users");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasMaxLength(256);
        e.Property(x => x.Name).HasMaxLength(200);
        e.Property(x => x.Email).HasMaxLength(320);
        e.HasIndex(x => x.Email);
        e.HasMany(x => x.Roles).WithOne().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
internal sealed class AppRoleConfiguration : IEntityTypeConfiguration<AppRole>
{
    public void Configure(EntityTypeBuilder<AppRole> e)
    {
        e.ToTable("Roles");
        e.HasKey(x => x.Name);
        e.Property(x => x.Name).HasMaxLength(64);
        e.Property(x => x.NormalizedName).HasMaxLength(64);
        e.HasIndex(x => x.NormalizedName).IsUnique();
    }
}
internal sealed class AppUserRoleConfiguration : IEntityTypeConfiguration<AppUserRole>
{
    public void Configure(EntityTypeBuilder<AppUserRole> e)
    {
        e.ToTable("UserRoles");
        e.HasKey(x => new { x.UserId, x.RoleName });
        e.Property(x => x.UserId).HasMaxLength(256);
        e.Property(x => x.RoleName).HasMaxLength(64);
        e.HasOne<AppRole>().WithMany().HasForeignKey(x => x.RoleName).OnDelete(DeleteBehavior.Cascade);
    }
}
internal sealed class PageViewDailyConfiguration : IEntityTypeConfiguration<PageViewDaily>
{
    public void Configure(EntityTypeBuilder<PageViewDaily> e)
    {
        e.ToTable("PageViews", t => t.HasCheckConstraint("CK_PageViews_Views", "\"Views\" >= 0"));
        e.HasKey(x => new { x.Page, x.Date });
        e.Property(x => x.Page).HasMaxLength(64);
        e.HasIndex(x => x.Date);
    }
}
