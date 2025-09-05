import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "./router";


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});

export function AppProviders() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppRouter />
        </QueryClientProvider>
    );
}
