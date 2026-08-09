# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS build

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:${PATH}

WORKDIR /workspace

RUN npm install --global pnpm@11.18.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/verify-runtime.mjs ./scripts/verify-runtime.mjs
COPY apps/api/package.json ./apps/api/package.json
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/design-system/package.json ./packages/design-system/package.json
COPY packages/testing/package.json ./packages/testing/package.json

RUN pnpm install --frozen-lockfile
RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY . .

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
RUN mkdir -p /artifacts/admin-next \
    && cp -a apps/admin/.next/. /artifacts/admin-next/
RUN KELE_ADMIN_BASE_PATH=/admin pnpm --filter @kele/admin build \
    && mkdir -p /artifacts/liara-admin-next \
    && cp -a apps/admin/.next/. /artifacts/liara-admin-next/
RUN pnpm --filter @kele/api --prod deploy --legacy /artifacts/api \
    && pnpm --filter @kele/storefront --prod deploy --legacy /artifacts/storefront \
    && pnpm --filter @kele/admin --prod deploy --legacy /artifacts/admin
RUN cd /artifacts/api \
    && node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:fccdbb0a547c14e23fcf4ce8ad62ca5d43b4faae8d22cd292f490fef9946c96e AS api-runtime

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

COPY --chown=65532:65532 --from=build /usr/local/bin/node /nodejs/bin/node
COPY --chown=65532:65532 --from=build /artifacts/api ./
COPY --chown=65532:65532 --from=build /workspace/apps/api/dist ./dist
COPY --chown=65532:65532 --from=build /workspace/apps/api/prisma ./prisma

USER 65532:65532
EXPOSE 3001
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3001') + '/api/v1/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["dist/main.js"]

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:fccdbb0a547c14e23fcf4ce8ad62ca5d43b4faae8d22cd292f490fef9946c96e AS storefront-runtime

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

COPY --chown=65532:65532 --from=build /usr/local/bin/node /nodejs/bin/node
COPY --chown=65532:65532 --from=build /artifacts/storefront ./
COPY --chown=65532:65532 --from=build /workspace/apps/storefront/.next ./.next
COPY --chown=65532:65532 --from=build /workspace/apps/storefront/public ./public

USER 65532:65532
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3000') + '/icon.svg').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:fccdbb0a547c14e23fcf4ce8ad62ca5d43b4faae8d22cd292f490fef9946c96e AS admin-runtime

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

COPY --chown=65532:65532 --from=build /usr/local/bin/node /nodejs/bin/node
COPY --chown=65532:65532 --from=build /artifacts/admin ./
COPY --chown=65532:65532 --from=build /artifacts/admin-next ./.next

USER 65532:65532
EXPOSE 3002
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3002') + '/icon.svg').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:fccdbb0a547c14e23fcf4ce8ad62ca5d43b4faae8d22cd292f490fef9946c96e AS liara-uat-runtime

ARG RELEASE_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="KELE Synthetic Liara UAT Suite" \
      org.opencontainers.image.version=${RELEASE_VERSION} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.created=${BUILD_DATE} \
      ir.kele.deployment.boundary="synthetic-uat"

ENV NODE_ENV=production \
    KELE_DEPLOYMENT_TIER=uat \
    KELE_ADMIN_BASE_PATH=/admin \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--conditions=production \
    PORT=3000

WORKDIR /app

COPY --chown=65532:65532 --from=build /usr/local/bin/node /nodejs/bin/node
COPY --chown=65532:65532 --from=build /artifacts/api ./api
COPY --chown=65532:65532 --from=build /workspace/apps/api/dist ./api/dist
COPY --chown=65532:65532 --from=build /workspace/apps/api/prisma ./api/prisma
COPY --chown=65532:65532 --from=build /artifacts/storefront ./storefront
COPY --chown=65532:65532 --from=build /workspace/apps/storefront/.next ./storefront/.next
COPY --chown=65532:65532 --from=build /workspace/apps/storefront/public ./storefront/public
COPY --chown=65532:65532 --from=build /artifacts/admin ./admin
COPY --chown=65532:65532 --from=build /artifacts/liara-admin-next ./admin/.next

USER 65532:65532
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=90s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3000') + '/__kele/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["api/dist/platform/liara-uat-runtime.js"]
