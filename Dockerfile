FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies in a single layer
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

# Copy dependency files first for better caching
COPY package.json package-lock.json ./

# Install dependencies and rebuild native modules
RUN npm install --ignore-scripts --legacy-peer-deps && \
    npm rebuild canvas sharp && \
    npm run postinstall

# Copy source code
COPY . .

# Build application
RUN npx prisma generate && \
    npm run build && \
    npm prune --omit=dev --omit=optional --legacy-peer-deps

# Runtime stage
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
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

# Set production environment
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1 \
    NODE_PATH=/app/node_modules

# Copy built application from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create non-root user and set permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxt && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nuxt:nodejs /app

USER nuxt

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
