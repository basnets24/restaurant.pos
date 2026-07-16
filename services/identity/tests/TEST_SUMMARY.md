# Identity Service - Test Suite

## Overview

Unit test suite for the Identity Service covering service-layer business logic and input validation.

**Total Test Coverage: 24 tests, all passing**

---

## Test Projects Structure

```
tests/
└── IdentityService.Tests/                    (Unit Tests - Mocked Dependencies)
    ├── Features/Identity/
    │   └── UserServiceTests.cs               (14 tests - Service business logic)
    └── Features/Tenancy/
        └── ValidationAttributesTests.cs      (10 tests - Input validation & security)
```

---

## Tests by Category

### ✅ SERVICE BUSINESS LOGIC

**File:** `UserServiceTests.cs`

Tests `UserService` with `UserManager`/`RoleManager` mocked via Moq (mocked `IUserStore`/`IRoleStore`,
relying on their virtual methods) and `IUserRepository` mocked directly.

| Test | Coverage |
|------|----------|
| `GetMeAsync_WithValidUser_ReturnsUserDto` | Current-user profile retrieval |
| `GetMeAsync_UserNotFound_ReturnsNull` | Missing user handling |
| `GetByIdAsync_UserNotFound_ReturnsNull` | Not found handling |
| `GetByIdAsync_UserExists_ReturnsUserDetailDto` | Detail retrieval |
| `ListUsersAsync_WithQuery_ReturnsPagedResults` | Pagination |
| `ListUsersAsync_FilterByRole_CallsRepositoryWithRole` | Role filtering |
| `ListUsersAsync_SearchByUsername_CallsRepositoryWithSearchTerm` | Search functionality |
| `DisableAsync_UserNotFound_ThrowsKeyNotFoundException` | Not found handling |
| `DisableAsync_UserIsAdmin_ThrowsInvalidOperationException` | Admin lockout protection |
| `DisableAsync_ValidNonAdminUser_LocksOutUser` | Lockout behavior |
| `AddRolesAsync_RoleDoesNotExist_ThrowsArgumentException` | Role validation |
| `AddRolesAsync_ValidRoles_AddsToUser` | Role assignment |
| `RemoveRoleAsync_RoleDoesNotExist_ThrowsArgumentException` | Role validation |
| `GetAllRolesAsync_ReturnsOrderedRoleNames` | Role listing |

---

### ✅ INPUT VALIDATION & SECURITY

**File:** `ValidationAttributesTests.cs`

Tests custom validators that protect against injection attacks and DoS.

| Test | Validator | Protection |
|------|-----------|-----------|
| `ValidTimeZoneAttribute_WithValidTimeZone_ReturnsTrue` | ValidTimeZoneAttribute | Accepts valid IDs |
| `ValidTimeZoneAttribute_WithInvalidTimeZone_ReturnsFalse` | ValidTimeZoneAttribute | Rejects invalid IDs |
| `ValidTimeZoneAttribute_WithNull_ReturnsTrue` | ValidTimeZoneAttribute | Optional field handling |
| `ValidTimeZoneAttribute_WithEmptyString_ReturnsTrue` | ValidTimeZoneAttribute | Optional field handling |
| `SafeNameAttribute_BlocksSQLInjectionPatterns` | SafeNameAttribute | SQL injection (keyword + tautology + HTML-comment patterns) |
| `SafeNameAttribute_AllowsNormalBusinessText` | SafeNameAttribute | Legit data allowed |
| `SafeNameAttribute_WithNull_ReturnsTrue` | SafeNameAttribute | Optional field handling |
| `ReasonableLengthAttribute_BlocksExcessiveLength` | ReasonableLengthAttribute | DoS prevention |
| `ReasonableLengthAttribute_AllowsReasonableLength` | ReasonableLengthAttribute | Normal input allowed |
| `ReasonableLengthAttribute_WithNull_ReturnsTrue` | ReasonableLengthAttribute | Optional field handling |

---

## Test Execution

### Run All Tests
```bash
dotnet test services/identity/tests/IdentityService.Tests/
```

### Run Specific Test Class
```bash
dotnet test --filter "ClassName=UserServiceTests"
```

---

## Future Test Additions

1. **Integration tests** (real database, e.g. Testcontainers-based Postgres)
   - Multi-tenant isolation (users can't see data from restaurants they don't belong to)
   - Role-based authorization boundaries (per-restaurant admin enforcement)
   - Role assignment isolation (roles in one restaurant don't leak into another)

2. **Controller Tests** (HTTP layer)
   - Endpoint authentication
   - Error response mapping
   - Claims extraction from JWT

3. **E2E Tests** (Full system)
   - Complete user flows
   - OAuth/OpenID Connect
   - Multi-restaurant workflows
