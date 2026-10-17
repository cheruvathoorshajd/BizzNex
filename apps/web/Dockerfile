# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /repo

# every workspace manifest, so `npm ci` can verify the lockfile
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace @bizznex/web --workspace @bizznex/shared --include-workspace-root=false

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
# design documents the app links to (case study, brand); see designDocs() in vite.config.ts
COPY bizznex-case-study.html image.png ./
COPY design-style-guides ./design-style-guides

# API base URL is baked in at build time
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w @bizznex/shared && npm run build -w @bizznex/web

# ---------- runtime ----------
FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
