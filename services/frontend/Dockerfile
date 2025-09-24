# Multi-stage build for Vite + React app

# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (leverage Docker layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* bun.lockb* ./
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --fund=false; \
    else npm install --prefer-offline --no-audit --fund=false; fi

# Copy source
COPY . .

# Build static assets
RUN npm run build

# 2) Runtime stage (serve static files)
FROM nginx:1.27-alpine AS runtime

# Copy compiled app
COPY --from=builder /app/dist /usr/share/nginx/html
COPY public/config.js /usr/share/nginx/html/config.js

# Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

# Default command: serve static files
CMD ["nginx", "-g", "daemon off;"]
