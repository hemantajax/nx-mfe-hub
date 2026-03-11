# 12 — Deployment & DevOps

> **TL;DR:** Use multi-stage Docker builds for small images (~100MB vs ~1GB). Run as non-root user. Implement graceful shutdown (finish in-flight requests, close DB connections). Use health probes for Kubernetes. CI/CD pipeline: lint → test → build → scan → deploy. Use PM2 for non-containerized deployments.

---

## 1. Multi-Stage Dockerfile (Production-Grade)

```dockerfile
# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ── Stage 2: Production ────────────────────────────────────
FROM node:22-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Security headers
ENV NODE_ENV=production
ENV PORT=3000

# Don't run as root
USER appuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "dist/server.js"]
```

### Size Comparison

| Approach | Image Size |
|----------|-----------|
| `node:22` (full) | ~1.1 GB |
| `node:22-slim` | ~250 MB |
| `node:22-alpine` + multi-stage | ~100 MB |
| `node:22-alpine` + multi-stage + pruned | ~80 MB |

---

## 2. Docker Compose for Local Development

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder   # Use build stage for dev (has devDependencies)
    ports:
      - "3000:3000"
      - "9229:9229"     # Debug port
    volumes:
      - ./src:/app/src  # Hot reload
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mongodb://mongo:27017/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=dev-secret-at-least-32-characters-long
      - JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars
    command: npm run dev
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo-express:
    image: mongo-express
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_URL=mongodb://mongo:27017
    depends_on:
      - mongo

volumes:
  mongo-data:
  redis-data:
```

---

## 3. Graceful Shutdown

```typescript
// src/server.ts
import { app } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/connection';
import { logger } from './config/logger';
import type { Server } from 'node:http';

let server: Server;
let isShuttingDown = false;

async function bootstrap() {
  await connectDatabase();

  server = app.listen(config.port, config.host, () => {
    logger.info({ port: config.port, env: config.env }, 'Server started');

    // Signal PM2 that app is ready
    if (process.send) process.send('ready');
  });

  // Keep-alive timeout should be higher than load balancer timeout
  server.keepAliveTimeout = 65000;  // 65s (AWS ALB default: 60s)
  server.headersTimeout = 66000;     // Must be > keepAliveTimeout

  setupGracefulShutdown();
}

function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // 1. Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed — no new connections');

      try {
        // 2. Close database connection
        await disconnectDatabase();
        logger.info('Database connection closed');

        // 3. Close Redis connection
        // await redisClient.quit();
        // logger.info('Redis connection closed');

        // 4. Flush logger
        logger.flush();

        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // 3. Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown — timeout exceeded');
      process.exit(1);
    }, 30_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Health check middleware to reject during shutdown
  app.use((req, res, next) => {
    if (isShuttingDown) {
      res.set('Connection', 'close');
      return res.status(503).json({ message: 'Server is shutting down' });
    }
    next();
  });
}

// Global error handlers
process.on('unhandledRejection', (reason: Error) => {
  logger.fatal({ err: reason }, 'Unhandled Rejection');
  throw reason;
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

bootstrap();
```

### Shutdown Sequence

```
Signal received (SIGTERM/SIGINT)
        │
        ▼
┌───────────────────────┐
│ Stop accepting new    │  ← server.close()
│ connections           │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Wait for in-flight    │  ← Existing requests finish
│ requests to complete  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Close DB connections  │  ← mongoose.disconnect()
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Close Redis / queues  │  ← redis.quit()
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Flush logs            │  ← logger.flush()
└───────────┬───────────┘
            │
            ▼
      process.exit(0)
```

---

## 4. Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0     # Zero-downtime deploys
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: api
          image: myregistry/api:latest
          ports:
            - containerPort: 3000
          
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
          
          # Liveness: is the process alive?
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Readiness: is it ready to serve traffic?
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Startup: extra time for first boot
          startupProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30   # 30 * 5s = 150s max startup

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

---

## 5. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ── Quality Checks ─────────────────────────────────
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm audit --audit-level=high

  # ── Tests ──────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test-secret-at-least-32-characters-long
          JWT_REFRESH_SECRET: test-refresh-at-least-32-characters

      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  # ── Build & Push ───────────────────────────────────
  build:
    needs: [quality, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t myregistry/api:${{ github.sha }} .
          docker tag myregistry/api:${{ github.sha }} myregistry/api:latest

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push myregistry/api:${{ github.sha }}
          docker push myregistry/api:latest

  # ── Deploy ─────────────────────────────────────────
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api api=myregistry/api:${{ github.sha }}
          kubectl rollout status deployment/api --timeout=300s
```

---

## 6. PM2 — Process Management (Non-Docker)

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'api',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    wait_ready: true,
    
    // Auto-restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    
    // Monitoring
    pmx: true,
  }],
};
```

```bash
# Start
pm2 start ecosystem.config.cjs --env production

# Zero-downtime reload
pm2 reload api

# Monitor
pm2 monit

# Logs
pm2 logs api

# Save process list (survives reboot)
pm2 save
pm2 startup
```

---

## 7. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/api
upstream api_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;    # Multiple instances
    keepalive 64;
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types application/json text/plain;
    gzip_min_length 1000;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 4 16k;
    }

    # Health check (no rate limit)
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }
}
```

---

## 8. Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "pm2 start ecosystem.config.cjs --env production",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "db:seed": "tsx scripts/seed.ts",
    "db:migrate": "tsx scripts/migrate.ts",
    "docker:dev": "docker compose up -d",
    "docker:build": "docker build -t api .",
    "audit": "npm audit --audit-level=high",
    "prepare": "husky install"
  }
}
```

---

## 9. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| No graceful shutdown | In-flight requests fail on deploy | Handle SIGTERM, drain connections |
| Running as root in Docker | Privilege escalation risk | Use non-root USER |
| No health check endpoints | K8s/load balancer can't detect failures | `/health/live` + `/health/ready` |
| Full `node:22` base image | 1.1GB image, larger attack surface | Use `node:22-alpine` + multi-stage |
| `npm install` in Dockerfile | Installs devDependencies, non-deterministic | `npm ci` + `npm prune --production` |
| No resource limits in K8s | One pod can OOM the entire node | Set requests and limits |
| Single replica | Zero availability during deploys | At least 2 replicas + rolling update |
| No CI quality gates | Bugs and vulnerabilities ship to production | Lint + test + audit in CI |
| `keepAliveTimeout` default | Requests fail behind load balancer | Set to 65s (> ALB's 60s) |

---

## 10. Interview-Ready Answers

### "How do you deploy a Node.js API to production?"

> "I containerize with multi-stage Docker builds using Alpine for minimal image size (~80-100MB). In Kubernetes, I run at least 3 replicas with rolling updates (maxUnavailable: 0) for zero-downtime deployments. The app implements graceful shutdown — on SIGTERM, it stops accepting new connections, waits for in-flight requests to complete (30s timeout), closes database and cache connections, then exits. Liveness probes verify the process is alive; readiness probes verify it can serve traffic (DB connected, healthy). CI/CD runs lint → type-check → test → security audit → build → deploy."

### "What is graceful shutdown and why does it matter?"

> "Without graceful shutdown, a deployment or scaling event kills the process immediately — any in-flight requests get dropped, database writes might be incomplete, and WebSocket connections are severed. With graceful shutdown, the process receives SIGTERM, stops accepting new connections, waits for existing requests to finish, closes database connections properly, flushes logs, then exits cleanly. This ensures zero dropped requests during deployments. I set a 30-second timeout as a safety net for hung connections."

---

> **Next:** [13-advanced-patterns.md](13-advanced-patterns.md) — CQRS, event-driven, microservices, job queues
