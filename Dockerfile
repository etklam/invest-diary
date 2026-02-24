# =============================================================================
# Stage 1: Builder (fast build, fewer stages)
# =============================================================================
FROM node:20-alpine AS builder

ENV NODE_ENV=production \
    NUXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install build dependencies (once)
RUN apk add --no-cache \
    openssl \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci

# Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build && npm prune --omit=dev

# =============================================================================
# Stage 2: Runner (Production)
# =============================================================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOST="0.0.0.0" \
    NITRO_PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    curl \
    tini \
    cairo \
    pango \
    libjpeg-turbo \
    giflib \
    librsvg

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nuxt

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy built application and runtime deps
COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxt:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nuxt:nodejs /app/prisma ./prisma

# Ensure proper permissions
RUN chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as init process
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", ".output/server/index.mjs"]
