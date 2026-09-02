import { useEffect, useState } from "react";

/** Returns `value`, but delayed until it has stopped changing for `delayMs`. Used to keep an
 *  input responsive while debouncing whatever it drives (a search request, a filter). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
