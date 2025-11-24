# Backend Docker Deployment Guide

This guide explains how to containerize and run the AI Task Manager backend using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.docker .env
```

Edit `.env` and update the following critical values:
- `JWT_SECRET` - Use a strong random string
- `SESSION_SECRET` - Use a different strong random string
- `CLIENT_URL` - Your frontend URL
- SMTP settings (if using email features)

### 2. Build and Run

Start all services (MongoDB, Redis, Backend):

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f backend
```

### 3. Verify Deployment

Check health status:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1234567890,
  "database": "connected"
}
```

Access API documentation:
```
http://localhost:5000/api/docs
```

## Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ Deletes all data)
```bash
docker-compose down -v
```

### Restart Backend Only
```bash
docker-compose restart backend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# MongoDB only
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute Commands in Container
```bash
# Access backend shell
docker-compose exec backend sh

# Run npm commands
docker-compose exec backend npm run db:seed

# Check Node version
docker-compose exec backend node --version
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build backend
```

## Service Architecture

### Services

1. **MongoDB** (Port 27017)
   - Database for application data
   - Persistent volume: `mongodb_data`
   - Health check enabled

2. **Redis** (Port 6379)
   - Caching and session storage
   - Persistent volume: `redis_data`
   - AOF persistence enabled

3. **Backend** (Port 5000)
   - Node.js Express API
   - Depends on MongoDB and Redis
   - Auto-restarts on failure

### Volumes

- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `redis_data` - Redis persistence files
- `./uploads` - File uploads (bind mount)
- `./logs` - Application logs (bind mount)

### Networks

All services communicate via the `app-network` bridge network.

## Production Deployment

### Security Checklist

- [ ] Change all default secrets in `.env`
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Configure HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Configure firewall rules
- [ ] Enable MongoDB authentication
- [ ] Set Redis password
- [ ] Review CORS settings
- [ ] Configure rate limiting
- [ ] Set up log rotation
- [ ] Enable backup strategy

### Environment Variables

#### Required
- `JWT_SECRET` - JWT signing key
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `CLIENT_URL` - Frontend URL for CORS

#### Optional
- `AI_SERVICE_URL` - AI service endpoint
- `SMTP_*` - Email configuration
- `RATE_LIMIT_*` - Rate limiting settings
- `LOG_LEVEL` - Logging verbosity

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### Scaling

Scale backend instances:

```bash
docker-compose up -d --scale backend=3
```

Note: Requires load balancer configuration.

## Monitoring

### Health Checks

Backend health endpoint:
```bash
curl http://localhost:5000/api/health
```

MongoDB health:
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

Redis health:
```bash
docker-compose exec redis redis-cli ping
```

### Container Stats

```bash
docker stats
```

### Disk Usage

```bash
docker system df
```

## Backup and Restore

### Backup MongoDB

```bash
docker-compose exec mongodb mongodump --out=/data/backup
docker cp ai-task-manager-mongodb:/data/backup ./mongodb-backup
```

### Restore MongoDB

```bash
docker cp ./mongodb-backup ai-task-manager-mongodb:/data/backup
docker-compose exec mongodb mongorestore /data/backup
```

### Backup Redis

```bash
docker-compose exec redis redis-cli SAVE
docker cp ai-task-manager-redis:/data/dump.rdb ./redis-backup.rdb
```

## Troubleshooting

### Backend Won't Start

1. Check logs:
```bash
docker-compose logs backend
```

2. Verify MongoDB connection:
```bash
docker-compose exec backend ping mongodb
```

3. Check environment variables:
```bash
docker-compose exec backend env | grep MONGODB
```

### Database Connection Issues

1. Ensure MongoDB is healthy:
```bash
docker-compose ps mongodb
```

2. Test connection:
```bash
docker-compose exec mongodb mongosh ai-task-manager --eval "db.stats()"
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "5001:5000"  # Change host port
```

### Out of Memory

Increase Docker memory limit in Docker Desktop settings or add limits:

```yaml
backend:
  mem_limit: 2g
```

### Permission Issues

Fix volume permissions:

```bash
sudo chown -R $USER:$USER ./uploads ./logs
```

## Development vs Production

### Development

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up
```

Features:
- Hot reload enabled
- Debug logging
- Source code mounted as volume
- Development dependencies included

### Production

```bash
# Use production compose file
docker-compose -f docker-compose.yml up -d
```

Features:
- Optimized image size
- Production dependencies only
- No source code mounting
- Enhanced security

## Integration with AI Service

To connect with the AI service container:

1. Update `AI_SERVICE_URL` in `.env`:
```
AI_SERVICE_URL=http://ai-service:8000
```

2. Ensure both services are on the same network:
```yaml
networks:
  - app-network
```

3. Add AI service to docker-compose.yml or use external network.

## Cleanup

### Remove All Containers and Images

```bash
docker-compose down --rmi all
```

### Remove Volumes (⚠️ Deletes data)

```bash
docker-compose down -v
```

### Clean Docker System

```bash
docker system prune -a --volumes
```

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review health checks
- Verify environment variables
- Check network connectivity
- Consult main README.md

## Next Steps

1. Set up frontend container
2. Configure reverse proxy (Nginx)
3. Set up SSL/TLS certificates
4. Configure CI/CD pipeline
5. Set up monitoring (Prometheus/Grafana)
6. Configure automated backups
