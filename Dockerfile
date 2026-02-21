# =============================================================================
# Build stage
# =============================================================================
FROM node:20-alpine AS builder

# Build arguments for flexibility
# Build must include devDependencies (Nuxt modules), runtime stays production
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Database URL for Prisma generate (only used at build time, not runtime)
# This is a dummy URL - the real DATABASE_URL is injected at runtime
ARG DATABASE_URL="mysql://build:build@localhost:3306/build"
ENV DATABASE_URL=${DATABASE_URL}

# Set working directory
WORKDIR /app

# Add metadata labels
LABEL maintainer="your-email@example.com"
LABEL description="Personal Investment Diary System - Nuxt 3 Application"

# Install OpenSSL for bcryptjs compatibility
RUN apk add --no-cache openssl

# =============================================================================
# Layer 1: Dependencies (least frequently changed)
# =============================================================================
# Copy package files with lock file for deterministic builds
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
# Skip prepare script (husky/git hooks) since they aren't needed in Docker build
# Use ci for deterministic builds, then run postinstall separately
# Install all deps for build (devDependencies required by Nuxt modules)
# package-lock.json is currently out of sync; use npm install for resilience in Docker
RUN npm install --ignore-scripts && \
    npm run postinstall && \
    npm cache clean --force

# =============================================================================
# Layer 2: Prisma Schema (changes less frequently than source code)
# =============================================================================
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# =============================================================================
# Layer 3: Application Source (most frequently changed)
# =============================================================================
# Copy remaining application files LAST to maximize cache hits for previous layers
COPY . .

# Disable Nuxt telemetry during build
ENV NUXT_TELEMETRY_DISABLED=1

# Prepare Nuxt and build application
RUN npm run build

# Prune devDependencies after build to reduce final image size
RUN npm prune --omit=dev

# =============================================================================
# Production stage
# =============================================================================
FROM node:20-alpine AS runner

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    HOST="0.0.0.0" \
    NITRO_PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1

# Set working directory
WORKDIR /app

# Add metadata labels
LABEL maintainer="your-email@example.com"
LABEL description="Personal Investment Diary System - Production Runtime"

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    curl \
    # Install tini for proper signal handling and zombie process reaping
    tini

# Create non-root user and group with specific IDs for consistency
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nuxt

# Copy entrypoint script
COPY --chown=nuxt:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application artifacts from builder
COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output

# Copy only Prisma-related files for migrations (minimal dependencies)
# Nuxt 3 .output is self-contained, but we need Prisma CLI for migrations
COPY --from=builder --chown=nuxt:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nuxt:nodejs /app/node_modules/prisma ./node_modules/prisma

# Create runtime directories
RUN mkdir -p /app/.output/server && \
    chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose application port
EXPOSE 3000

# Health check with proper timeout and start period
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as init process and run entrypoint script
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", ".output/server/index.mjs"]
