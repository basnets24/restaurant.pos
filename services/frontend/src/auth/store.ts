import { useSyncExternalStore } from "react";

export type Grants = {
  roles?: string[];
  scopes?: string[];
};

export type AuthUser = {
  sub?: string;
  name?: string;
  roles?: string[];
};

type State = {
  user?: AuthUser | null;
  grants?: Grants | null;
};

type Store = {
  getState: () => State;
  setState: (partial: Partial<State>) => void;
  subscribe: (listener: () => void) => () => void;
};

const listeners = new Set<() => void>();
let state: State = { user: null, grants: { roles: [], scopes: [] } };

const store: Store = {
  getState: () => state,
  setState: (partial) => {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Selector-based subscription API similar to Zustand
export function useAuth<T = State>(selector?: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () =>
    selector ? selector(store.getState()) : (store.getState() as unknown as T)
  );
}

// Attach helpers like Zustand-style
useAuth.getState = store.getState;
useAuth.setState = store.setState;
useAuth.setGrants = (grants: Grants | null | undefined) => store.setState({ grants: grants ?? null });
useAuth.setUser = (user: AuthUser | null | undefined) => store.setState({ user: user ?? null });

declare module "react" {
  // no-op augmentation to silence isolatedModules complaints when importing only types
}

