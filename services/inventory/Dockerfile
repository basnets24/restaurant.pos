FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5094

ENV ASPNETCORE_URLS=http://+:5094

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-dotnet-configure-containers
RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
COPY ["src/InventoryService/InventoryService.csproj", "src/InventoryService/"]

RUN --mount=type=secret,id=GH_OWNER --mount=type=secret,id=GH_PAT \
    dotnet nuget add source --username USERNAME --password $(cat /run/secrets/GH_PAT) --store-password-in-clear-text --name github "https://nuget.pkg.github.com/$(cat /run/secrets/GH_OWNER)/index.json"
RUN dotnet restore "src/InventoryService/InventoryService.csproj"
COPY ./src ./src
WORKDIR "/src/InventoryService"
RUN dotnet publish "InventoryService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "InventoryService.dll"]