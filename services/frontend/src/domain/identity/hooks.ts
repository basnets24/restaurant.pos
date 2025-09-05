import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "./service";
import type { Paged, UserListItemDto, UserDetailDto, UserUpdateDto, AddRolesDto } from "./types";
import { IdentityKeys } from "./keys";

export interface UseUsersParams {
  username?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

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

export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => Users.disable(id),
    onSuccess: () => {
      // Invalidate all users lists regardless of params
      void qc.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export function useUserDetails(id?: string) {
  return useQuery<UserDetailDto>({
    queryKey: ["user", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("missing id");
      return Users.get(id);
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UserUpdateDto }) => Users.update(id, dto),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["user", vars.id] });
      void qc.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export function useUserRoles(id?: string) {
  return useQuery<string[]>({
    queryKey: ["user", id, "roles"],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("missing id");
      return Users.roles.list(id);
    },
  });
}

export function useAddUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: AddRolesDto }) => Users.roles.add(id, dto),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["user", vars.id, "roles"] });
      void qc.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}

export function useRemoveUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => Users.roles.remove(id, role),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["user", vars.id, "roles"] });
      void qc.invalidateQueries({ queryKey: ["users"], exact: false });
    },
  });
}
