# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS build

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:${PATH}

WORKDIR /workspace

RUN npm install --global pnpm@11.18.0

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate

ARG NEXT_PUBLIC_API_BASE_URL=https://api.ci.invalid/api/v1
ARG API_BASE_URL=https://api.ci.invalid/api/v1
ARG STOREFRONT_ORIGIN=https://storefront.ci.invalid

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    API_BASE_URL=${API_BASE_URL} \
    STOREFRONT_ORIGIN=${STOREFRONT_ORIGIN}

RUN pnpm --filter @kele/config build \
    && pnpm --filter @kele/design-system build \
    && pnpm --filter @kele/api build \
    && pnpm --filter @kele/storefront build \
    && pnpm --filter @kele/admin build
RUN pnpm --filter @kele/api --prod deploy --legacy /artifacts/api \
    && pnpm --filter @kele/storefront --prod deploy --legacy /artifacts/storefront \
    && pnpm --filter @kele/admin --prod deploy --legacy /artifacts/admin
RUN cd /artifacts/api \
    && node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma

FROM node:${NODE_VERSION}-bookworm-slim AS api-runtime

ARG RELEASE_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="KELE API" \
      org.opencontainers.image.version=${RELEASE_VERSION} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.created=${BUILD_DATE}

ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps --conditions=production" \
    PORT=3001

WORKDIR /app

COPY --chown=node:node --from=build /artifacts/api ./
COPY --chown=node:node --from=build /workspace/apps/api/dist ./dist
COPY --chown=node:node --from=build /workspace/apps/api/prisma ./prisma

USER node
EXPOSE 3001
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3001') + '/api/v1/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "dist/main.js"]

FROM node:${NODE_VERSION}-bookworm-slim AS storefront-runtime

ARG RELEASE_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="KELE Storefront" \
      org.opencontainers.image.version=${RELEASE_VERSION} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.created=${BUILD_DATE}

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--conditions=production \
    PORT=3000

WORKDIR /app

COPY --chown=node:node --from=build /artifacts/storefront ./
COPY --chown=node:node --from=build /workspace/apps/storefront/.next ./.next
COPY --chown=node:node --from=build /workspace/apps/storefront/public ./public

USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3000') + '/icon.svg').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

FROM node:${NODE_VERSION}-bookworm-slim AS admin-runtime

ARG RELEASE_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="KELE Administration" \
      org.opencontainers.image.version=${RELEASE_VERSION} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.created=${BUILD_DATE}

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--conditions=production \
    PORT=3002

WORKDIR /app

COPY --chown=node:node --from=build /artifacts/admin ./
COPY --chown=node:node --from=build /workspace/apps/admin/.next ./.next

USER node
EXPOSE 3002
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3002') + '/icon.svg').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
