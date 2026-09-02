import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Receipt, Search, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCuisines, useDiscoveryListings } from "@/domain/discovery";
import type { DiscoveryListingDto, DiscoverySort } from "@/domain/discovery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DinerHeader } from "../components/DinerHeader";
import { DinerNotificationBell } from "../components/DinerNotificationBell";
import { DinerAccountMenu } from "../components/DinerAccountMenu";
import { useDinerAuth } from "../auth/DinerAuthProvider";

const ALL_CUISINES = "__all__";

const SORT_LABELS: Record<DiscoverySort, string> = {
  Recommended: "Recommended",
  Distance: "Distance: Nearest",
  Pickup: "Pickup: Fastest",
};

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useDinerAuth();
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string>(ALL_CUISINES);
  const [sort, setSort] = useState<DiscoverySort>("Recommended");

  // Debounced so the request fires once typing pauses, not on every keystroke - the input
  // itself still updates immediately via `search`/`setSearch`.
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      cuisine: cuisine === ALL_CUISINES ? undefined : cuisine,
      sort,
    }),
    [debouncedSearch, cuisine, sort]
  );

  const { data: listings, isPending, isError, refetch } = useDiscoveryListings(query);
  const { data: cuisines } = useCuisines();

  return (
    <>
      <DinerHeader
        center={
          // md (768px, iPad portrait) is too narrow for this row to share space with the
          // brand mark on the left and the bell/orders/avatar cluster on the right - none of
          // those yield width, so the search input was the only thing left to collapse. Below
          // lg it moves to its own full-width row under the header instead (see below).
          <div className="hidden lg:flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants or cuisines"
                className="pl-9"
                aria-label="Search restaurants"
              />
            </div>
            <CuisineSelect value={cuisine} onChange={setCuisine} cuisines={cuisines} />
          </div>
        }
        right={
          // Only once there is a session, because signed out there is nothing to show and no
          // sign-in form to send them to - the diner signs in at checkout, not up front.
          isSignedIn && (
            <>
              <DinerNotificationBell />
              <Button variant="ghost" className="gap-1.5" onClick={() => navigate("/order/orders")}>
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Your orders</span>
              </Button>
              <DinerAccountMenu />
            </>
          )
        }
      />

      <main className="mx-auto max-w-[1160px] px-4 sm:px-8 py-6">
        {/* Search on its own full-width row below lg (covers iPad portrait, 768px) — the
            header has no room to share with it once the brand mark and account controls are
            in place. See the matching lg breakpoint on the header's center slot above. */}
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants"
              className="pl-9"
              aria-label="Search restaurants"
            />
          </div>
          <CuisineSelect value={cuisine} onChange={setCuisine} cuisines={cuisines} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="text-sm text-muted-foreground">
            {isPending
              ? "Finding restaurants near you…"
              : `Order ahead for pickup: ${listings?.length ?? 0} ${
                  listings?.length === 1 ? "restaurant" : "restaurants"
                } near you`}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={(v) => setSort(v as DiscoverySort)}>
              <SelectTrigger className="w-[190px]" aria-label="Sort restaurants">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as DiscoverySort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <EmptyState
            title="Couldn't load restaurants"
            hint="Something went wrong reaching the server."
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                Try again
              </button>
            }
          />
        ) : isPending ? (
          <div className="grid gap-5 grid-cols-1 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[132px] rounded-lg border border-border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            title="No restaurants match your search"
            hint="Try a different name, or clear the cuisine filter."
          />
        ) : (
          <div className="grid gap-5 grid-cols-1 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={`${listing.restaurantId}:${listing.locationId}`}
                listing={listing}
                onSelect={() =>
                  navigate(`/order/${listing.restaurantId}/${listing.locationId}`)
                }
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function CuisineSelect({
  value,
  onChange,
  cuisines,
}: {
  value: string;
  onChange: (v: string) => void;
  cuisines: string[] | undefined;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px] shrink-0" aria-label="Filter by cuisine">
        <SelectValue placeholder="All cuisines" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CUISINES}>All cuisines</SelectItem>
        {(cuisines ?? []).map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ListingCard({
  listing,
  onSelect,
}: {
  listing: DiscoveryListingDto;
  onSelect: () => void;
}) {
  return (
    <Card
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer overflow-hidden p-0 gap-0 transition-[transform,box-shadow] duration-[120ms] ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="px-4 py-[18px]">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[17px] font-semibold leading-snug truncate">
            {listing.restaurantName}
          </h2>
          {listing.cuisine && (
            <Badge variant="secondary" className="shrink-0">
              {listing.cuisine}
            </Badge>
          )}
        </div>

        <p className="mt-0.5 text-[13px] text-muted-foreground truncate">
          {listing.address ?? listing.locationName}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {listing.estimatedPickupMinutes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-numeric">{listing.estimatedPickupMinutes} min</span>
            </span>
          )}
          {listing.distanceMiles != null && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-numeric">{listing.distanceMiles} mi</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
