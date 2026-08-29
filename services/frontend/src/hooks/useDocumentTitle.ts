import { useEffect } from "react";

/** Sets document.title for the lifetime of the calling route component. Pass the full title. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
