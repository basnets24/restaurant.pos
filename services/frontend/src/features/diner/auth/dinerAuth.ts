import { ENV } from "@/config/env";

/**
 * Diner authentication against the `spoontab-diner` OIDC client.
 *
 * This is the one place in the app that uses the resource-owner password grant, and it is a
 * deliberate, narrow exception: the diner surface signs in inline rather than bouncing through
 * a hosted login page, because sending someone mid-order to a redirect flow loses the cart.
 * Staff keep Authorization Code + PKCE via `AuthProvider` - do not reach for this there.
 *
 * The client is public (no secret), so nothing here is confidential; the security boundary is
 * the `diner` scope, which only this client may request.
 */

const STORAGE_KEY = "spoontab.diner.auth";
const CLIENT_ID = "spoontab-diner";
// No `roles` scope: diners and staff share the same user store, so a staff member's real
// credentials also work through this client - only `sub`/`email` are ever read from the
// resulting token (see decodeClaims below), so there's no reason to let their real staff
// role claims ride along.
const SCOPE = "openid profile diner payment.read offline_access";

export interface DinerSession {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. Compared against the clock before every call, so a session that expired while
   *  the tab sat open is refreshed rather than producing a confusing 401 at checkout. */
  expiresAt: number;
  userId: string;
  email: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function decodeClaims(accessToken: string): { sub: string; email: string } {
  const [, payload] = accessToken.split(".");
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice(((base64.length + 3) % 4));
  const claims = JSON.parse(atob(padded)) as Record<string, string>;
  return {
    sub: claims.sub,
    // A diner token carries no tenant claims at all, so `email` is the only human-readable
    // thing on it - and even that is absent unless the profile scope resolved.
    email: claims.email ?? claims.preferred_username ?? claims.name ?? "",
  };
}

function toSession(token: TokenResponse, fallbackEmail: string): DinerSession {
  const { sub, email } = decodeClaims(token.access_token);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    // 30s of slack so a token cannot expire between the check and the request landing.
    expiresAt: Date.now() + (token.expires_in - 30) * 1000,
    userId: sub,
    email: email || fallbackEmail,
  };
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${ENV.IDENTITY_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });

  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    // Duende returns "invalid_grant" for both a wrong password and an unknown account, and
    // that conflation is intentional - keep it rather than trying to be more helpful.
    throw new Error(
      problem?.error === "invalid_grant"
        ? "That email and password don't match an account."
        : "Could not sign in. Please try again."
    );
  }

  return (await res.json()) as TokenResponse;
}

export const DinerAuth = {
  load(): DinerSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DinerSession) : null;
    } catch {
      return null;
    }
  },

  save(session: DinerSession | null) {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing - the session still works for this tab.
    }
  },

  async signIn(email: string, password: string): Promise<DinerSession> {
    const token = await postToken({ grant_type: "password", username: email, password, scope: SCOPE });
    return toSession(token, email);
  },

  async register(email: string, password: string, displayName?: string): Promise<void> {
    const res = await fetch(`${ENV.IDENTITY_URL}/public/diner/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const problem = await res.json().catch(() => null);
      throw new Error(problem?.message ?? "Could not create that account.");
    }
  },

  async refresh(session: DinerSession): Promise<DinerSession | null> {
    if (!session.refreshToken) return null;
    try {
      const token = await postToken({ grant_type: "refresh_token", refresh_token: session.refreshToken });
      return toSession(token, session.email);
    } catch {
      // A dead refresh token means the session is over, not that the app is broken.
      return null;
    }
  },
};
