FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5200

ENV ASPNETCORE_URLS=http://+:5200

RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
COPY ["src/TenantService/TenantService.csproj", "src/TenantService/"]

RUN --mount=type=secret,id=GH_OWNER --mount=type=secret,id=GH_PAT \
    dotnet nuget add source --username $(cat /run/secrets/GH_OWNER) --password $(cat /run/secrets/GH_PAT) --store-password-in-clear-text --name github "https://nuget.pkg.github.com/$(cat /run/secrets/GH_OWNER)/index.json"
RUN dotnet restore "src/TenantService/TenantService.csproj"
COPY ./src ./src
WORKDIR "/src/TenantService"
RUN dotnet publish "TenantService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TenantService.dll"]