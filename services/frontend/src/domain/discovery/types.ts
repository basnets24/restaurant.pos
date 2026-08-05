/** One discovery card. A listing is a *location*, not a restaurant - ordering is scoped to
 *  restaurant + location, so a chain appears once per discoverable location. */
export interface DiscoveryListingDto {
  restaurantId: string;
  restaurantName: string;
  cuisine: string | null;
  locationId: string;
  locationName: string;
  address: string | null;
  /** Seeded, not computed from the diner's position - there is no geolocation. */
  distanceMiles: number | null;
  estimatedPickupMinutes: number | null;
}

export type DiscoverySort = "Recommended" | "Distance" | "Pickup";

export interface DiscoveryQuery {
  q?: string;
  cuisine?: string;
  sort?: DiscoverySort;
}
