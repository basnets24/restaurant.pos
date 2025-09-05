import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Users } from "../services/identity.users";
import type { Paged, UserListItemDto } from "../services/types";


export interface UseUsersParams { username?: string; role?: string; page?: number; pageSize?: number }


export function useUsers(params: UseUsersParams) {
    return useQuery<Paged<UserListItemDto>>({
        queryKey: ["users", params],
        queryFn: () => Users.list(params),
        placeholderData: keepPreviousData,
    });
}


export function useAllRoles() {
    return useQuery<string[]>({
        queryKey: ["roles", "all"],
        queryFn: Users.roles.all,
    });
}