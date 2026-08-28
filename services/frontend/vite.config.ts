import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // silent-renew.html is a second, minimal entry point for oidc.ts's silent_redirect_uri
      // (see silentRenew.ts) - it must build to its own small chunk, not get pulled into the
      // main app bundle that automaticSilentRenew's hidden iframe would otherwise have to load.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        silentRenew: fileURLToPath(new URL('./silent-renew.html', import.meta.url)),
      },
    },
  },
})
