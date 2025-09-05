import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Users } from "@/domain/identity/service";
import type { Paged, UserListItemDto } from "@/domain/identity/types";
import { IdentityKeys } from "@/domain/identity/keys";


export interface UseUsersParams { username?: string; role?: string; page?: number; pageSize?: number }


export function useUsers(params: UseUsersParams) {
    return useQuery<Paged<UserListItemDto>>({
        queryKey: IdentityKeys.users(params),
        queryFn: () => Users.list(params),
        placeholderData: keepPreviousData,
    });
}


export function useAllRoles() {
    return useQuery<string[]>({
        queryKey: IdentityKeys.roles.all,
        queryFn: Users.roles.all,
    });
}
