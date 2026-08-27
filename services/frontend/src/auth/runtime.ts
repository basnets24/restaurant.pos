let _getToken: (() => string | undefined) | undefined;

export function bindAuthAccessors(fns: { getToken?: () => string | undefined }) {
    if (fns.getToken !== undefined) _getToken = fns.getToken;
}

export function tokenAccessor(): string | undefined {
    try { return _getToken?.(); } catch { return undefined; }
}
