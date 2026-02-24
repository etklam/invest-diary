# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Build arguments
ARG DATABASE_URL="mysql://build:build@localhost:3306/build"
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

# Install build dependencies
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

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --ignore-scripts && \
    npm run postinstall && \
    npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:20-alpine AS builder

ARG DATABASE_URL="mysql://build:build@localhost:3306/build"
ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=development
ENV NUXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install build dependencies
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

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune devDependencies
RUN npm prune --omit=dev

# =============================================================================
# Stage 3: Runner (Production)
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

# Copy built application
COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output

# Copy Prisma files for migrations
COPY --from=builder --chown=nuxt:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy package.json
COPY --from=builder --chown=nuxt:nodejs /app/package.json ./package.json

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
