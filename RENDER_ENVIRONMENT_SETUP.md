# Render.com Environment Setup Guide

## Current Issues from Logs

### 1. Redis Connection Failed ❌
```
[ERROR] [REDIS_CACHE] Redis client error {"error":"connect ECONNREFUSED ::1:6379"}
[ERROR] [REDIS_CACHE] Failed to initialize Redis {"error":"Redis reconnection limit exceeded"}
```

**Cause**: Redis is not available at localhost:6379

**Impact**: 
- ✅ Application still works (falls back to in-memory rate limiting)
- ⚠️ No distributed caching
- ⚠️ Rate limiting per instance only

### 2. MongoDB Connection Failed ❌
```
[ERROR] [APP] ❌ MongoDB connection error {"error":"connect ECONNREFUSED 127.0.0.1:27017"}
```

**Cause**: MongoDB is not available at localhost:27017

**Impact**:
- ❌ Application cannot function without database
- ❌ All API endpoints will fail

## Solution: Configure External Services

### Step 1: Set Up MongoDB

#### Option A: MongoDB Atlas (Recommended - Free Tier Available)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free cluster
3. Create database user:
   - Username: `admin` (or your choice)
   - Password: Generate strong password
4. Network Access:
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or add Render's IP ranges
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-task-manager?retryWrites=true&w=majority
   ```

#### Option B: Render MongoDB (Paid)

1. In Render Dashboard: New + → MongoDB
2. Create instance
3. Copy internal connection string
4. Use in environment variables

### Step 2: Set Up Redis (Optional but Recommended)

#### Option A: Render Redis (Paid - $7/month)

1. In Render Dashboard: New + → Redis
2. Create instance
3. Copy internal connection string
4. Add to environment variables

#### Option B: Upstash Redis (Free Tier Available)

1. Go to [Upstash](https://upstash.com/)
2. Create Redis database
3. Get connection string
4. Add to environment variables

#### Option C: Skip Redis (Use In-Memory)

- Application will work without Redis
- Rate limiting will be per-instance
- No distributed caching
- **This is acceptable for small deployments**

### Step 3: Configure Environment Variables in Render

Go to your Render service → Environment tab and add:

#### Required Variables

```env
# Node Environment
NODE_ENV=production
PORT=5000

# MongoDB (REQUIRED - Use MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-task-manager?retryWrites=true&w=majority

# JWT Secrets (REQUIRED - Generate strong secrets)
JWT_SECRET=<generate-32-char-hex>
SESSION_SECRET=<generate-32-char-hex>

# Frontend URL (REQUIRED)
CLIENT_URL=https://your-frontend.vercel.app

# Redis (OPTIONAL - Leave empty to use in-memory)
REDIS_URL=redis://default:password@redis-xxxxx.upstash.io:6379

# AI Service (OPTIONAL - Only if you have AI service deployed)
AI_SERVICE_URL=http://your-ai-service-url:8000
AI_SERVICE_TIMEOUT=30000
AI_SERVICE_RETRY_ATTEMPTS=3
AI_ENABLE_MONITORING=false

# Email (OPTIONAL - Only if you want email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
```

#### Generate Secrets

Use Node.js to generate secure secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use online generator: https://generate-secret.vercel.app/32

### Step 4: Update Environment Variables

1. Go to Render Dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add each variable
5. Click "Save Changes"
6. Service will automatically redeploy

## Minimal Working Configuration

For a basic working deployment, you only need:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas connection string
JWT_SECRET=<your-secret>
SESSION_SECRET=<your-secret>
CLIENT_URL=https://your-frontend.vercel.app
```

**Redis is optional** - the app will work without it using in-memory alternatives.

## Verification Steps

### 1. Check Logs After Deployment

Look for these success messages:

```
✅ MongoDB connected successfully
✅ Socket.IO initialized
Server running on port 5000
```

### 2. Test Health Endpoint

```bash
curl https://your-app.onrender.com/api/health
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

### 3. Test API Endpoints

```bash
# Test registration
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "employee"
  }'
```

## Troubleshooting

### MongoDB Connection Still Failing

**Check:**
1. Connection string is correct
2. Username and password are correct
3. Database name is included in connection string
4. IP whitelist includes `0.0.0.0/0`
5. Network access is enabled in MongoDB Atlas

**Test connection locally:**
```bash
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-task-manager"
```

### Redis Connection Failing (Optional)

**If you want Redis:**
1. Verify REDIS_URL is correct
2. Check Redis service is running
3. Test connection with redis-cli

**If you don't need Redis:**
- Simply don't set REDIS_URL
- App will use in-memory alternatives
- You'll see warnings in logs (this is normal)

### Application Crashes on Startup

**Check logs for:**
1. Missing required environment variables
2. Invalid MongoDB connection string
3. Port conflicts
4. Memory limits

**Common fixes:**
```bash
# In Render Dashboard
# 1. Check Environment tab - all required vars set
# 2. Check Logs tab - look for specific error
# 3. Try Manual Deploy to restart
```

## MongoDB Atlas Setup (Detailed)

### 1. Create Account
- Go to https://www.mongodb.com/cloud/atlas/register
- Sign up (free tier available)

### 2. Create Cluster
- Choose "Shared" (Free tier)
- Select region closest to your Render deployment
- Cluster name: `Cluster0` (default)

### 3. Create Database User
- Security → Database Access
- Add New Database User
- Authentication Method: Password
- Username: `admin` (or your choice)
- Password: Auto-generate or create strong password
- Database User Privileges: Read and write to any database
- Add User

### 4. Configure Network Access
- Security → Network Access
- Add IP Address
- Allow Access from Anywhere: `0.0.0.0/0`
- Or add specific Render IP ranges
- Confirm

### 5. Get Connection String
- Deployment → Database → Connect
- Choose: Connect your application
- Driver: Node.js
- Version: 4.1 or later
- Copy connection string:
  ```
  mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with your actual password
- Add database name: `/ai-task-manager` before the `?`
  ```
  mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/ai-task-manager?retryWrites=true&w=majority
  ```

### 6. Test Connection
```bash
# Install MongoDB Shell
npm install -g mongosh

# Test connection
mongosh "mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/ai-task-manager"

# Should connect successfully
```

## Redis Setup (Optional)

### Upstash Redis (Free Tier)

1. Go to https://upstash.com/
2. Sign up
3. Create Redis Database
   - Name: `ai-task-manager-cache`
   - Region: Choose closest to Render
   - Type: Regional (free)
4. Get connection string:
   ```
   redis://default:password@redis-xxxxx.upstash.io:6379
   ```
5. Add to Render environment as `REDIS_URL`

### Render Redis (Paid)

1. Render Dashboard → New + → Redis
2. Name: `ai-task-manager-redis`
3. Plan: Starter ($7/month)
4. Create
5. Copy internal connection string
6. Add to environment as `REDIS_URL`

## Environment Variable Template

Copy this template and fill in your values:

```env
# ============================================
# REQUIRED - Application will not work without these
# ============================================

NODE_ENV=production
PORT=5000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-task-manager?retryWrites=true&w=majority

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-32-char-hex-secret-here
SESSION_SECRET=your-different-32-char-hex-secret-here

# Your frontend URL (Vercel deployment URL)
CLIENT_URL=https://your-app.vercel.app

# ============================================
# OPTIONAL - Application works without these
# ============================================

# Redis (for distributed caching and rate limiting)
# Leave empty to use in-memory alternatives
REDIS_URL=

# AI Service (only if you have AI service deployed)
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TIMEOUT=30000
AI_SERVICE_RETRY_ATTEMPTS=3
AI_ENABLE_MONITORING=false

# Email (for password reset and notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Logging
LOG_LEVEL=info
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Quick Start Checklist

- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created
- [ ] Database user created
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string obtained
- [ ] JWT_SECRET generated
- [ ] SESSION_SECRET generated
- [ ] All required environment variables added to Render
- [ ] Service redeployed
- [ ] Health endpoint tested
- [ ] API endpoints tested

## Expected Logs After Fix

After configuring MongoDB correctly, you should see:

```
[INFO] [APP] Starting MoveIt Task Manager Backend
[INFO] [APP] Express server initialized
[INFO] [APP] Configuring middleware
[INFO] [APP] Connecting to MongoDB...
✅ MongoDB connected successfully  # <-- This should appear
[INFO] [APP] Registering API routes
[INFO] [APP] All routes registered successfully
✅ Socket.IO initialized
Server running on port 5000
API Documentation available at http://localhost:5000/api/docs
WebSocket server initialized
```

Redis warnings are OK if you're not using Redis:
```
[WARN] [RATE_LIMITER] Using in-memory rate limiter (Redis not available)
[ERROR] [REDIS_CACHE] Redis client error
```

## Support

If you still have issues after following this guide:

1. Check Render logs for specific errors
2. Verify MongoDB connection string is correct
3. Test MongoDB connection locally with mongosh
4. Ensure all required environment variables are set
5. Try manual redeploy in Render dashboard

---

**Status**: Configuration Required
**Priority**: Critical (MongoDB) / Optional (Redis)
**Time to Fix**: 15-30 minutes
**Last Updated**: November 24, 2025
