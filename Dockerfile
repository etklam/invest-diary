FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Install only the native tools required by Prisma/sharp postinstall.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching.
COPY package.json package-lock.json ./

# Install dependencies and rebuild native modules.
RUN npm install --ignore-scripts --legacy-peer-deps && \
    npm rebuild sharp && \
    npm run postinstall

# Build stage
FROM deps AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build application.
RUN npx prisma generate && \
    npm run build

# Production dependencies stage
FROM deps AS prod-deps

WORKDIR /app

RUN npm prune --omit=dev --omit=optional --legacy-peer-deps

# Runtime stage
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Set production environment
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1 \
    NODE_PATH=/app/node_modules

# Copy built application from builder
COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
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

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:3000/api/health',(res)=>{let body='';res.setEncoding('utf8');res.on('data',(chunk)=>body+=chunk);res.on('end',()=>{try{const payload=JSON.parse(body);process.exit(res.statusCode===200&&payload.status==='healthy'?0:1)}catch{process.exit(1)}})});req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1)})"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
