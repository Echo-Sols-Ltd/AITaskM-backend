# Docker Quick Start Guide

Get the AI Task Manager backend running in Docker in 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- 4GB RAM available
- Ports 5000, 27017, 6379 available

## Quick Start (3 Steps)

### 1. Setup Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit .env and change these values:
# - JWT_SECRET (use a strong random string)
# - SESSION_SECRET (use a different strong random string)
# - CLIENT_URL (your frontend URL, e.g., http://localhost:3000)
```

### 2. Deploy

```bash
# Option A: Using deployment script (Recommended)
bash deploy.sh

# Option B: Using Docker Compose directly
docker-compose up -d
```

### 3. Verify

```bash
# Check health
curl http://localhost:5000/api/health

# View logs
docker-compose logs -f backend
```

## Access Points

- **API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/api/health

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Access backend shell
docker-compose exec backend sh

# Check running containers
docker-compose ps
```

## Development Mode

For development with hot reload:

```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Production Mode

For production deployment:

```bash
# Create production .env file
cp .env.docker .env
# Edit .env with production values

# Start with production config
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check if ports are available
netstat -an | findstr "5000 27017 6379"

# Restart Docker Desktop
```

### Database connection failed

```bash
# Check MongoDB status
docker-compose ps mongodb

# Test MongoDB connection
docker-compose exec mongodb mongosh ai-task-manager --eval "db.stats()"
```

### Backend not responding

```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Check environment variables
docker-compose exec backend env | grep MONGODB
```

## Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (⚠️ deletes data)
docker-compose down -v

# Remove everything including images
docker-compose down --rmi all -v
```

## Next Steps

1. ✅ Backend is running
2. 📝 Test API endpoints at http://localhost:5000/api/docs
3. 🔗 Connect your frontend (update CLIENT_URL in .env)
4. 🤖 Connect AI service (update AI_SERVICE_URL in .env)
5. 📧 Configure email (update SMTP_* in .env)
6. 🔒 Review security settings for production

## Need Help?

- Check logs: `docker-compose logs -f`
- View health: `curl http://localhost:5000/api/health`
- Read full guide: [DOCKER_README.md](./DOCKER_README.md)
- Check main docs: [README.md](./README.md)

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Port 3000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (Port 5000)    │
└────┬───────┬────┘
     │       │
     ▼       ▼
┌─────────┐ ┌─────────┐
│ MongoDB │ │  Redis  │
│  27017  │ │  6379   │
└─────────┘ └─────────┘
```

## Environment Variables Reference

### Required
- `JWT_SECRET` - JWT signing key (change from default!)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string

### Optional
- `CLIENT_URL` - Frontend URL for CORS
- `AI_SERVICE_URL` - AI service endpoint
- `SMTP_*` - Email configuration
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Port Mapping

| Service  | Container Port | Host Port |
|----------|---------------|-----------|
| Backend  | 5000          | 5000      |
| MongoDB  | 27017         | 27017     |
| Redis    | 6379          | 6379      |

## Volume Mapping

| Volume        | Purpose              |
|---------------|----------------------|
| mongodb_data  | Database persistence |
| redis_data    | Cache persistence    |
| ./uploads     | File uploads         |
| ./logs        | Application logs     |

## Success Indicators

✅ All services show "healthy" status:
```bash
docker-compose ps
```

✅ Health endpoint returns OK:
```bash
curl http://localhost:5000/api/health
# {"uptime":123,"message":"OK","timestamp":1234567890,"database":"connected"}
```

✅ No errors in logs:
```bash
docker-compose logs backend | grep -i error
```

## Performance Tips

1. **Allocate enough resources** in Docker Desktop settings:
   - CPU: 2+ cores
   - Memory: 4GB+
   - Disk: 10GB+

2. **Use volumes for data** (already configured)

3. **Monitor resource usage**:
   ```bash
   docker stats
   ```

4. **Clean up unused resources**:
   ```bash
   docker system prune
   ```

## Security Checklist

- [ ] Changed JWT_SECRET from default
- [ ] Changed SESSION_SECRET from default
- [ ] Set strong MongoDB password (production)
- [ ] Set Redis password (production)
- [ ] Configured CORS properly (CLIENT_URL)
- [ ] Reviewed rate limiting settings
- [ ] Enabled HTTPS (production)
- [ ] Set up firewall rules (production)

---

**Ready to deploy?** Run `bash deploy.sh` and you're good to go! 🚀
