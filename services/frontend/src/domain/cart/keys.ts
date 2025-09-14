export const cartKeys = {
    all: ['cart'] as const,
    byId: (id: string) => [...cartKeys.all, 'by-id', id] as const,
};
