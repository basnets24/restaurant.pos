import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {type ReactNode, useState } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
    const [client] = useState(() => new QueryClient());
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
