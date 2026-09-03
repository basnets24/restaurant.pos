# Workflows

| Workflow | Runs when | What it does |
|---|---|---|
| Backend CI | Push or PR touching a backend service | Builds only the changed service(s), no tests |
| Frontend CI | Push or PR touching the frontend | Builds the frontend and smoke-tests its Docker image |
| Build and Push Images | Push to main | Builds and pushes all five Docker images to GHCR |
| Deploy to VM | After images finish building on main | Pulls new images onto the production server and restarts it |
| Publish shared packages (x3) | Push to dev or main touching that package's folder | Packs and publishes Common Library, Messaging Contracts, or Tenant Domain to GitHub Packages |

Every workflow can also be started by hand from the Actions tab.

## Deploy to VM

It connects to the production server over SSH, copies over the compose file, Caddy config, and other deploy files, then writes a fresh environment file with the database and secret values, pulls the new images, and brings the stack up. Caddy gets a full restart rather than a reload, since a config file replaced by copy leaves it reading a stale file otherwise.

## Worth knowing

No workflow runs automated tests, CI only builds. Publishing never bumps the package version, so a push without a version bump silently does nothing. Deploy only starts after the image build finishes, so it's always deploying the latest completed build.
