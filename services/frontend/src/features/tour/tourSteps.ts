// Guided tooltip walkthrough shown to demo_admin sessions (see auth/demoSession.ts).
// Pure data — no JSX — so editing copy/order doesn't touch hook or rendering logic.

export type TourStep = {
    id: string;
    route: string;
    target: string; // CSS selector, resolved fresh each time the step becomes current
    title: string;
    body: string;
    advanceOn: "next-click" | "target-click" | "route-change";
    // Every step with a `target` is already held until it exists in the DOM
    // (useGuidedTour's default). Set this only when a step needs a stronger
    // condition than mere existence — e.g. Fire/Pay don't exist until the
    // cart has items, which "exists" alone wouldn't capture since they're
    // conditionally rendered based on that, not just slow to mount.
    waitFor?: () => boolean;
    // For a target-click step whose action may already have happened before
    // the tour got there (e.g. a table with an order fired in an earlier
    // session) — checked once when the step becomes current; true advances
    // past it immediately instead of waiting on a click that can't happen.
    skipIf?: () => boolean;
};

export const TOUR_STEPS: TourStep[] = [
    {
        id: "welcome",
        route: "/home",
        // Anchored to the tile itself (not a separate dashboard-orientation
        // step first) - shortens the tour by folding the welcome framing
        // into the same step that sends the user to the floor plan, instead
        // of spending a whole step on "click Next" before anything happens.
        target: "[data-tour=\"floor-orders-tile\"]",
        title: "Welcome to Spoontab",
        body: "This is your dashboard. Click Floor & Orders to open your floor plan.",
        advanceOn: "route-change",
    },
    {
        id: "floor-plan",
        route: "/pos/tables",
        // Anchored to (and advances on a click anywhere in) [data-table] -
        // folds the old separate "here's your floor plan" and "click any
        // table" steps into one, since there's nothing to explain about the
        // floor plan that isn't obvious once you're asked to click a table
        // on it.
        target: "[data-table]",
        title: "Your live floor plan",
        body: "Tables update in real time. Click any table to seat a party or open its order.",
        advanceOn: "target-click",
    },
    {
        id: "menu-grid",
        route: "/pos/table/:tableId/menu",
        // Anchored to an actual item card (the first one in the grid, via
        // MenuItemCard's own ".menu-item-card" class - already used as a
        // stable hook by e2e/pos-ordering.spec.ts), not the search bar
        // above it - the point of this step is "here's a menu item, tap
        // it", and spotlighting the search bar instead said nothing about
        // that. Stays advanceOn: "next-click" (not "target-click" like the
        // floor plan's "any table") since the actual add-to-cart control is
        // a button *inside* the card, not the card itself, so "click
        // anywhere on the card" wouldn't reliably mean "added an item".
        target: ".menu-item-card",
        title: "Build the order",
        body: "Add at least one item to continue. Tap any menu item to add it to the order.",
        advanceOn: "next-click",
    },
    {
        id: "fire",
        route: "/pos/table/:tableId/menu",
        target: "[data-tour=\"fire-btn\"]",
        title: "Fire to Kitchen",
        body: "This sends the order to the kitchen and reserves inventory. Payment comes later.",
        advanceOn: "target-click",
        // "Fired ✓" only ever renders for an order that was *already* fired
        // before this step was reached - the button also reads disabled
        // during this step's own "Firing…" pending state, which must NOT
        // be treated the same way (that's this step's own action in flight,
        // not evidence it already happened).
        skipIf: () => /Fired/.test(document.querySelector("[data-tour=\"fire-btn\"]")?.textContent ?? ""),
    },
    {
        id: "pay",
        route: "/pos/table/:tableId/menu",
        target: "[data-tour=\"pay-btn\"]",
        title: "Take payment",
        body: "Once fired, payment opens here as an embedded Stripe form.",
        advanceOn: "target-click",
    },
    {
        id: "done",
        route: "/pos/table/:tableId/menu",
        target: "",
        title: "That's the core flow",
        body: "Current Orders and the Menu tab are worth exploring too. Have fun looking around!",
        advanceOn: "next-click",
    },
];

export const TOUR_DISMISSED_KEY = "spoontab_tour_dismissed";
