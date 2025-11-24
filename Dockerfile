# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Generate package-lock.json if missing, then use npm ci for reproducible builds
RUN if [ ! -f package-lock.json ]; then \
      echo "⚠️  package-lock.json not found, generating..."; \
      npm install --package-lock-only; \
    fi && \
    npm ci --omit=dev && \
    npm cache clean --force

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads logs && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
