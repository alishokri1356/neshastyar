# Nginx Configuration for Modiryar

## 🔧 Required Nginx Configuration

The production frontend at https://modiryar.online needs to proxy API requests to the backend running on port 3001.

---

## 📝 Nginx Configuration File

Location: `/etc/nginx/sites-available/modiryar` (or similar)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name modiryar.online;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name modiryar.online;

    # SSL configuration (update with your actual SSL certificate paths)
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Increase upload size limit for large audio files (100MB+)
    client_max_body_size 500M;
    
    # Increase timeouts for large file uploads
    client_body_timeout 600s;
    send_timeout 600s;

    # Frontend - Serve static files
    location / {
        root /var/www/modiryar.online;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        
        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Pass headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large file uploads
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_connect_timeout 600s;
        
        # Allow large file uploads
        proxy_request_buffering off;
    }

    # Serve uploaded audio files (optional - if you want direct access)
    # WARNING: This bypasses authentication! Better to proxy through backend
    # location /uploads/ {
    #     alias /root/modiryar/backend/uploads/;
    #     internal;  # Only accessible through X-Accel-Redirect from backend
    # }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/modiryar-access.log;
    error_log /var/log/nginx/modiryar-error.log;
}
```

---

## 🚀 How to Apply Configuration

### Step 1: Edit Nginx Configuration

```bash
# SSH into your VPS
ssh root@127.0.0.1

# Edit the Nginx configuration
sudo nano /etc/nginx/sites-available/modiryar

# Paste the configuration above
# Update SSL certificate paths if you have them
```

### Step 2: Enable the Site (if not already enabled)

```bash
# Create symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/modiryar /etc/nginx/sites-enabled/

# Or if it already exists, just continue
```

### Step 3: Test Configuration

```bash
# Test Nginx configuration for syntax errors
sudo nginx -t

# If you see "syntax is ok" and "test is successful", continue
```

### Step 4: Reload Nginx

```bash
# Reload Nginx to apply changes
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx
```

### Step 5: Verify

```bash
# Check Nginx status
sudo systemctl status nginx

# Test API endpoint
curl https://modiryar.online/api/health
```

---

## 🔍 Troubleshooting

### Problem: "nginx: configuration file test failed"
**Solution**: Check syntax errors in the config file
```bash
sudo nginx -t
# Read the error message and fix the line mentioned
```

### Problem: 502 Bad Gateway
**Solution**: Backend is not running
```bash
pm2 status
pm2 restart modiryar-backend
```

### Problem: 413 Request Entity Too Large
**Solution**: Increase client_max_body_size
```nginx
client_max_body_size 500M;
```

### Problem: 504 Gateway Timeout
**Solution**: Increase timeouts
```nginx
proxy_read_timeout 600s;
proxy_send_timeout 600s;
client_body_timeout 600s;
```

### Problem: CORS errors
**Solution**: Check backend CORS settings and ensure Nginx is proxying correctly

---

## 📊 Current Configuration

- **Frontend**: Served from `/var/www/modiryar.online`
- **Backend**: Proxied from `localhost:3001` to `/api/`
- **Upload Limit**: 500MB
- **Timeout**: 600 seconds
- **SSL**: Required (HTTPS)

---

## ✅ Quick Check Commands

```bash
# Check if Nginx is running
sudo systemctl status nginx

# Check if backend is running
pm2 status

# Test backend directly
curl http://localhost:3001/health

# Test through Nginx
curl https://modiryar.online/api/health

# View Nginx logs
sudo tail -f /var/log/nginx/modiryar-error.log
sudo tail -f /var/log/nginx/modiryar-access.log

# View backend logs
pm2 logs modiryar-backend
```

---

**After applying this configuration, your production frontend will be able to communicate with the backend!**

