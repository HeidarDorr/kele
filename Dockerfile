# Liara's source builder has a short build deadline and uses the final image
# directly. This synthetic-UAT image deliberately keeps the already-installed
# workspace dependencies instead of spending several minutes producing three
# separate production dependency trees. Production images remain isolated in
# Dockerfile.release.

ARG NODE_VERSION=24.18.0

FROM node:${NODE_VERSION}-bookworm-slim

ENV CI=true \
    NODE_ENV=production \
    KELE_DEPLOYMENT_TIER=uat \
    KELE_ADMIN_BASE_PATH=/admin \
    KELE_SUITE_ROOT=/workspace/apps \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--conditions=production \
    PORT=3000

WORKDIR /workspace

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.18.0 \
    && chown node:node /workspace

USER node

COPY --chown=node:node . .

RUN cd deploy/liara \
    && pnpm install --frozen-lockfile --prod \
    && cd /workspace \
    && ln -s deploy/liara/node_modules node_modules \
    && mkdir -p node_modules/@kele \
    && ln -s ../../../packages/api-contract node_modules/@kele/api-contract \
    && ln -s ../../../packages/config node_modules/@kele/config \
    && ln -s ../../../packages/design-system node_modules/@kele/design-system \
    && ln -s ../../node_modules apps/api/node_modules \
    && ln -s ../../node_modules apps/storefront/node_modules \
    && ln -s ../../node_modules apps/admin/node_modules \
    && node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma \
    && node_modules/.bin/tsc -p packages/config/tsconfig.build.json \
    && node_modules/.bin/tsc -p packages/design-system/tsconfig.build.json \
    && node_modules/.bin/tsc -p apps/api/tsconfig.build.json \
    && cd apps/storefront \
    && ../../node_modules/.bin/next build \
    && cd ../admin \
    && ../../node_modules/.bin/next build

ARG RELEASE_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="KELE Synthetic Liara UAT Suite" \
      org.opencontainers.image.version=${RELEASE_VERSION} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.created=${BUILD_DATE} \
      ir.kele.deployment.boundary="synthetic-uat" \
      ir.kele.build.profile="liara-time-bounded"

EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=90s --retries=3 \
  CMD ["/usr/local/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? '3000') + '/__kele/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["apps/api/dist/platform/liara-uat-runtime.js"]
