using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PauMarket.API.Data;
using PauMarket.API.Services;
using PauMarket.API.Settings;

var builder = WebApplication.CreateBuilder(args);

// ─── Veritabanı — MSSQL + EF Core ───────────────────────────────────────────
builder.Services.AddDbContext<PauMarketDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null)));

// ─── JWT Authentication ───────────────────────────────────────────────────────
var jwtConfig = builder.Configuration.GetSection("Jwt");
var keyBytes  = Encoding.UTF8.GetBytes(jwtConfig["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = jwtConfig["Issuer"],
        ValidAudience            = jwtConfig["Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(keyBytes),
        ClockSkew                = TimeSpan.Zero   // Token süresini tam tutuyoruz
    };
});

// ─── Servisler (DI) ──────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IAuthService, AuthService>();

// ─── HTTP + Swagger ───────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title       = "PauMarket API",
        Version     = "v1",
        Description = "PAÜ öğrencilerine özel C2C pazaryeri — sadece @posta.pau.edu.tr e-postaları kabul edilir."
    });

    // Swagger UI üzerinden JWT ile test edebilmek için Bearer tanımı
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description  = "JWT token girin. Örnek: eyJhbGci..."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ─── CORS (Frontend React Uygulaması için) ────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ─── Health Checks ───────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─── Application Services ────────────────────────────────────────────────────
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddScoped<IListingService, ListingService>();
builder.Services.AddScoped<IInteractionService, InteractionService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddHttpClient<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

var app = builder.Build();

// ─── Middleware Pipeline ─────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PauMarket API v1"));

    // Geliştirme ortamında migration'ları otomatik uygula ve Sahte İlan ekle
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<PauMarketDbContext>();
    await dbContext.Database.MigrateAsync();

    // ─── EĞER VERİTABANI BOŞSA VİTRİN/TEST İÇİN 12 ADET KOPYA İLAN EKLE ───
    if (!await dbContext.Listings.AnyAsync())
    {
        Console.WriteLine("[SEED] Veritabanı boş! Sunum/Test için 12 adet başlangıç ilanı yükleniyor...");

        // 1. Sistem kullanıcısını bul veya oluştur
        var systemUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "system@posta.pau.edu.tr");
        if (systemUser == null)
        {
            // Bcrypt ile manuel hash üretimi uğraştıracağından basit dummy bir şifre hash'i giriyoruz
            systemUser = new PauMarket.API.Models.User
            {
                FirstName = "Sistem",
                LastName = "Kullanıcısı",
                Email = "system@posta.pau.edu.tr",
                PasswordHash = "$2a$11$dummyhashformockusersystem...", 
                IsEmailVerified = true,
                Role = "Admin"
            };
            dbContext.Users.Add(systemUser);
            await dbContext.SaveChangesAsync(); // userId alabilmek için
        }

        // 2. İlanları oluştur (Frontend'deki MOCK_LISTINGS ile tam eşleşen)
        var mockListings = new List<PauMarket.API.Models.Listing>
        {
            new() { Title = "Apple MacBook Air M2 - 13\"", Price = 28500, Condition = "Az Kullanılmış", Category = "Elektronik", ImageUrl = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Calculus - James Stewart (8. Baskı)", Price = 180, Condition = "Çok Kullanılmış", Category = "Ders Kitabı", ImageUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Nike Air Force 1 – 42 Numara", Price = 750, Condition = "Sıfır", Category = "Giyim", ImageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Nespresso Kahve Makinesi", Price = 1200, Condition = "Az Kullanılmış", Category = "Ev Eşyası", ImageUrl = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Sony WH-1000XM5 Kulaklık", Price = 4200, Condition = "Sıfır", Category = "Elektronik", ImageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Veri Yapıları ve Algoritmalar Notları", Price = 50, Condition = "Çok Kullanılmış", Category = "Not / Özet", ImageUrl = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Logitech MX Master 3 Mouse", Price = 1850, Condition = "Az Kullanılmış", Category = "Elektronik", ImageUrl = "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Trek Marlin 5 Dağ Bisikleti", Price = 6500, Condition = "Az Kullanılmış", Category = "Hobi", ImageUrl = "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "iPad Pro 11\" + Apple Pencil", Price = 19000, Condition = "Sıfır", Category = "Elektronik", ImageUrl = "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Thermos Stanley 1L", Price = 450, Condition = "Sıfır", Category = "Ev Eşyası", ImageUrl = "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "Fizik Olimpiyat Soruları Kitabı", Price = 90, Condition = "Az Kullanılmış", Category = "Ders Kitabı", ImageUrl = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80", UserId = systemUser.Id },
            new() { Title = "PlayStation 5 + 2 Kol", Price = 22000, Condition = "Az Kullanılmış", Category = "Hobi", ImageUrl = "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400&q=80", UserId = systemUser.Id }
        };

        dbContext.Listings.AddRange(mockListings);
        await dbContext.SaveChangesAsync();
        Console.WriteLine("[SEED] 12 adet ilan başarıyla C# veritabanına eklendi!");
    }
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();   // JWT doğrulama — UseAuthorization'dan önce olmalı
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();

