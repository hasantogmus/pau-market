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

// ─── CORS (Next.js frontend için) ───────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:3000",
                "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ─── Health Checks ───────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─── Application Services ────────────────────────────────────────────────────
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddScoped<IListingService, ListingService>();
builder.Services.AddScoped<IInteractionService, InteractionService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IReviewService, ReviewService>();

var app = builder.Build();

// ─── Middleware Pipeline ─────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PauMarket API v1"));

    // Geliştirme ortamında migration'ları otomatik uygula
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<PauMarketDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();   // JWT doğrulama — UseAuthorization'dan önce olmalı
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();

