import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { IdentityAPI } from "./api";
import type { Paged, UserDto, UserListItemDto, UserDetailDto, AddRolesDto, UserUpdateDto } from "./types";

export const Users = {
  me: async (): Promise<UserDto> => {
    const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
    return (await http.get(IdentityAPI.users.me, { headers: { Authorization: `Bearer ${token}` } })).data;
  },

  list: async (
    q?: { username?: string; role?: string; page?: number; pageSize?: number }
  ): Promise<Paged<UserListItemDto>> => {
    const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
    return (await http.get(IdentityAPI.users.list(q), { headers: { Authorization: `Bearer ${token}` } })).data;
  },

  get: async (id: string): Promise<UserDetailDto> => {
    const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
    return (await http.get(IdentityAPI.users.byId(id), { headers: { Authorization: `Bearer ${token}` } })).data;
  },

  update: async (id: string, dto: UserUpdateDto): Promise<void> => {
    const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
    await http.put(IdentityAPI.users.byId(id), dto, { headers: { Authorization: `Bearer ${token}` } });
  },

  disable: async (id: string): Promise<void> => {
    const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
    await http.delete(IdentityAPI.users.byId(id), { headers: { Authorization: `Bearer ${token}` } });
  },

  roles: {
    list: async (id: string): Promise<string[]> => {
      const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
      return (await http.get(IdentityAPI.users.roles.list(id), { headers: { Authorization: `Bearer ${token}` } })).data;
    },
    add: async (id: string, dto: AddRolesDto): Promise<void> => {
      const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
      await http.post(IdentityAPI.users.roles.add(id), dto, { headers: { Authorization: `Bearer ${token}` } });
    },
    remove: async (id: string, role: string): Promise<void> => {
      const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
      await http.delete(IdentityAPI.users.roles.remove(id, role), { headers: { Authorization: `Bearer ${token}` } });
    },
    all: async (): Promise<string[]> => {
      const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
      return (await http.get(IdentityAPI.users.roles.all, { headers: { Authorization: `Bearer ${token}` } })).data;
    },
  },
};
