# PeerBond Deployment Guide

## Overview

This guide covers deploying the PeerBond AI Orchestration System to production environments with comprehensive monitoring, security, and scalability considerations.

## Prerequisites

### System Requirements

**Minimum Production Requirements:**
- **CPU**: 4 cores (8 cores recommended)
- **Memory**: 8GB RAM (16GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps connection

**Software Requirements:**
- Docker 20.0+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- PostgreSQL 15+
- Redis 7+

### External Services

**Required:**
- OpenAI API key (GPT-4 access)
- Google Gemini API key (fallback)
- Domain name with SSL certificate
- SMTP service for notifications (optional)

**Optional:**
- AWS S3 for backups
- CloudFlare for CDN
- PagerDuty for alerting

## Quick Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application user
sudo useradd -m -s /bin/bash peerbond
sudo usermod -aG docker peerbond
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/peerbond.git
cd peerbond/server

# Set up environment
cp .env.production.example .env.production
nano .env.production  # Edit configuration

# Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### 3. Verification

```bash
# Check health
curl http://localhost:3001/health

# Check metrics
curl http://localhost:9464/metrics

# Check monitoring
open http://localhost:3000  # Grafana
open http://localhost:9090  # Prometheus
open http://localhost:16686 # Jaeger
```

## Detailed Configuration

### Environment Configuration

Create `.env.production` with the following settings:

```env
# Application Configuration
NODE_ENV=production
PORT=3001
INSTANCE_ID=api-prod-01

# Database
DATABASE_URL=postgresql://peerbond:SECURE_PASSWORD@postgres:5432/peerbond

# Security
JWT_SECRET=YOUR_STRONG_32_CHARACTER_SECRET_HERE
CORS_ORIGIN=https://yourdomain.com

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Cache
REDIS_URL=redis://redis:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
PROMETHEUS_PORT=9464
LOG_LEVEL=info

# Passwords for services
GRAFANA_PASSWORD=secure_grafana_password
DB_PASSWORD=secure_database_password

# Optional: Email notifications
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=smtp_password

# Optional: Backup to S3
BACKUP_S3_BUCKET=peerbond-backups
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
```

### SSL Configuration

#### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option 2: Custom Certificate

```nginx
# nginx/ssl.conf
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://peerbond-api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Production Docker Compose

### Complete Stack Configuration

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Main API Service
  peerbond-api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    image: peerbond/orchestration-api:3.0.0
    container_name: peerbond-api
    restart: unless-stopped
    ports:
      - "3001:3001"
      - "9464:9464"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      REDIS_URL: redis://redis:6379
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - peerbond-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: peerbond-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: peerbond
      POSTGRES_USER: peerbond
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - peerbond-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U peerbond -d peerbond"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache
  redis:
    image: redis:7-alpine
    container_name: peerbond-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - peerbond-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: peerbond-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - peerbond-network

  grafana:
    image: grafana/grafana:latest
    container_name: peerbond-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    networks:
      - peerbond-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: peerbond-jaeger
    restart: unless-stopped
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: 9411
    ports:
      - "16686:16686"
      - "14268:14268"
    networks:
      - peerbond-network

networks:
  peerbond-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

## Deployment Automation

### Automated Deployment Script

The `scripts/deploy.sh` script provides comprehensive deployment automation:

```bash
# Deploy to production
./scripts/deploy.sh production v3.0.0

# Deploy to staging
./scripts/deploy.sh staging

# Deploy with skip tests
SKIP_TESTS=true ./scripts/deploy.sh production
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run build

  security:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: peerbond/orchestration-api:latest
          format: 'sarif'
          output: 'trivy-results.sarif'

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          ssh deploy@${{ secrets.PRODUCTION_HOST }} \
            "cd /opt/peerbond && ./scripts/deploy.sh production ${{ github.sha }}"
```

## Scaling & High Availability

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  peerbond-api:
    image: peerbond/orchestration-api:3.0.0
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - peerbond-api
```

### Load Balancer Configuration

```nginx
# nginx/nginx.conf
upstream peerbond_backend {
    least_conn;
    server peerbond-api-1:3001 weight=3 max_fails=3 fail_timeout=30s;
    server peerbond-api-2:3001 weight=3 max_fails=3 fail_timeout=30s;
    server peerbond-api-3:3001 weight=3 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy configuration
    location / {
        proxy_pass http://peerbond_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://peerbond_backend/health;
        access_log off;
    }

    # Metrics endpoint (restrict access)
    location /metrics {
        deny all;
        return 403;
    }
}
```

### Database High Availability

```yaml
# docker-compose.ha.yml
services:
  postgres-primary:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replica
      POSTGRES_REPLICATION_PASSWORD: replica_password
    
  postgres-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_SERVICE: postgres-primary
      POSTGRES_REPLICATION_USER: replica
      POSTGRES_REPLICATION_PASSWORD: replica_password
```

## Monitoring & Alerting

### Prometheus Alerts

```yaml
# monitoring/alerts.yml
groups:
  - name: peerbond_alerts
    rules:
      - alert: HighCrisisAlertRate
        expr: rate(orchestration_crisis_alerts_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High crisis alert rate detected"
          description: "Crisis alerts are occurring at {{ $value }} per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(orchestration_response_time_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(orchestration_errors_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"
```

### Grafana Alerting

```json
{
  "alert": {
    "conditions": [
      {
        "evaluator": {"params": [0.1], "type": "gt"},
        "operator": {"type": "and"},
        "query": {"params": ["A", "5m", "now"]},
        "reducer": {"params": [], "type": "avg"},
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "for": "5m",
    "frequency": "10s",
    "handler": 1,
    "name": "High Crisis Rate Alert",
    "noDataState": "no_data",
    "notifications": [
      {"uid": "slack-notifications"},
      {"uid": "email-notifications"}
    ]
  }
}
```

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/backups"
S3_BUCKET="${BACKUP_S3_BUCKET:-peerbond-backups}"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/peerbond_${DATE}.sql"

# Compress backup
gzip "$BACKUP_DIR/peerbond_${DATE}.sql"

# Upload to S3 if configured
if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
    aws s3 cp "$BACKUP_DIR/peerbond_${DATE}.sql.gz" \
        "s3://$S3_BUCKET/database/peerbond_${DATE}.sql.gz"
fi

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "peerbond_*.sql.gz" -mtime +30 -delete

echo "Backup completed: peerbond_${DATE}.sql.gz"
```

### Recovery Procedure

```bash
# Stop application
docker-compose down

# Restore database
gunzip < /backups/peerbond_20240115_100000.sql.gz | \
    psql $DATABASE_URL

# Restart application
docker-compose up -d

# Verify health
curl http://localhost:3001/health
```

## Security Hardening

### System Security

```bash
# Firewall configuration
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3001/tcp   # Block direct API access

# SSH hardening
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Docker Security

```dockerfile
# Use specific versions
FROM node:18.19.0-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Security scan
RUN npm audit --audit-level high

# Resource limits
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Daily tasks (cron)
0 2 * * * /opt/peerbond/scripts/backup.sh
0 3 * * * docker system prune -f
0 4 * * * /opt/peerbond/scripts/log-rotation.sh

# Weekly tasks
0 5 * * 0 docker image prune -a -f
0 6 * * 0 /opt/peerbond/scripts/security-scan.sh

# Monthly tasks
0 7 1 * * /opt/peerbond/scripts/update-dependencies.sh
```

### Log Rotation

```bash
# /etc/logrotate.d/peerbond
/opt/peerbond/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 peerbond peerbond
    postrotate
        docker-compose exec peerbond-api kill -USR1 1
    endscript
}
```

## Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check logs
docker-compose logs peerbond-api

# Check resources
docker stats

# Check health
curl http://localhost:3001/health
```

**Database Connection Issues:**
```bash
# Test connection
docker-compose exec postgres psql -U peerbond -d peerbond -c "SELECT 1;"

# Check network
docker network inspect peerbond_peerbond-network
```

**High Memory Usage:**
```bash
# Check memory by container
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Restart if needed
docker-compose restart peerbond-api
```

### Performance Tuning

```env
# Increase connection limits
DATABASE_MAX_CONNECTIONS=20
REDIS_MAX_CONNECTIONS=10

# Adjust memory limits
NODE_OPTIONS=--max-old-space-size=512

# Enable clustering
CLUSTER_WORKERS=4
```

This deployment guide provides comprehensive instructions for deploying PeerBond to production with enterprise-grade reliability, monitoring, and security.