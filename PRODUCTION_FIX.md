# 🔧 Production CORS Fix - Quick Guide

## ❌ Current Problem

Your production site at https://modiryar.online shows this error:
```
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'https://modiryar.online' 
has been blocked by CORS policy
```

**Why?** The production frontend is trying to connect to `localhost:3001` instead of the production backend.

---

## ✅ Solution (3 Steps)

### Step 1: Push Updated Code

On your local machine:

```bash
# Commit and push the fixes
git add .
git commit -m "Fix production API URL and CORS"
git push origin main
```

### Step 2: Deploy to VPS

SSH to your VPS and run the deployment script:

```bash
# SSH to VPS
ssh root@195.248.240.30
# Password: Terraworld2020

# Navigate to project
cd /root/modiryar

# Run deployment script
./deploy.sh
```

The script will:
- Pull latest code
- Install dependencies  
- Build frontend with `VITE_API_URL=https://modiryar.online/api`
- Deploy to `/var/www/modiryar.online`
- Restart backend with updated CORS settings

### Step 3: Configure Nginx (One-Time Setup)

You need Nginx to proxy `/api/` requests to your backend on port 3001.

**Check if this is already configured:**

```bash
# View your current Nginx config
sudo cat /etc/nginx/sites-available/modiryar
# or
sudo cat /etc/nginx/sites-enabled/default

# Look for a location /api/ block
```

**If `/api/` proxy is NOT configured**, add it to your Nginx config:

```nginx
# Inside your server block, add:
location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # For large file uploads
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    client_max_body_size 500M;
}
```

Then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 What We Fixed

### 1. Frontend API URL
**Before**: `const API_BASE_URL = "http://localhost:3001/api"`  
**After**: `const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"`

Now it uses:
- **Development**: `http://localhost:3001/api`
- **Production**: `https://modiryar.online/api` (set by `.env.production`)

### 2. Backend CORS
**Before**: Only allowed localhost origins  
**After**: Added production domain:
```javascript
origin: [
  'https://modiryar.online',  // ← Added
  'http://modiryar.online',   // ← Added
  'http://localhost:8080',
  // ... other dev ports
]
```

### 3. Deployment Script
**Updated**: Now creates `.env.production` with correct API URL during build

---

## ✅ Verification

After deployment, test:

1. **Visit**: https://modiryar.online/login
2. **Try to login**
3. **Should work** without CORS errors

To verify the API URL is correct:
```bash
# On VPS, check the built frontend
grep -r "VITE_API_URL" /root/modiryar/.env.production

# Should show:
# VITE_API_URL=https://modiryar.online/api
```

---

## 🆘 If Still Not Working

### Check Backend is Running:
```bash
pm2 status
pm2 logs modiryar-backend
```

### Check Nginx Proxy:
```bash
# Test backend directly
curl http://localhost:3001/health

# Test through Nginx
curl https://modiryar.online/api/health
```

### Check Frontend Build:
```bash
# Verify the built files have the correct API URL
cd /root/modiryar
cat .env.production
```

---

## 📚 Documentation

- **Nginx Configuration**: See `NGINX_CONFIG.md`
- **Deployment Guide**: See `DEPLOYMENT_GUIDE_VPS.md`
- **VPS Setup**: See `SETUP_VPS.md`

---

**After running these steps, your production site should work perfectly!** 🎉

