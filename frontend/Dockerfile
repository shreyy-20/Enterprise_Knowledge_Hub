# ============================================================
# Enterprise Knowledge Hub — Frontend Dockerfile
# Multi-stage build: Node build → Nginx static serving
# ============================================================

# --------------- Stage 1: Build ---------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with clean install
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# --------------- Stage 2: Serve ---------------
FROM nginx:alpine AS runtime

LABEL maintainer="Enterprise Knowledge Hub Team"
LABEL description="Frontend web application for Enterprise Knowledge Hub"
LABEL version="1.0.0"

# Remove default nginx config and static files
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
