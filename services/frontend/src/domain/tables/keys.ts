// TanStack Query keys for tables

export const tableKeys = {
    all: ["tables"] as const,
    list: (section?: string | null) =>
      section ? ([...tableKeys.all, "list", { section }] as const) : ([...tableKeys.all, "list"] as const),
    detail: (id: string) => [...tableKeys.all, "detail", { id }] as const
  };
  