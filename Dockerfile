# =============================================================================
# Build stage
# =============================================================================
FROM node:20-alpine AS builder

# Build arguments for flexibility
# Build must include devDependencies (Nuxt modules), runtime stays production
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Set working directory
WORKDIR /app

# Add metadata labels
LABEL maintainer="your-email@example.com"
LABEL description="Personal Investment Diary System - Nuxt 3 Application"

# Install OpenSSL for bcryptjs compatibility
RUN apk add --no-cache openssl

# Copy package files with lock file for deterministic builds
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
# Skip prepare script (husky) since git hooks aren't needed in Docker
# Install all deps for build (devDependencies required by Nuxt modules)
RUN npm install --ignore-scripts && \
    npm run postinstall && \
    npm cache clean --force

# Copy Prisma schema early for better layer caching
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy remaining application files
COPY . .

# Disable Nuxt telemetry during build
ENV NUXT_TELEMETRY_DISABLED=1

# Prepare Nuxt and build application
RUN npm run build

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
COPY --from=builder --chown=nuxt:nodejs /app/package.json ./package.json
# Copy node_modules then prune to production-only dependencies
COPY --from=builder --chown=nuxt:nodejs /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder --chown=nuxt:nodejs /app/prisma ./prisma

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
