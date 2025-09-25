FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5238

ENV ASPNETCORE_URLS=http://+:5238

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-dotnet-configure-containers
RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
COPY ["PaymentService/PaymentService.csproj", "PaymentService/"]

RUN --mount=type=secret,id=GH_OWNER --mount=type=secret,id=GH_PAT \
    dotnet nuget add source --username USERNAME --password $(cat /run/secrets/GH_PAT) --store-password-in-clear-text --name github "https://nuget.pkg.github.com/$(cat /run/secrets/GH_OWNER)/index.json"
RUN dotnet restore "PaymentService/PaymentService.csproj"
COPY ./PaymentService ./PaymentService
WORKDIR "/PaymentService"
RUN dotnet publish "PaymentService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PaymentService.dll"]