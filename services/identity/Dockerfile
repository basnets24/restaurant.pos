FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5265

ENV ASPNETCORE_URLS=http://+:5265

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-dotnet-configure-containers
RUN adduser -u 5678 --disabled-password --gecos "" appuser && \
    chown -R appuser /app
USER appuser

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
COPY ["src/IdentityService/IdentityService.csproj", "src/IdentityService/"]

RUN --mount=type=secret,id=GH_OWNER --mount=type=secret,id=GH_PAT \
    dotnet nuget add source --username $(cat /run/secrets/GH_OWNER) --password $(cat /run/secrets/GH_PAT) --store-password-in-clear-text --name github "https://nuget.pkg.github.com/$(cat /run/secrets/GH_OWNER)/index.json"
RUN dotnet restore "src/IdentityService/IdentityService.csproj"
COPY ./src ./src
WORKDIR "/src/IdentityService"
RUN dotnet publish "IdentityService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
# Create keys directory for IdentityServer signing keys and set proper ownership
USER root
RUN mkdir -p /app/keys && chown -R appuser:appuser /app
USER appuser
ENTRYPOINT ["dotnet", "IdentityService.dll"]