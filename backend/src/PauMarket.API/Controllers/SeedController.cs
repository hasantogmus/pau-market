using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.Models;

namespace PauMarket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedController(PauMarketDbContext dbContext) : ControllerBase
{
    [HttpPost("pilot-data")]
    [AllowAnonymous]
    public async Task<IActionResult> GeneratePilotData()
    {
        try
        {
            // 1. Check if we already seeded a lot of data
            int interactionCount = await dbContext.Interactions.CountAsync();
            if (interactionCount > 1000)
            {
                return BadRequest(new { message = "Veritabanında zaten yeterince veri var. Önce veritabanını temizlemelisiniz." });
            }

            var random = new Random();

            // 2. Add 50 Fake Users
            var firstNames = new[] { "Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Veli", "Hasan", "Hüseyin", "Zeynep", "Elif", "Mustafa", "İbrahim", "Hatice", "Merve", "Burak", "Emre" };
            var lastNames = new[] { "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç" };
            var departments = new[] { "Bilgisayar Mühendisliği", "Tıp", "Hukuk", "İşletme", "Eğitim", "Mimarlık", "Makine Mühendisliği", "Elektrik-Elektronik", "Diş Hekimliği", "Eczacılık" };

            var newUsers = new List<User>();
            for (int i = 0; i < 50; i++)
            {
                var fn = firstNames[random.Next(firstNames.Length)];
                var ln = lastNames[random.Next(lastNames.Length)];
                var dep = departments[random.Next(departments.Length)];
                
                var user = new User
                {
                    FirstName = fn,
                    LastName = ln,
                    Email = $"ogrenci{i}_{random.Next(1000, 9999)}@posta.pau.edu.tr",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("PauMarket2026!", 12),
                    IsEmailVerified = true,
                    Role = "User",
                    Department = dep,
                    Grade = (byte)random.Next(1, 5),
                    PreferredCategories = "Elektronik, Ders Kitabı, Giyim",
                    CreatedAt = DateTime.UtcNow.AddDays(-random.Next(1, 100))
                };
                newUsers.Add(user);
            }
            dbContext.Users.AddRange(newUsers);
            await dbContext.SaveChangesAsync();

            // 3. Add 200 Fake Listings
            var activeUsers = await dbContext.Users.Where(u => u.Role == "User").ToListAsync();
            var categories = new[] { "Elektronik", "Ders Kitabı", "Giyim", "Ev Eşyası", "Hobi", "Not / Özet" };
            var conditions = new[] { "Sıfır", "Az Kullanılmış", "Çok Kullanılmış" };
            
            var listingTemplates = new List<(string Cat, string[] Titles)>
            {
                ("Elektronik", new[] { "iPhone 11 Temiz", "Samsung Monitör", "Mekanik Klavye", "Gaming Mouse", "Bluetooth Kulaklık", "iPad Kılıfı", "Laptop Soğutucu", "HDMI Kablo", "Taşınabilir Şarj Cihazı", "Raspberry Pi 4" }),
                ("Ders Kitabı", new[] { "Fizik 101 Kitabı", "Calculus 1-2", "Lineer Cebir Notları", "Tarih Kitabı", "Anatomi Atlası", "Programlamaya Giriş", "Organik Kimya", "Termodinamik", "Hukuka Giriş", "Makroiktisat" }),
                ("Giyim", new[] { "Nike Ayakkabı 42 No", "Zara Mont", "Levis Pantolon", "Adidas Eşofman", "Kışlık Bere", "Güneş Gözlüğü", "Orijinal Saat", "Koton Kazak", "Outdoor Bot", "Vintage Ceket" }),
                ("Ev Eşyası", new[] { "Çalışma Masası", "IKEA Sandalye", "Mini Buzdolabı", "Kettle", "Tost Makinesi", "Askılık", "Masa Lambası", "Halı 120x180", "Tek Kişilik Yatak", "Ütü" }),
                ("Hobi", new[] { "Akustik Gitar", "Dağ Bisikleti", "Tenis Raketi", "Kamp Çadırı 2 Kişilik", "Satranç Takımı", "Paten 41 Numara", "Puzzle 1000 Parça", "Yoga Matı", "Dumbell Seti 10kg", "Kutu Oyunu (Tabu)" }),
                ("Not / Özet", new[] { "Veri Yapıları Final Özeti", "İşletme Vize Notları", "Fizyoloji TUS Notu", "İngilizce Hazırlık Kitapları", "Tarih Özet", "Matematik Formül Kağıtları" })
            };

            var newListings = new List<Listing>();
            for (int i = 0; i < 200; i++)
            {
                var catGroup = listingTemplates[random.Next(listingTemplates.Count)];
                var title = catGroup.Titles[random.Next(catGroup.Titles.Length)] + $" {random.Next(1, 99)}";
                
                var isSold = random.NextDouble() > 0.8;
                
                var listing = new Listing
                {
                    UserId = activeUsers[random.Next(activeUsers.Count)].Id,
                    Title = title,
                    Description = $"{title} satılıktır. Çok temiz kullanılmıştır. İlgilenenler mesaj atabilir. Acil ihtiyaçtan satılık.",
                    Price = random.Next(50, 5000),
                    Category = catGroup.Cat,
                    Condition = conditions[random.Next(conditions.Length)],
                    IsActive = true,
                    IsApproved = true,
                    IsSold = isSold,
                    SoldAt = isSold ? DateTime.UtcNow.AddDays(-random.Next(1, 10)) : null,
                    SoldToUserId = isSold ? activeUsers[random.Next(activeUsers.Count)].Id : null,
                    CreatedAt = DateTime.UtcNow.AddDays(-random.Next(11, 60))
                };
                newListings.Add(listing);
            }
            dbContext.Listings.AddRange(newListings);
            await dbContext.SaveChangesAsync();

            // 4. Add 2000 Interactions (Views & Favorites)
            var allListings = await dbContext.Listings.ToListAsync();
            var newInteractions = new List<Interaction>();
            
            for (int i = 0; i < 2000; i++)
            {
                var u = activeUsers[random.Next(activeUsers.Count)];
                var l = allListings[random.Next(allListings.Count)];
                
                // Owner shouldn't interact with their own item usually
                if (u.Id == l.UserId) continue;

                // 80% View, 20% Favorite
                var isFav = random.NextDouble() > 0.8;
                
                newInteractions.Add(new Interaction
                {
                    UserId = u.Id,
                    ListingId = l.Id,
                    InteractionType = isFav ? InteractionType.Favorite : InteractionType.View,
                    Timestamp = DateTime.UtcNow.AddDays(-random.Next(1, 30))
                });
            }

            dbContext.Interactions.AddRange(newInteractions);
            await dbContext.SaveChangesAsync();

            return Ok(new { 
                message = "Pilot veri başarıyla oluşturuldu!", 
                usersAdded = newUsers.Count, 
                listingsAdded = newListings.Count, 
                interactionsAdded = newInteractions.Count 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
