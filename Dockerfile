FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props global.json ./
COPY src/ ./src/
RUN dotnet publish src/DameDast.Web/DameDast.Web.csproj -c Release -o /out

FROM build AS migration-build
COPY tools/DameDast.DatabaseMigration/ ./tools/DameDast.DatabaseMigration/
RUN dotnet publish tools/DameDast.DatabaseMigration/DameDast.DatabaseMigration.csproj -c Release -o /migration

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS migration
WORKDIR /app
COPY --from=migration-build /migration .
USER app
ENTRYPOINT ["dotnet", "DameDast.DatabaseMigration.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
USER root
RUN mkdir -p /app/data/keys && chown -R app:app /app/data
USER app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
VOLUME ["/app/data"]
ENTRYPOINT ["dotnet", "DameDast.Web.dll"]
