### This project uses private GitHub Packages to version and share libraries under ./shared/.

  repo-root/
  NuGet.config
  shared/
    common.library/Common.Library.csproj
    messaging.contracts/Messaging.Contracts.csproj
    tenant.domain/Tenant.Domain.csproj
  services/
    order/
    ...

## 0. Prereqs (one-time)

Each library you want to publish must be packable and versioned in its .csproj:

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
  <!-- Optional: include symbols/source if desired -->
  <!-- <None Include="**/*.pdb" Pack="true" PackagePath="lib\\net8.0" /> -->
</ItemGroup>
```


A GitHub PAT on your machine with scopes: write:packages (includes read).
If consuming from private repos in other places, add repo.
```bash
export GH_USER="<your-github-username>"
export GH_PAT="ghp_************************"
```

Root NuGet.config already points to your feed. Verify & (if needed) add credentials locally:
```bash
dotnet nuget list source
dotnet nuget update source github \
  --username "$GH_USER" \
  --password "$GH_PAT" \
  --store-password-in-clear-text
```

##  1. Tag-driven publish (CI)

Preferred: push a tag and let CI pack + publish.

```bash
# Examples
git tag common.library-v1.0.14
git push origin common.library-v1.0.14

git tag messaging.contracts-v1.0.1
git push origin messaging.contracts-v1.0.1

git tag tenant.domain-v1.0.1
git push origin tenant.domain-v1.0.1
```

CI will run:
```
dotnet pack <project>.csproj -c Release -p:PackageVersion=<version>
dotnet nuget push <package>.nupkg --skip-duplicate
```

Manual workflow_dispatch also supported (provide version input).

##  2. Pack a library (local manual)

Pack to the repo-level `./packages` folder (created if needed):

```bash
# Any of these from the repo root
dotnet pack shared/common.library/Common.Library.csproj -c Release -o ./packages
dotnet pack shared/messaging.contracts/Messaging.Contracts.csproj -c Release -o ./packages
dotnet pack shared/tenant.domain/Tenant.Domain.csproj -c Release -o ./packages
```

The package version comes from each `.csproj` `<Version>`.
The repository link comes from `<RepositoryUrl>`.

## 3. Publish to GitHub Packages (manual backup)

```bash
# Push all recently packed packages
dotnet nuget push ./packages/*.nupkg \
  --source github \
  --api-key "$GH_PAT" \
  --skip-duplicate

# Or push a single package
dotnet nuget push ./packages/Common.Library.1.0.0.nupkg --source github --api-key "$GH_PAT" --skip-duplicate
```

--skip-duplicate lets you re-run safely; if a version exists you’ll skip with a warning.
If you see 409 Conflict, bump <Version> in that library’s .csproj, repack, and push again.


## 4. Consume packages from services
```bash
# add a package by ID and version
dotnet add package Common.Library --version 1.0.*
dotnet add package Messaging.Contracts --version 1.0.*
dotnet add package Tenant.Domain --version 1.0.*

# restore (uses the root NuGet.config + your saved creds)
dotnet restore
```

## 5. Docker restore
When building service images that restore from your private feed, pass the token as a build secret
#Example
```bash
# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY NuGet.config ./
RUN --mount=type=secret,id=GH_TOKEN \
    dotnet nuget add source "https://nuget.pkg.github.com/${GH_USER}/index.json" \
      --name github --username "${GH_USER}" \
      --password "$(cat /run/secrets/GH_TOKEN)" --store-password-in-clear-text

COPY services/order/OrderService.csproj services/order/
RUN dotnet restore services/order/OrderService.csproj

COPY . .
RUN dotnet publish services/order/OrderService.csproj -c Release -o /app
```

# Build
```bash
DOCKER_BUILDKIT=1 docker build \
  --secret id=GH_TOKEN,env=GH_PAT \
  --build-arg GH_USER="$GH_USER" \
  -t order-service:dev -f services/order/Dockerfile .
```

## 6. Troubleshooting

401/403 on push/restore: token scopes wrong or source URL owner mismatch.

Source must be https://nuget.pkg.github.com/<YOUR_USERNAME>/index.json.

409 on push: version already exists → bump <Version> and repack.

Restore weirdness: dotnet nuget locals all --clear then dotnet restore.

Deterministic builds: consider RestorePackagesWithLockFile=true to commit packages.lock.json per service.




# Note: Why we do this (brief)
Versioned building blocks: services pin stable versions; upgrades are explicit.
Faster Docker builds: restore layer keyed on package versions → great caching.
Independent deploys/rollbacks: change one lib → only bump services that need it.