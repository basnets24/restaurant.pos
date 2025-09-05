import { http } from "@/lib/http";
import { IdentityAPI } from "./api";
import type { Paged, UserDto, UserListItemDto, UserDetailDto, AddRolesDto, UserUpdateDto } from "./types";

export const Users = {
  me: async (): Promise<UserDto> => (await http.get(IdentityAPI.users.me)).data,

  list: async (
    q?: { username?: string; role?: string; page?: number; pageSize?: number }
  ): Promise<Paged<UserListItemDto>> => (await http.get(IdentityAPI.users.list(q))).data,

  get: async (id: string): Promise<UserDetailDto> =>
    (await http.get(IdentityAPI.users.byId(id))).data,

  update: async (id: string, dto: UserUpdateDto): Promise<void> => {
    await http.put(IdentityAPI.users.byId(id), dto);
  },

  disable: async (id: string): Promise<void> => {
    await http.delete(IdentityAPI.users.byId(id));
  },

  roles: {
    list: async (id: string): Promise<string[]> =>
      (await http.get(IdentityAPI.users.roles.list(id))).data,
    add: async (id: string, dto: AddRolesDto): Promise<void> => {
      await http.post(IdentityAPI.users.roles.add(id), dto);
    },
    remove: async (id: string, role: string): Promise<void> => {
      await http.delete(IdentityAPI.users.roles.remove(id, role));
    },
    all: async (): Promise<string[]> =>
      (await http.get(IdentityAPI.users.roles.all)).data,
  },
};

