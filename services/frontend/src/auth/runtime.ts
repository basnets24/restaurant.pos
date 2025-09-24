let _getToken: (() => string | undefined) | undefined;
let _getTenant: (() => { restaurantId?: string; locationId?: string } | undefined) | undefined;

export function bindAuthAccessors(fns: {
    getToken?: () => string | undefined;
    getTenant?: () => { restaurantId?: string; locationId?: string } | undefined;
}) {
    _getToken = fns.getToken;
    _getTenant = fns.getTenant;
}

export function tokenAccessor(): string | undefined {
    try { return _getToken?.(); } catch { return undefined; }
}

export function tenantAccessor(): { restaurantId?: string; locationId?: string } | undefined {
    try { return _getTenant?.(); } catch { return undefined; }
}
