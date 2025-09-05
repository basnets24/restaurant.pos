export const API_BASE =
    (window as any)?.POS_SHELL_CONFIG?.apiBase ??
    import.meta.env.VITE_API_BASE ??
    "http://localhost:7288";

export const getToken = () =>
    (window as any)?.POS_SHELL_AUTH?.getToken?.() ??
    localStorage.getItem("token") ??
    "";
