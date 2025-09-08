export type GuidString = string;

export type OnboardRestaurantReq = {
  name: string;
  locationName?: string | null;
  timeZoneId?: string | null;
};

export type OnboardRestaurantRes = {
  restaurantId: string;
  locationId: string;
};

export type JoinRestaurantReq = {
  code: string;
};

export type Restaurant = {
  id: string;
  name: string;
  slug?: string | null;
  isActive: boolean;
  createdUtc: string; // ISO string from server
};

export type Location = {
  id: string;
  restaurantId: string;
  name: string;
  timeZoneId?: string | null;
  isActive: boolean;
  createdUtc: string; // ISO string
};

export type RestaurantMembership = {
  id: string;
  userId: GuidString; // UserId is a real GUID, represented as a string in JSON
  restaurantId: string;
  defaultLocationId?: string | null;
  createdUtc: string; // ISO string
};

export type UserProfile = {
  id: GuidString;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  roles: string[];
};

export type OnboardingStatus = {
  hasMembership: boolean;
  isAdmin: boolean;
  restaurantId: string | null;
  locationId: string | null;
};

export type MyJoinCodeRes = {
  restaurantId: string;
  slug: string | null;
  joinUrl: string | null;
} | null;
