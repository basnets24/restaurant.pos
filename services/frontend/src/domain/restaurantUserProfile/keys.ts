export const onboardingKey = ["onboarding"] as const;

export const userProfileKey = ["user", "profile"] as const;

export const membershipsKey = (userId?: string) =>
  ["memberships", userId ?? "me"] as const;

export const restaurantsKey = (filter?: string) =>
  ["restaurants", filter ?? "all"] as const;

