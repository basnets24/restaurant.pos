import crypto from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { IDENTITY_URL, OIDC_CLIENT_ID, OIDC_REDIRECT_URI } from "../env";

const BASE_SCOPES = "openid profile roles tenancy";

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Mints an access token scoped for a specific API by driving IdentityServer's
 * authorization_code + PKCE flow directly over HTTP. This mirrors what the
 * app's own getApiToken() (src/auth/getApiToken.ts) does via
 * oidc.signinSilent() from inside the browser: given a valid IdentityServer
 * session cookie (captured by e2e/auth.setup.ts) and prompt=none, /connect/authorize
 * issues a code with no interactive login — the same silent-renew mechanism
 * the "frontend" client already relies on for scoped tokens, just invoked
 * from test code instead of a hidden iframe. `request` is a plain HTTP client
 * (not a browser), so CORS — which only a browser enforces — doesn't apply here.
 */
export async function getScopedAccessToken(request: APIRequestContext, apiScopes: string[]): Promise<string> {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));
  const nonce = base64url(crypto.randomBytes(16));
  const scope = Array.from(new Set([...BASE_SCOPES.split(" "), ...apiScopes])).join(" ");

  const authorizeUrl =
    `${IDENTITY_URL}/connect/authorize?` +
    new URLSearchParams({
      client_id: OIDC_CLIENT_ID,
      redirect_uri: OIDC_REDIRECT_URI,
      response_type: "code",
      scope,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "none",
    }).toString();

  const authorizeResponse = await request.get(authorizeUrl, { maxRedirects: 0 });
  const location = authorizeResponse.headers()["location"];
  if (authorizeResponse.status() < 300 || authorizeResponse.status() >= 400 || !location) {
    throw new Error(
      `Expected a redirect with an authorization code from /connect/authorize, got ${authorizeResponse.status()}. ` +
        `This usually means the IdentityServer session cookie is missing/expired — re-run auth.setup.ts (the "setup" project).`
    );
  }

  const redirectUrl = new URL(location, IDENTITY_URL);
  const code = redirectUrl.searchParams.get("code");
  const returnedState = redirectUrl.searchParams.get("state");
  const error = redirectUrl.searchParams.get("error");
  if (error || !code) {
    throw new Error(`IdentityServer silent authorize failed: ${error ?? "no code returned"} (${location})`);
  }
  if (returnedState !== state) {
    throw new Error("OIDC state mismatch on silent authorize response.");
  }

  const tokenResponse = await request.post(`${IDENTITY_URL}/connect/token`, {
    form: {
      grant_type: "authorization_code",
      code,
      redirect_uri: OIDC_REDIRECT_URI,
      client_id: OIDC_CLIENT_ID,
      code_verifier: verifier,
    },
  });
  if (!tokenResponse.ok()) {
    throw new Error(`Token exchange failed: ${tokenResponse.status()} ${await tokenResponse.text()}`);
  }
  const body = (await tokenResponse.json()) as { access_token: string };
  return body.access_token;
}
