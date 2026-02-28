using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ─── Veritabanı — MSSQL + EF Core ───────────────────────────────────────────
builder.Services.AddDbContext<PauMarketDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null)));

// ─── HTTP + Swagger ───────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "PauMarket API",
        Version = "v1",
        Description = "PAÜ öğrencilerine özel C2C pazaryeri — sadece @posta.pau.edu.tr e-postaları kabul edilir."
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
builder.Services.AddScoped<IListingService, ListingService>();

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
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();
