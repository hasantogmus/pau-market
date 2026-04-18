# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["src/PauMarket.API/PauMarket.API.csproj", "PauMarket.API/"]
RUN dotnet restore "PauMarket.API/PauMarket.API.csproj"

# Copy everything else and build
COPY ["src/PauMarket.API/", "PauMarket.API/"]
WORKDIR "/src/PauMarket.API"
RUN dotnet build "PauMarket.API.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "PauMarket.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final Stage / Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose port (ASP.NET Core 8 defaults to 8080)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "PauMarket.API.dll"]
