// src/bootstrapIdentity.ts
declare global {
    interface Window { IDENTITY_SERVICE_URL: string }
}
window.IDENTITY_SERVICE_URL = import.meta.env.VITE_IDENTITY_URL as string;
