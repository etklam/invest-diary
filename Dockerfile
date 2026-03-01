FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Canvas and Prisma runtime dependencies are needed at build time to install/load native modules.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libpangomm-1.4-1v5 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Avoid failing on root "prepare: husky" script, then explicitly rebuild native deps.
RUN npm ci --ignore-scripts
RUN npm rebuild canvas sharp
RUN npm run postinstall

COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    netcat-openbsd \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libpangomm-1.4-1v5 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxt && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nuxt:nodejs /app

USER nuxt

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
