# Production Dockerfile for PeerBond Orchestration API
FROM node:18-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force

# Development stage for building
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production

# Copy built application
COPY --from=development --chown=nodejs:nodejs /app/dist ./dist
COPY --from=development --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=development --chown=nodejs:nodejs /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs && chown nodejs:nodejs logs
RUN mkdir -p tmp && chown nodejs:nodejs tmp

# Copy additional files needed at runtime
COPY --chown=nodejs:nodejs prisma ./prisma
COPY --chown=nodejs:nodejs .env.example ./.env.example

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3001 9464

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]