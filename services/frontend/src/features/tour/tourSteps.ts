// Guided tooltip walkthrough shown to demo_admin sessions (see auth/demoSession.ts).
// Pure data — no JSX — so editing copy/order doesn't touch hook or rendering logic.

export type TourStep = {
    id: string;
    route: string;
    target: string; // CSS selector, resolved fresh each time the step becomes current
    title: string;
    body: string;
    // "event" advances on a window CustomEvent named `eventName` — for a step
    // whose real completion is asynchronous and happens behind a modal (e.g.
    // Stripe payment actually succeeding), where a mere click on the target
    // only *starts* the action rather than finishing it.
    // "condition" advances as soon as `advanceCheck` turns true (polled) —
    // for a step whose completion isn't a click at all, e.g. an item landing
    // in the cart via quantity steppers as much as the card's own tap target.
    advanceOn: "next-click" | "target-click" | "route-change" | "event" | "condition";
    // Required when advanceOn is "event" — see PAYMENT_SUCCEEDED_EVENT.
    eventName?: string;
    // Required when advanceOn is "condition".
    advanceCheck?: () => boolean;
    // By default the tooltip hides entirely while any modal is open (see
    // useGuidedTour's modalOpen) - set true for a step whose own target
    // lives behind a modal it opens (the payment dialog), where the guidance
    // is most useful exactly while that modal is up. Safe only because the
    // modal in question (CheckoutPaymentDialog) knows to ignore pointerdowns
    // that land on the tour's own portal - see its onPointerDownOutside.
    visibleDuringModal?: boolean;
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
    // Id of a step to fall back to if this step's own target existed (so the
    // step was reachable) and then disappears again — e.g. the visitor
    // removes the only cart item after "menu-grid" auto-advanced past it,
    // unmounting fire-btn. Without this the tooltip just vanishes with no
    // way back short of restarting the tour.
    regressIfTargetLost?: string;
};

// Dispatched by MenuPage once Stripe actually confirms the payment (not on
// the Pay button click, which merely opens the dialog) — see the "pay" step
// below and useGuidedTour's "event" handling.
export const PAYMENT_SUCCEEDED_EVENT = "spoontab:tour:payment-succeeded";

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
        // Anchored to [data-table] - folds the old separate "here's your
        // floor plan" and "click any table" steps into one, since there's
        // nothing to explain about the floor plan that isn't obvious once
        // you're asked to click a table on it. advanceOn is "route-change",
        // not "target-click": a visitor who clicks an occupied table first
        // (just looking), then closes that dialog and picks a different one
        // to actually seat, shouldn't have this step silently complete on
        // that first, exploratory click - route-change only fires once a
        // click actually lands them on a table's menu page (via Seat
        // Party/Open Order), which is the point where this step is truly
        // done. No separate step narrates the TableActionDialog itself -
        // its own Seat Party/Open Order labeling carries it.
        target: "[data-table]",
        title: "Your live floor plan",
        body: "Tables update in real time. Click any table to seat a party or open its order.",
        advanceOn: "route-change",
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
        body: "Tap any menu item to add it to the order. We'll move on as soon as something's in the cart.",
        advanceOn: "condition",
        // Fire to Kitchen's own section only renders once the cart is
        // non-empty (see OrderSideBar) - reusing its target's existence as
        // the "an item was added" signal rather than tracking cart state
        // separately here.
        advanceCheck: () => document.querySelector('[data-tour="fire-btn"]') != null,
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
        // fire-btn only exists while the cart has items - if the visitor
        // removes the item they just added (undoing menu-grid's own
        // advance) before firing, fall back to menu-grid rather than
        // leaving this step's tooltip pointing at nothing.
        regressIfTargetLost: "menu-grid",
    },
    {
        id: "pay",
        route: "/pos/table/:tableId/menu",
        // Advances only once Stripe actually confirms the payment, not on the
        // click that opens the dialog - clicking Pay used to jump the tour
        // straight to "done", whose card then rendered on top of/behind the
        // Stripe dialog (a sibling portal, not part of its Radix Dialog tree)
        // and could register as an "outside click" that closed the payment
        // dialog on the visitor. Now stays visible through the dialog
        // instead (visibleDuringModal below) since its test-card guidance
        // matters most right here - safe because CheckoutPaymentDialog's
        // onPointerDownOutside ignores clicks on the tour's own portal.
        target: "[data-tour=\"pay-btn\"]",
        title: "Take payment",
        body: "Once fired, payment opens here as an embedded Stripe form. Use test card 4242 4242 4242 4242, any future expiry, any CVC, and any ZIP to see a real payment complete.",
        advanceOn: "event",
        eventName: PAYMENT_SUCCEEDED_EVENT,
        visibleDuringModal: true,
    },
    {
        id: "done",
        // Reached only after the payment dialog's own success card is
        // dismissed - MenuPage navigates back to the dashboard once a paid
        // order's dialog closes, so the tour ends there rather than on the
        // now-empty table screen.
        route: "/home",
        target: "",
        title: "That's the core flow",
        body: "Management Hub covers analytics, staff, and inventory. Floor & Orders handles tables and payments.",
        advanceOn: "next-click",
    },
];

export const TOUR_DISMISSED_KEY = "spoontab_tour_dismissed";
