using Microsoft.EntityFrameworkCore;
using PauMarket.API.Models;

namespace PauMarket.API.Data;

/// <summary>
/// PauMarket uygulamasının ana veritabanı bağlamı.
/// MSSQL + EF Core kullanır. Tablolar arası ilişkiler Fluent API ile tanımlanmıştır.
/// </summary>
public class PauMarketDbContext(DbContextOptions<PauMarketDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<Interaction> Interactions => Set<Interaction>();
    public DbSet<UserView> UserViews => Set<UserView>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ═══════════════════════════════════════════════════════════
        // USER
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);

            entity.Property(u => u.FirstName)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(u => u.LastName)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(u => u.Email)
                  .IsRequired()
                  .HasMaxLength(100);

            // MSSQL seviyesinde @posta.pau.edu.tr domain kısıtı
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_Users_Email_PauDomain",
                "Email LIKE '%@posta.pau.edu.tr'"));

            // E-posta güncellenmez (immutable), unique index
            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("UX_Users_Email");

            entity.Property(u => u.Department).HasMaxLength(100);
            entity.Property(u => u.Grade);
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // ═══════════════════════════════════════════════════════════
        // LISTING
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<Listing>(entity =>
        {
            entity.ToTable("Listings");
            entity.HasKey(l => l.Id);

            entity.Property(l => l.Title).IsRequired().HasMaxLength(200);
            entity.Property(l => l.Description).HasMaxLength(2000);
            entity.Property(l => l.Price).HasColumnType("decimal(18,2)").IsRequired();
            entity.Property(l => l.Category).IsRequired().HasMaxLength(50);
            entity.Property(l => l.Condition).IsRequired().HasMaxLength(50);
            entity.Property(l => l.IsActive).HasDefaultValue(true);
            entity.Property(l => l.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            // Listing → User (N:1)
            // Bir kullanıcı silinirse ilanları korunur (Restrict)
            entity.HasOne(l => l.User)
                  .WithMany(u => u.Listings)
                  .HasForeignKey(l => l.UserId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Listings_Users_UserId");

            // Aktif ilanlar üzerinde sorgular için index
            entity.HasIndex(l => new { l.IsActive, l.Category })
                  .HasDatabaseName("IX_Listings_IsActive_Category");
        });

        // ═══════════════════════════════════════════════════════════
        // INTERACTION  (Recommender Sistem'in veri kaynağı)
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<Interaction>(entity =>
        {
            entity.ToTable("Interactions");
            entity.HasKey(i => i.Id);

            // InteractionType enum → int olarak sakla
            entity.Property(i => i.InteractionType)
                  .HasConversion<int>()
                  .IsRequired();

            entity.Property(i => i.Timestamp).HasDefaultValueSql("GETUTCDATE()");

            // Interaction → User (N:1)
            entity.HasOne(i => i.User)
                  .WithMany(u => u.Interactions)
                  .HasForeignKey(i => i.UserId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_Interactions_Users_UserId");

            // Interaction → Listing (N:1)
            entity.HasOne(i => i.Listing)
                  .WithMany(l => l.Interactions)
                  .HasForeignKey(i => i.ListingId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_Interactions_Listings_ListingId");

            // RS sorguları için: bir kullanıcı–ilan–tür kombinasyonu
            entity.HasIndex(i => new { i.UserId, i.ListingId, i.InteractionType })
                  .HasDatabaseName("IX_Interactions_UserId_ListingId_Type");

            // RS için tüm etkileşimleri kullanıcı bazlı çekmek için
            entity.HasIndex(i => i.UserId)
                  .HasDatabaseName("IX_Interactions_UserId");
        });

        // ═══════════════════════════════════════════════════════════
        // USER_VIEW  (Görüntüleme Geçmişi)
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<UserView>(entity =>
        {
            entity.ToTable("UserViews");
            entity.HasKey(v => v.Id);

            entity.Property(v => v.ViewedAt).HasDefaultValueSql("GETUTCDATE()");

            // Her kullanıcı–ilan çifti için tek kayıt: tekrar ziyarette ViewedAt güncellenir
            entity.HasIndex(v => new { v.UserId, v.ListingId })
                  .IsUnique()
                  .HasDatabaseName("UX_UserViews_UserId_ListingId");

            // 'Son gezilenler' sorgusu için index
            entity.HasIndex(v => new { v.UserId, v.ViewedAt })
                  .HasDatabaseName("IX_UserViews_UserId_ViewedAt");

            // UserView → User (N:1)
            entity.HasOne(v => v.User)
                  .WithMany()
                  .HasForeignKey(v => v.UserId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_UserViews_Users_UserId");

            // UserView → Listing (N:1)
            entity.HasOne(v => v.Listing)
                  .WithMany()
                  .HasForeignKey(v => v.ListingId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_UserViews_Listings_ListingId");
        });
    }
}
