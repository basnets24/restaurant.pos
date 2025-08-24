import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type MenuItem = {
    id: string; name: string; price: number;
    description?: string; imageUrl?: string;
    isAvailable: boolean; category?: string;
};

export function useMenu() {
    return useQuery({
        queryKey: ["menu"],
        queryFn: async () => (await api.get<MenuItem[]>("/menu")).data,
    });
}
