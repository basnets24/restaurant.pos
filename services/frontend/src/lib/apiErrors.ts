// Shared domain error types + axios error-mapping for the identity-service
// client cluster (domain/employee, domain/tenant, domain/restaurantUserProfile)
// - previously each of those api.ts files redeclared identical
// UnauthorizedError/ApiError classes and isAxiosError/pickMessage/mergeHeaders/
// toApiError helpers independently.

import type { AxiosError } from "axios";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function isAxiosError<T = unknown>(e: unknown): e is AxiosError<T> {
  return typeof e === "object" && e !== null && (e as { isAxiosError?: unknown }).isAxiosError === true;
}

export function pickMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  if (typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.errors)) return d.errors.join(", ");
    if (d.title) return String(d.title);
  }
  return undefined;
}

export function mergeHeaders(...parts: Array<Record<string, string> | undefined>): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}

/** Maps an unknown thrown value (typically an axios error) to a domain error type. */
export function toApiError(e: unknown): Error {
  if (isAxiosError(e)) {
    const status = e.response?.status;
    if (status === 401) return new UnauthorizedError();
    const msg = pickMessage(e.response?.data) ?? e.message;
    return new ApiError(msg, status, e.response?.data);
  }
  return e instanceof Error ? e : new Error(String(e));
}

/** `.message` off a caught `unknown`, for `Error`/`DOMException`/axios errors alike. */
export function errorMessage(e: unknown): string | undefined {
  return e instanceof Error || e instanceof DOMException ? e.message : undefined;
}

/** `.name` off a caught `unknown` (e.g. to detect `AbortError`). */
export function errorName(e: unknown): string | undefined {
  return e instanceof Error || e instanceof DOMException ? e.name : undefined;
}

/** HTTP status off a caught `unknown` — checks both `ApiError.status` and a raw axios `.response.status`. */
export function errorStatus(e: unknown): number | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const status = (e as { status?: unknown }).status
    ?? (e as { response?: { status?: unknown } }).response?.status;
  return typeof status === "number" ? status : undefined;
}
