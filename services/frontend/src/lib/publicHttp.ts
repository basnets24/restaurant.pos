import axios from "axios";

/**
 * Axios instance for the platform's anonymous endpoints (diner discovery, public menus).
 *
 * Deliberately has **no interceptors**, unlike `lib/http.ts`. That one attaches whatever
 * bearer token is in scope and then infers `x-restaurant-id`/`x-location-id` from its claims -
 * correct for staff calls, wrong here twice over:
 *
 *  - a signed-in staff member browsing the diner surface would leak their access token to
 *    endpoints that neither need nor check it, and
 *  - the inferred tenant headers would silently scope a cross-tenant discovery query to
 *    whichever restaurant that user happens to work at.
 *
 * Diner-facing calls that *do* need a tenant must pass `x-restaurant-id`/`x-location-id`
 * explicitly, from the listing the diner picked - never from a token.
 */
export const publicHttp = axios.create();
