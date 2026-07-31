# Publishing shared packages

This project versions and shares the libraries under `shared/` as private GitHub Packages. This doc covers the one-time setup, the normal publish path (push to `dev`/`main`), and the manual fallback.

```
repo-root/
  NuGet.config
  shared/
    Common.Library/Common.Library.csproj
    Messaging.Contracts/Messaging.Contracts.csproj
    tenant.domain/Tenant.Domain.csproj
  services/
    order/
    ...
```

## 1. One-time setup

Each library must be packable and versioned in its `.csproj`:

```xml
<PropertyGroup>
  <PackageId>Common.Library</PackageId>
  <Version>1.0.0</Version> <!-- bump per release -->
  <IsPackable>true</IsPackable>
  <Authors>your-gh-username</Authors>
  <RepositoryUrl>https://github.com/<YOUR_USER>/<YOUR_REPO></RepositoryUrl>
  <RepositoryType>git</RepositoryType>
  <PackageLicenseExpression>MIT</PackageLicenseExpression>
  <Description>Shared utilities for Restaurant POS.</Description>
  <PublishRepositoryUrl>true</PublishRepositoryUrl>
  <EnablePackageValidation>true</EnablePackageValidation>
  <TargetFramework>net8.0</TargetFramework>
  <PackageReadmeFile>README.md</PackageReadmeFile>
</PropertyGroup>

<!-- Ensure the project-level README is packed (avoids grabbing the root README) -->
<ItemGroup>
  <None Remove="**/README.md" />
  <None Include="$(MSBuildThisFileDirectory)README.md" Pack="true" PackagePath="README.md" />
</ItemGroup>
```

You'll also want a GitHub PAT with `write:packages` (which includes `read`) on your own machine, for the manual/local paths below — CI uses `secrets.GITHUB_TOKEN` and doesn't need this.

```bash
export GH_USER="<your-github-username>"
export GH_PAT="ghp_************************"

dotnet nuget list source
dotnet nuget update source github \
  --username "$GH_USER" \
  --password "$GH_PAT" \
  --store-password-in-clear-text
```

The root `NuGet.config` already points at the GitHub Packages feed for this repo.

## 2. Normal path: push to `dev` or `main`

Each library has its own workflow — `publish-common-library.yml`, `publish-messaging-contracts.yml`, `publish-tenant-domain.yml` — that packs and pushes to GitHub Packages whenever a push to `dev` or `main` touches that library's folder. All three can also be run manually (`gh workflow run publish-common-library.yml`, etc.) from any branch.

```
dotnet pack <project>.csproj --configuration Release -o Packages
dotnet nuget push Packages/*.nupkg --source ... --api-key ... --skip-duplicate
```

> **None of these workflows bump the version for you.** `--skip-duplicate` means: if you push without bumping `<Version>` in the `.csproj` first, the workflow runs, packs the same version that's already on the feed, and silently no-ops instead of publishing — no error, no new package. **Bump `<Version>` in the `.csproj` yourself, in the same commit, before pushing.**

## 3. Manual path (local pack + push)

Useful for a dry run, or if CI is down.

```bash
# from the repo root — pack to ./packages
dotnet pack shared/Common.Library/Common.Library.csproj -c Release -o ./packages
dotnet pack shared/Messaging.Contracts/Messaging.Contracts.csproj -c Release -o ./packages
dotnet pack shared/tenant.domain/Tenant.Domain.csproj -c Release -o ./packages
```

The package version comes from each `.csproj`'s `<Version>`; the repository link comes from `<RepositoryUrl>`.

```bash
# push everything just packed
dotnet nuget push ./packages/*.nupkg \
  --source github \
  --api-key "$GH_PAT" \
  --skip-duplicate

# or push a single package
dotnet nuget push ./packages/Common.Library.1.0.0.nupkg --source github --api-key "$GH_PAT" --skip-duplicate
```

`--skip-duplicate` lets you re-run safely — if that version already exists you'll skip with a warning rather than fail. A `409 Conflict` without it means: bump `<Version>`, repack, push again.

## 4. Consuming the packages from a service

```bash
dotnet add package Common.Library --version 1.0.*
dotnet add package Messaging.Contracts --version 1.0.*
dotnet add package Tenant.Domain --version 1.0.*

dotnet restore   # uses the root NuGet.config + your saved credentials
```

## 5. Restoring in a Docker build

Pass the token as a build secret rather than baking it into a layer:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY NuGet.config ./
RUN --mount=type=secret,id=GH_TOKEN \
    dotnet nuget add source "https://nuget.pkg.github.com/${GH_USER}/index.json" \
      --name github --username "${GH_USER}" \
      --password "$(cat /run/secrets/GH_TOKEN)" --store-password-in-clear-text

COPY services/order/src/OrderService/OrderService.csproj services/order/src/OrderService/
RUN dotnet restore services/order/src/OrderService/OrderService.csproj

COPY . .
RUN dotnet publish services/order/src/OrderService/OrderService.csproj -c Release -o /app
```

```bash
DOCKER_BUILDKIT=1 docker build \
  --secret id=GH_TOKEN,env=GH_PAT \
  --build-arg GH_USER="$GH_USER" \
  -t order-service:dev -f services/order/Dockerfile .
```

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `401`/`403` on push or restore | Token scope is wrong, or the source URL's owner doesn't match. Source must be `https://nuget.pkg.github.com/<YOUR_USERNAME>/index.json`. |
| `409 Conflict` on push | That version already exists — bump `<Version>` and repack. |
| CI ran but nothing new appeared on the feed | You forgot to bump `<Version>` before pushing — see §2. This is silent, not an error. |
| Restore behaves strangely / stale packages | `dotnet nuget locals all --clear`, then `dotnet restore` again. |
| Want reproducible restores | Consider `RestorePackagesWithLockFile=true` and commit `packages.lock.json` per service. |

## Why bother with this at all

- **Versioned building blocks** — services pin a specific version; upgrading is an explicit, reviewable change, not something that happens silently on the next build.
- **Faster Docker builds** — the restore layer keys on package versions, so it caches well.
- **Independent deploys/rollbacks** — changing one shared library only requires bumping and redeploying the services that actually need the new version.
