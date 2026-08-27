const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/**
 * Display-only. Every figure a diner is charged on comes from the server's pricing estimate -
 * this is for menu prices and the running cart subtotal, never for anything authoritative.
 */
export const money = (value: number): string => formatter.format(value);
