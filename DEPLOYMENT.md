# 🚀 Deployment Guide

This guide will help you deploy SuiStage to production or your own Sui network.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Deploy Smart Contracts](#deploy-smart-contracts)
- [Deploy Backend](#deploy-backend)
- [Environment Variables](#environment-variables)
- [Production Checklist](#production-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ Sui CLI installed and configured
- ✅ Node.js 18+ installed
- ✅ SUI tokens in your wallet (for gas fees)
- ✅ Production server (VPS, cloud instance, etc.)

---

## 🔐 Deploy Smart Contracts

### 1. Prepare for Deployment

```bash
cd contracts

# Clean previous builds
rm -rf build/

# Test contracts first
sui move test
```

### 2. Choose Network

**For Testnet:**
```bash
sui client switch --env testnet
```

**For Mainnet:**
```bash
sui client switch --env mainnet
```

### 3. Deploy Contracts

```bash
# Deploy with gas budget (adjust as needed)
sui client publish --gas-budget 100000000

# Save the output!
# You'll need:
# - Package ID
# - Event Registry ID
```

### 4. Verify Deployment

Visit Sui Explorer:
- **Testnet**: https://testnet.suivision.xyz/
- **Mainnet**: https://suivision.xyz/

Search for your Package ID to verify deployment.

---

## 🖥️ Deploy Backend

### Option 1: Traditional VPS (Recommended for SQLite)

**1. Prepare Server**

```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+ (for building native modules)
sudo apt-get install python3.9
```

**2. Clone and Setup**

```bash
# Clone your repository
git clone https://github.com/yourusername/suistage-role2-sqlite.git
cd suistage-role2-sqlite/backend

# Install dependencies
PYTHON=/usr/bin/python3.9 npm install

# Create production .env
cp .env.example .env
nano .env  # Edit with your settings
```

**3. Build and Run**

```bash
# Build
npm run build

# Run with PM2 (process manager)
sudo npm install -g pm2
pm2 start dist/index.js --name suistage-api
pm2 save
pm2 startup  # Follow instructions for auto-start
```

**4. Setup Nginx (Optional)**

```nginx
server {
    listen 80;
    server_name api.yoursite.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

**1. Create Dockerfile**

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install Python for building native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**2. Build and Run**

```bash
# Build image
docker build -t suistage-api .

# Run container
docker run -d \
  --name suistage-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  suistage-api
```

### Option 3: Platform as a Service

**Railway.app / Render.com / Fly.io**

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

---

## 🔐 Environment Variables

### Required Variables

```bash
# Database
DATABASE_PATH=/app/data/suistage.db  # Or absolute path

# Sui Network
SUI_NETWORK=mainnet  # or testnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
PACKAGE_ID=your_package_id_here
EVENT_REGISTRY_ID=your_registry_id_here

# Server
PORT=3000
NODE_ENV=production

# Walrus (if using)
WALRUS_AGGREGATOR_URL=https://aggregator.walrus.xyz
WALRUS_PUBLISHER_URL=https://publisher.walrus.xyz
WALRUS_EPOCHS=100  # Increase for production

# CORS
CORS_ORIGIN=https://yourfrontend.com

# Logging
LOG_LEVEL=info
```

### Optional Variables

```bash
# Database optimization
AUTO_OPTIMIZE=true

# Redis (if scaling)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
```

---

## ✅ Production Checklist

### Security

- [ ] All environment variables are set correctly
- [ ] `.env` file is NOT committed to git
- [ ] CORS is configured for your frontend domain only
- [ ] API rate limiting is enabled (if implemented)
- [ ] HTTPS is enabled (use Let's Encrypt)
- [ ] Database file permissions are restricted
- [ ] Firewall rules are configured

### Performance

- [ ] Database is backed up regularly
- [ ] Auto-optimize is enabled for SQLite
- [ ] Server has adequate resources (2GB RAM minimum)
- [ ] PM2 or similar process manager is running
- [ ] Log rotation is configured
- [ ] Monitoring is set up (e.g., PM2 Plus, Datadog)

### Functionality

- [ ] All tests pass
- [ ] Contract deployment is verified on explorer
- [ ] Backend can connect to Sui network
- [ ] Database is initialized successfully
- [ ] API endpoints are accessible
- [ ] Error handling is working
- [ ] Logs are being written

### Backup & Recovery

- [ ] Database backup script is scheduled
- [ ] `.env` file is backed up securely
- [ ] Contract upgrade capability is documented
- [ ] Disaster recovery plan is documented

---

## 📊 Monitoring

### Check Application Status

```bash
# With PM2
pm2 status
pm2 logs suistage-api

# Check database
ls -lh /app/data/suistage.db

# Check disk space
df -h
```

### Database Backups

```bash
# Manual backup
cp /app/data/suistage.db /app/backups/suistage_$(date +%Y%m%d).db

# Automated daily backup (cron)
0 2 * * * cp /app/data/suistage.db /app/backups/suistage_$(date +\%Y\%m\%d).db
```

---

## 🔄 Updating Deployment

### Update Backend

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart with PM2
pm2 restart suistage-api
```

### Update Smart Contracts

⚠️ **Warning**: Upgrading contracts requires careful planning!

```bash
# You need the UpgradeCap object ID from initial deployment
sui client upgrade --upgrade-capability YOUR_UPGRADE_CAP_ID --gas-budget 100000000
```

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs suistage-api --lines 100

# Common issues:
# 1. Port already in use
lsof -i :3000

# 2. Database file permissions
chmod 644 /app/data/suistage.db

# 3. Missing dependencies
npm install
```

### Database issues

```bash
# Check database integrity
sqlite3 suistage.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
cp /app/backups/latest.db /app/data/suistage.db
```

### Contract connection issues

```bash
# Verify network connectivity
sui client active-env

# Check if package exists
sui client object YOUR_PACKAGE_ID
```

---

## 📞 Support

If you encounter issues:

1. Check the [Troubleshooting section](README.md#troubleshooting) in README
2. Search [existing issues](../../issues)
3. Create a [new issue](../../issues/new) with deployment logs

---

## 📚 Additional Resources

- [Sui Deployment Guide](https://docs.sui.io/build/publish)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Good luck with your deployment! 🚀**
