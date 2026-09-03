import type { CSSProperties } from "react";

/** Sets the --len custom property a connector-draw path reads its dash length
 * from (see index.css) — typed as CSSProperties since React's style type
 * doesn't otherwise allow arbitrary custom-property keys. Split out of
 * DiagramField.tsx since a component file may only export components (fast
 * refresh). */
export const dashVar = (len: number): CSSProperties => ({ "--len": len } as CSSProperties);
