# Render.com Deployment Guide

Quick guide to deploy the AI Task Manager backend on Render.com.

## Prerequisites

- Render.com account
- GitHub repository connected to Render
- MongoDB Atlas account (or use Render's MongoDB)

## Quick Deploy

### 1. Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository: `Echo-Sols-Ltd/AITaskM-backend`

### 2. Configure Service

**Basic Settings:**
- **Name**: `ai-task-manager-backend`
- **Region**: Choose closest to your users
- **Branch**: `main` or `master`
- **Root Directory**: `backend` (if monorepo) or leave empty
- **Runtime**: `Docker`
- **Dockerfile Path**: `./Dockerfile` or `./backend/Dockerfile`

**Instance Type:**
- Free tier: Good for testing
- Starter ($7/month): Recommended for production
- Standard: For high traffic

### 3. Environment Variables

Add these in Render dashboard under "Environment":

```env
# Required
NODE_ENV=production
PORT=5000
JWT_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>
MONGODB_URI=<your-mongodb-connection-string>
CLIENT_URL=<your-frontend-url>

# Optional
REDIS_URL=<redis-connection-string>
AI_SERVICE_URL=<ai-service-url>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-app-password>
LOG_LEVEL=info
```

**Generate Secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. MongoDB Setup

**Option A: MongoDB Atlas (Recommended)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist Render IPs: `0.0.0.0/0` (or specific IPs)
5. Get connection string
6. Add to `MONGODB_URI` in Render

**Option B: Render MongoDB**

1. In Render dashboard: New + → PostgreSQL/MongoDB
2. Create MongoDB instance
3. Copy internal connection string
4. Add to `MONGODB_URI`

### 5. Redis Setup (Optional)

**Option A: Render Redis**

1. New + → Redis
2. Create Redis instance
3. Copy internal connection string
4. Add to `REDIS_URL`

**Option B: External Redis**

Use Redis Labs, Upstash, or other providers.

### 6. Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone repository
   - Build Docker image
   - Deploy container
   - Assign URL

### 7. Verify Deployment

```bash
# Check health
curl https://your-app.onrender.com/api/health

# Expected response:
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1234567890,
  "database": "connected"
}
```

## Render Configuration File

Create `render.yaml` in repository root for automated setup:

```yaml
services:
  - type: web
    name: ai-task-manager-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: JWT_SECRET
        generateValue: true
      - key: SESSION_SECRET
        generateValue: true
      - key: MONGODB_URI
        sync: false
      - key: CLIENT_URL
        sync: false
    healthCheckPath: /api/health
    autoDeploy: true

databases:
  - name: ai-task-manager-db
    databaseName: ai-task-manager
    user: admin
```

## Troubleshooting

### Build Fails

**Issue**: `npm ci` fails with missing package-lock.json

**Solution**: The Dockerfile now handles this automatically. If issues persist:

```bash
# Locally generate and commit package-lock.json
cd backend
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Database Connection Fails

**Check:**
1. MongoDB URI is correct
2. Database user has permissions
3. IP whitelist includes `0.0.0.0/0`
4. Network access is enabled

**Test connection:**
```bash
# In Render shell
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Service Crashes

**Check logs:**
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for error messages

**Common issues:**
- Missing environment variables
- Database connection timeout
- Port conflicts (ensure PORT=5000)
- Memory limits exceeded

### Slow Performance

**Solutions:**
1. Upgrade instance type
2. Enable Redis caching
3. Optimize database queries
4. Add database indexes
5. Enable compression

## Custom Domain

1. Go to service settings
2. Click "Custom Domain"
3. Add your domain
4. Update DNS records:
   ```
   CNAME: your-domain.com → your-app.onrender.com
   ```

## SSL/TLS

Render provides free SSL certificates automatically for:
- *.onrender.com domains
- Custom domains

## Monitoring

### Built-in Metrics

Render provides:
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

### External Monitoring

Integrate with:
- **Sentry**: Error tracking
- **LogDNA**: Log management
- **Datadog**: Full monitoring
- **New Relic**: APM

## Scaling

### Horizontal Scaling

```yaml
# In render.yaml
services:
  - type: web
    scaling:
      minInstances: 2
      maxInstances: 10
      targetMemoryPercent: 80
      targetCPUPercent: 80
```

### Vertical Scaling

Upgrade instance type in dashboard:
- Starter: 512MB RAM
- Standard: 2GB RAM
- Pro: 4GB+ RAM

## Backup Strategy

### Database Backups

**MongoDB Atlas:**
- Automatic daily backups
- Point-in-time recovery
- Download backups

**Manual Backup:**
```bash
# From Render shell
mongodump --uri="$MONGODB_URI" --archive > backup.archive
```

### Code Backups

- GitHub repository (primary)
- Render keeps deployment history
- Tag releases for rollback

## CI/CD

### Auto Deploy

Enable in Render dashboard:
- Auto-deploy on push to main
- Deploy previews for PRs
- Manual deploy option

### Deploy Hooks

```bash
# Trigger deploy via webhook
curl -X POST https://api.render.com/deploy/srv-xxx?key=xxx
```

## Cost Optimization

### Free Tier Limitations

- Spins down after 15 min inactivity
- 750 hours/month free
- Slower cold starts

### Paid Tier Benefits

- Always on
- Faster performance
- More resources
- Better support

### Tips

1. Use free tier for staging
2. Paid tier for production
3. Enable Redis for caching
4. Optimize Docker image size
5. Use CDN for static files

## Security Checklist

- [ ] Strong JWT_SECRET
- [ ] Strong SESSION_SECRET
- [ ] HTTPS enabled (automatic)
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] IP whitelist configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Helmet security headers active

## Support

### Render Support

- [Documentation](https://render.com/docs)
- [Community Forum](https://community.render.com/)
- [Status Page](https://status.render.com/)
- Email: support@render.com

### Application Support

- Check logs in Render dashboard
- Review [DOCKER_README.md](./DOCKER_README.md)
- Test locally with Docker
- Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

## Next Steps

1. ✅ Deploy backend to Render
2. 🔗 Deploy frontend to Vercel/Netlify
3. 🤖 Deploy AI service
4. 📧 Configure email service
5. 📊 Set up monitoring
6. 🔒 Review security settings
7. 📈 Configure analytics

---

**Deployment Platform**: Render.com
**Status**: Ready for Deployment ✅
**Updated**: November 24, 2025
