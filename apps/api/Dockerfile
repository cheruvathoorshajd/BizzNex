# ---------- build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo

# every workspace manifest, so `npm ci` can verify the lockfile
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace @bizznex/api --workspace @bizznex/shared --include-workspace-root=false

# sources
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build -w @bizznex/shared \
 && npm run prisma:generate -w @bizznex/api \
 && npm run build -w @bizznex/api \
 && npm prune --omit=dev --workspace @bizznex/api --workspace @bizznex/shared --include-workspace-root=false

# ---------- runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /repo
ENV NODE_ENV=production

# root owns the code (read-only to the app); only the Prisma engine cache under node_modules
# is written at runtime, so that tree belongs to the unprivileged `node` user
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma

WORKDIR /repo/apps/api
# never run as root
USER node
EXPOSE 3001

# Apply any pending migrations (never drops data), then boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
