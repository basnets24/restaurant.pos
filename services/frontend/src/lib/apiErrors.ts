// Shared domain error types for the identity-service client cluster
// (domain/employee, domain/tenant, domain/restaurantUserProfile) - previously
// each of those api.ts files redeclared identical UnauthorizedError/ApiError
// classes independently.

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
