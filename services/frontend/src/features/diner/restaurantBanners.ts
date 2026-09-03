import dosaLeaf from "@/assets/restaurants/dosa-leaf.jpg";
import piscoYBrasa from "@/assets/restaurants/pisco-y-brasa.jpg";
import goldenDragonKitchen from "@/assets/restaurants/golden-dragon-kitchen.jpg";
import momoAndBurger from "@/assets/restaurants/momo-and-burger.jpg";
import sakuraRamenHouse from "@/assets/restaurants/sakura-ramen-house.jpg";
import seoulGarden from "@/assets/restaurants/seoul-garden.jpg";

/** Demo-only cover photos, keyed by restaurant ID. Not backed by any API field - just a
 *  handful of Unsplash shots for the seeded demo tenants. Falls back to no banner. */
const RESTAURANT_BANNERS: Record<string, string> = {
  "dosa-leaf": dosaLeaf,
  "pisco-y-brasa": piscoYBrasa,
  "golden-dragon-kitchen": goldenDragonKitchen,
  "momo-and-burger": momoAndBurger,
  "sakura-ramen-house": sakuraRamenHouse,
  "seoul-garden": seoulGarden,
};

export function getRestaurantBanner(restaurantId: string): string | undefined {
  return RESTAURANT_BANNERS[restaurantId];
}
