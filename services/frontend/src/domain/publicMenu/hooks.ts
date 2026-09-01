import { useQuery } from "@tanstack/react-query";
import { PublicMenu } from "./service";
import { PublicMenuKeys } from "./keys";
import type { PublicMenuDto } from "./types";

export function usePublicMenu(restaurantId: string, locationId: string) {
  return useQuery<PublicMenuDto>({
    queryKey: PublicMenuKeys.menu(restaurantId, locationId),
    queryFn: () => PublicMenu.get(restaurantId, locationId),
    enabled: Boolean(restaurantId && locationId),
    // A bad restaurant/location slug 404s immediately - retrying just delays the
    // "couldn't load this menu" message behind the default backoff for no benefit.
    retry: false,
  });
}
