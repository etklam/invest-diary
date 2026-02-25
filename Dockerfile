# Single-stage build to avoid compiling canvas twice
FROM node:20-bookworm-slim

# Install runtime dependencies for canvas (prebuilt binaries will be used)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libpangomm-1.4-1v5 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (canvas will use prebuilt binaries)
RUN npm ci --ignore-scripts

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Nuxt application
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxt

# Set ownership
RUN chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Set the host to 0.0.0.0 for container compatibility
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["node", ".output/server/index.mjs"]
