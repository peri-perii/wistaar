# 📦 Deployment Guide

Complete deployment instructions for Wistaar Secure Backend to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [SSL/TLS Certificate](#ssltls-certificate)
5. [Docker Deployment](#docker-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Production Configuration](#production-configuration)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Backup & Recovery](#backup--recovery)
10. [Scaling](#scaling)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.log statements in production code
- [ ] No hardcoded secrets or credentials
- [ ] All API endpoints documented
- [ ] Security headers configured (Helmet)
- [ ] Rate limiting configured

### Dependencies

- [ ] No known vulnerabilities (`npm audit`)
- [ ] Dependencies pinned to specific versions
- [ ] Node.js version specified in `.nvmrc` or `package.json`
- [ ] Development dependencies excluded from production build

### Security

- [ ] Encryption key generated and stored securely
- [ ] JWT secrets configured (min 32 characters each)
- [ ] Database SSL/TLS enabled
- [ ] HTTPS certificate acquired
- [ ] CORS configured for frontend URL only
- [ ] Environment variables validated at startup
- [ ] Admin credentials configured
- [ ] Database backups scheduled

### Infrastructure

- [ ] Server provisioned and hardened
- [ ] Firewall configured (allow only necessary ports)
- [ ] Database server secured and tested
- [ ] Redis cache (if used) configured
- [ ] AWS S3 bucket created and permissions set
- [ ] DNS records configured
- [ ] CDN configured (if using static assets)
- [ ] Monitoring and logging setup

---

## Environment Setup

### Node.js Version

```bash
# Check required version
cat package.json | grep "node"
# Expected: "node": ">=18.0.0"

# Use nvm for version management
nvm install 20.10.0
nvm use 20.10.0 
nvm alias default 20.10.0

# Verify
node --version  # v20.10.0
npm --version   # 10.2.4
```

### Production .env

```bash
# Required environment variables for production
cp .env.example .env.production

# Edit .env.production and set:
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="mysql://user:password@db.example.com:3306/wistaar_prod?sslaccept=strict"
DATABASE_SSL_CA="/path/to/ca.pem"

# Security
JWT_SECRET="<32+ random characters>"
JWT_REFRESH_SECRET="<32+ random characters>"
ENCRYPTION_KEY="<64 hex characters>"

# Frontend
FRONTEND_URL="https://wistaar.com"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="<your access key>"
AWS_SECRET_ACCESS_KEY="<your secret key>"
S3_BUCKET="wistaar-prod-books"

# Email
EMAIL_SERVICE="gmail" # or sendgrid, mailgun
EMAIL_USER="noreply@wistaar.com"
EMAIL_PASSWORD="<app password>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465

# Optional: Payments
RAZORPAY_KEY_ID="<key>"
RAZORPAY_SECRET="<secret>"

# Optional: CORS
CORS_ORIGIN="https://wistaar.com"

# Deployment
ENVIRONMENT="production"
LOG_LEVEL="warn"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Secrets Management

**Never commit secrets to git:**

```bash
# Create .env.production (gitignored)
cat > .env.production << 'EOF'
DATABASE_URL="mysql://..."
JWT_SECRET="..."
ENCRYPTION_KEY="..."
EOF

# Verify not tracked
git status
# .env.production should not appear
```

**Secure secret rotation:**

```bash
# Rotate JWT secrets every 90 days
OLD_JWT_SECRET="${JWT_SECRET}"
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Update .env.production
# Invalidate old tokens (optional: logout all users)
# Deploy update
```

---

## Database Migration

### Pre-Migration

```bash
# Backup production database
mysqldump -u root -p wistaar_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
mysql -u root -p wistaar_prod < backup_*.sql  # Restore to test DB
```

### Migration Steps

```bash
# 1. Generate Prisma client
npm run prisma:generate

# 2. Create migration
npm run prisma:migrate -- --name init --skip-generate

# 3. Review generated SQL (review migrations folder)
cat prisma/migrations/*/migration.sql

# 4. Apply migration (development)
npm run prisma:migrate -- deploy

# 5. For production (with downtime minimization)
npm run prisma:migrate -- deploy --skip-validate
```

### Post-Migration

```bash
# Verify schema created
mysql -u root -p wistaar_prod -e "SHOW TABLES;"

# Check indexes
mysql -u root -p wistaar_prod -e "SHOW INDEXES FROM users;"

# Validate row counts
mysql -u root -p wistaar_prod -e "SELECT COUNT(*) FROM users;"
```

---

## SSL/TLS Certificate

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d wistaar.com -d www.wistaar.com

# Certificate location
# /etc/letsencrypt/live/wistaar.com/fullchain.pem
# /etc/letsencrypt/live/wistaar.com/privkey.pem
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name wistaar.com www.wistaar.com;
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wistaar.com www.wistaar.com;

    ssl_certificate /etc/letsencrypt/live/wistaar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wistaar.com/privkey.pem;
    
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Auto-Renewal

```bash
# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: "${DATABASE_URL}"
      JWT_SECRET: "${JWT_SECRET}"
      ENCRYPTION_KEY: "${ENCRYPTION_KEY}"
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - logs:/app/logs

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASSWORD}"
      MYSQL_DATABASE: wistaar_prod
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  db_data:
  logs:
```

### Deploy with Docker

```bash
# Build image
docker build -t wistaar-backend:latest .

# Tag for registry
docker tag wistaar-backend:latest registry.example.com/wistaar-backend:latest

# Push to registry
docker push registry.example.com/wistaar-backend:latest

# Pull on production
docker pull registry.example.com/wistaar-backend:latest

# Run container
docker run -d \
  --name wistaar-api \
  -p 3000:3000 \
  --env-file .env.production \
  registry.example.com/wistaar-backend:latest
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Type check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Build Docker image
        run: docker build -t wistaar-backend:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag wistaar-backend:${{ github.sha }} wistaar/backend:latest
          docker push wistaar/backend:latest
      
      - name: Deploy to production
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
            "cd ~/wistaar-backend && docker-compose pull && docker-compose up -d"
```

---

## Production Configuration

### Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wistaar-api',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    watch: false
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs wistaar-api

# Auto-restart on server reboot
pm2 startup
pm2 save
```

### Resource Limits

```bash
# Set maximum memory usage
pm2 start app.js --max-memory-restart 1G

# CPU limits (using cgroups)
sudo cgcreate -g memory,cpu:/wistaar
sudo cgset -r memory.limit_in_bytes=4G /wistaar
sudo cgset -r cpu.shares=1024 /wistaar
```

---

## Monitoring & Alerts

### Application Monitoring

```bash
# Install monitoring package
npm install pm2-plus

# Connect to PM2 Plus dashboard
pm2 plus

# or use custom monitoring
npm install newrelic
```

### Log Aggregation

```bash
# Elasticsearch + Logstash + Kibana setup
curl -X POST "localhost:9200/_index_template/wistaar-logs" \
  -H 'Content-Type: application/json' \
  -d @logstash-template.json

# Ship logs to ELK
npm install winston-elasticsearch
```

### Health Checks

```bash
# Frontend health check
curl -X GET http://localhost:3000/health
# Response: {
#   "success": true,
#   "message": "Server is running",
#   "uptime": 3600000
# }

# Database connectivity check
npm install pg-pool
# Query health endpoint includes DB status
```

### Alert Configuration

```javascript
// Configure alerts for production
const thresholds = {
  cpuUsage: 80,           // Alert if CPU > 80%
  memoryUsage: 90,        // Alert if memory > 90%
  errorRate: 5,           // Alert if error rate > 5%
  responseTime: 5000,     // Alert if avg response > 5s
  failedRequests: 100     // Alert if > 100 failed requests
};
```

---

## Backup & Recovery

### Automated Backups

```bash
# Daily database backup script
cat > /usr/local/bin/backup-wistaar-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/wistaar"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/wistaar_${TIMESTAMP}.sql"

# Create backup
mysqldump -u root -p$DB_PASSWORD wistaar_prod > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to S3
aws s3 cp "${BACKUP_FILE}.gz" s3://wistaar-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

chmod +x /usr/local/bin/backup-wistaar-db.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-wistaar-db.sh
```

### Disaster Recovery

```bash
# Restore from backup
zcat wistaar_20250115_020000.sql.gz | mysql -u root -p wistaar_prod

# Verify restore
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM books;

# Validate data integrity
PRAGMA integrity_check;

# Reindex if needed
ANALYZE TABLE users;
OPTIMIZE TABLE users;
```

---

## Scaling

### Horizontal Scaling

```javascript
// Load balancer configuration (Nginx)
upstream wistaar_backend {
  least_conn;
  server app1.internal:3000;
  server app2.internal:3000;
  server app3.internal:3000;
}

server {
  listen 443 ssl http2;
  location / {
    proxy_pass http://wistaar_backend;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### Database Replication

```bash
# Master-slave replication setup
# On slave server:
CHANGE MASTER TO
  MASTER_HOST='master.internal',
  MASTER_USER='repl',
  MASTER_PASSWORD='replpass',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=107;

START SLAVE;
SHOW SLAVE STATUS;
```

### Caching Strategy

```javascript
// Redis caching layer
const redis = require('redis');
const client = redis.createClient();

// Cache book details
app.get('/api/books/:id', async (req, res) => {
  const cached = await client.get(`book:${req.params.id}`);
  if (cached) return res.json(JSON.parse(cached));
  
  const book = await db.book.findUnique(...);
  await client.setex(`book:${req.params.id}`, 3600, JSON.stringify(book));
  
  res.json(book);
});
```

---

## Troubleshooting

### High CPU Usage

```bash
# Identify process
top -p $(pidof node)

# Profile with 0x
npm install -g 0x
0x app.js  # Generates flamegraph

# Check for infinite loops in middleware
grep -n "while\|for" src/**/*.ts
```

### High Memory Usage

```bash
# Heap snapshot
node --inspect app.js
# Chrome: chrome://inspect

# Heap analysis
npm install heapdump
# heapdump.writeSnapshot() in code
```

### Database Connection Issues

```bash
# Test database connectivity
mysql -u user -p -h db.example.com wistaar_prod

# Check connection pool status
console.log(prisma.$metrics.connectionStatistics);

# Increase pool size
DATABASE_URL="...?connection_limit=20"
```

### Rate Limiting Not Working

```bash
# Check Redis connection
redis-cli ping  # Should return PONG

# Verify rate limiter is applied
console.log(app._router.stack.filter(m => m.name === 'limiter'));
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
