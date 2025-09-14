export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserDto {
  id: string;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  roles: string[];
}

export interface UserListItemDto {
  id: string;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  emailConfirmed: boolean;
  lockedOut: boolean;
  roles: string[];
}

export interface UserDetailDto {
  id: string;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
  lockedOut: boolean;
  accessFailedCount: number;
  twoFactorEnabled: boolean;
  lockoutEnd: string | null; // ISO string
  restaurantId: string;
  locationId: string;
  roles: string[];
}

export interface AddRolesDto {
  roles: string[];
}

export interface UserUpdateDto {
  userName?: string | null;
  email?: string | null;
  accessCode?: string | null; // 4–6 digits as string
  displayName?: string | null;
  lockoutEnabled?: boolean | null;
  lockoutEnd?: string | null; // ISO
  twoFactorEnabled?: boolean | null;

  restaurantId: string;
  locationId: string;
}

