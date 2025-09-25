# Package Publishing Guide

Detailed manual steps for publishing internal NuGet packages after CI removal.

## Packages
- Common.Library
- Tenant.Domain
- Messaging.Contracts

## Quick Flow
1. Update version in csproj `<Version>`.
2. Pack: `dotnet pack <path-to-csproj> -c Release -o packages`.
3. Push: `dotnet nuget push packages/<ID>.<VERSION>.nupkg --source https://nuget.pkg.github.com/$GH_OWNER/index.json --api-key $GH_PAT --skip-duplicate`.
4. Consume: `dotnet add <service .csproj> package <ID> --version <VERSION>`.

## Verification (Optional)
```bash
unzip -l packages/<ID>.<VERSION>.nupkg | grep -i dll
```

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| New types not found | Clear cache: `dotnet nuget locals all --clear`, bump version, republish |
| Wrong version restoring | Check `obj/project.assets.json` for resolved version |
| Package push denied | Ensure PAT has `write:packages` |

