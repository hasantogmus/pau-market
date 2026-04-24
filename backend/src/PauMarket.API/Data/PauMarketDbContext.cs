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
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ListingImage> ListingImages => Set<ListingImage>();
    public DbSet<UserView> UserViews => Set<UserView>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DealRequest> DealRequests => Set<DealRequest>();

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
            entity.ToTable("Listings", table =>
            {
                table.HasCheckConstraint(
                    "CK_Listings_SaleState",
                    "([IsSold] = 0 AND [SoldAt] IS NULL AND [SoldToUserId] IS NULL) OR ([IsSold] = 1 AND [SoldAt] IS NOT NULL AND [SoldToUserId] IS NOT NULL)");
            });
            entity.HasKey(l => l.Id);

            entity.Property(l => l.Title).IsRequired().HasMaxLength(200);
            entity.Property(l => l.Description).HasMaxLength(2000);
            entity.Property(l => l.Price).HasColumnType("decimal(18,2)").IsRequired();
            entity.Property(l => l.Category).IsRequired().HasMaxLength(50);
            entity.Property(l => l.Condition).IsRequired().HasMaxLength(50);
            entity.Property(l => l.IsActive).HasDefaultValue(true);
            entity.Property(l => l.IsSold).HasDefaultValue(false);
            entity.Property(l => l.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            // Listing → User (N:1)
            // Bir kullanıcı silinirse ilanları korunur (Restrict)
            entity.HasOne(l => l.User)
                  .WithMany(u => u.Listings)
                  .HasForeignKey(l => l.UserId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Listings_Users_UserId");

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(l => l.SoldToUserId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Listings_Users_SoldToUserId");

            // Aktif ilanlar üzerinde sorgular için index
            entity.HasIndex(l => new { l.IsActive, l.Category })
                  .HasDatabaseName("IX_Listings_IsActive_Category");
        });

        // ═══════════════════════════════════════════════════════════
        // LISTING IMAGE
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<ListingImage>(entity =>
        {
            entity.ToTable("ListingImages");
            entity.HasKey(image => image.Id);

            entity.Property(image => image.ImageUrl)
                  .IsRequired();

            entity.Property(image => image.SortOrder)
                  .IsRequired();

            entity.Property(image => image.CreatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(image => image.Listing)
                  .WithMany(listing => listing.Images)
                  .HasForeignKey(image => image.ListingId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ListingImages_Listings_ListingId");

            entity.HasIndex(image => new { image.ListingId, image.SortOrder })
                  .IsUnique()
                  .HasDatabaseName("UX_ListingImages_Listing_SortOrder");
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
        // MESSAGE
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("Messages");
            entity.HasKey(m => m.Id);

            entity.Property(m => m.Content).IsRequired().HasMaxLength(2000);
            entity.Property(m => m.IsRead).HasDefaultValue(false);
            entity.Property(m => m.SentAt).HasDefaultValueSql("GETUTCDATE()");

            // Message → Sender (Restrict: cascade çakışmasını önler)
            entity.HasOne(m => m.Sender)
                  .WithMany()
                  .HasForeignKey(m => m.SenderId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Messages_Users_SenderId");

            // Message → Receiver (Restrict: cascade çakışmasını önler)
            entity.HasOne(m => m.Receiver)
                  .WithMany()
                  .HasForeignKey(m => m.ReceiverId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Messages_Users_ReceiverId");

            // Message → Listing (Restrict: ilan silinince mesajlar korunsun)
            entity.HasOne(m => m.Listing)
                  .WithMany(l => l.Messages)
                  .HasForeignKey(m => m.ListingId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_Messages_Listings_ListingId");

            // Konusma sorguları için index
            entity.HasIndex(m => new { m.ListingId, m.SenderId, m.ReceiverId })
                  .HasDatabaseName("IX_Messages_ListingId_SenderId_ReceiverId");
        });

        // ═══════════════════════════════════════════════════════════
        // DEAL REQUEST
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<DealRequest>(entity =>
        {
            entity.ToTable("DealRequests");
            entity.HasKey(request => request.Id);

            entity.Property(request => request.Note).HasMaxLength(500);
            entity.Property(request => request.Status)
                  .HasConversion<int>()
                  .HasDefaultValue(DealRequestStatus.Pending);
            entity.Property(request => request.RequestedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(request => request.Listing)
                  .WithMany(listing => listing.DealRequests)
                  .HasForeignKey(request => request.ListingId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_DealRequests_Listings_ListingId");

            entity.HasOne(request => request.Buyer)
                  .WithMany()
                  .HasForeignKey(request => request.BuyerId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_DealRequests_Users_BuyerId");

            entity.HasOne(request => request.Seller)
                  .WithMany()
                  .HasForeignKey(request => request.SellerId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_DealRequests_Users_SellerId");

            entity.HasIndex(request => new { request.ListingId, request.BuyerId })
                  .IsUnique()
                  .HasDatabaseName("UX_DealRequests_Listing_Buyer");

            entity.HasIndex(request => request.ListingId)
                  .IsUnique()
                  .HasFilter("[Status] = 2")
                  .HasDatabaseName("UX_DealRequests_Listing_Accepted");

            entity.HasIndex(request => new { request.SellerId, request.Status })
                  .HasDatabaseName("IX_DealRequests_Seller_Status");
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

        // ═══════════════════════════════════════════════════════════
        // REVIEW (Değerlendirme Sistemi)
        // ═══════════════════════════════════════════════════════════
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("Reviews");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Rating).IsRequired();
            entity.Property(r => r.Comment).HasMaxLength(1000);
            entity.Property(r => r.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            // Review → TargetUser (Satıcı)
            // SQL Server'da multiple cascade paths (döngü) hatasını önlemek için NoAction.
            entity.HasOne(r => r.TargetUser)
                  .WithMany()
                  .HasForeignKey(r => r.TargetUserId)
                  .OnDelete(DeleteBehavior.NoAction)
                  .HasConstraintName("FK_Reviews_Users_TargetUserId");

            // Review → Reviewer (Yorum Yapan)
            entity.HasOne(r => r.Reviewer)
                  .WithMany()
                  .HasForeignKey(r => r.ReviewerId)
                  .OnDelete(DeleteBehavior.NoAction)
                  .HasConstraintName("FK_Reviews_Users_ReviewerId");

            // Review → Listing (Opsiyonel)
            entity.HasOne(r => r.Listing)
                  .WithMany()
                  .HasForeignKey(r => r.ListingId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("FK_Reviews_Listings_ListingId");

            // Bir kullanıcı aynı ilandan dolayı aynı satıcıya 1'den fazla yorum yapamaz
            entity.HasIndex(r => new { r.ReviewerId, r.TargetUserId, r.ListingId })
                  .IsUnique()
                  .HasDatabaseName("UX_Reviews_Reviewer_Target_Listing")
                  .HasFilter("[ListingId] IS NOT NULL"); // ListingId null değilse benzersiz olsun
        });
    }
}
