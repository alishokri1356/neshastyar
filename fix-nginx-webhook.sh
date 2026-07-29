#!/bin/bash

# Quick Fix Script for Nginx Webhook Configuration
# Run this on your Ubuntu server to fix the webhook routing

echo "🔧 Fixing Nginx configuration for webhook support..."

# Backup current configuration
sudo cp /etc/nginx/sites-available/neshastyar.com /etc/nginx/sites-available/neshastyar.com.backup.$(date +%Y%m%d_%H%M%S)

echo "📋 Current Nginx configuration:"
sudo cat /etc/nginx/sites-available/neshastyar.com

echo ""
echo "🔍 Looking for webhook location block..."
if grep -q "location /sendmail/" /etc/nginx/sites-available/neshastyar.com; then
    echo "✅ Webhook location block already exists!"
else
    echo "❌ Webhook location block missing. Adding it..."
    
    # Add webhook location block before the /api/ block
    sudo sed -i '/location \/api\//i\
    # Webhook endpoint - Proxy to Node.js backend\
    location /sendmail/ {\
        proxy_pass http://localhost:3001/sendmail/;\
        proxy_http_version 1.1;\
        \
        # Pass headers\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        \
        # Timeouts\
        proxy_read_timeout 30s;\
        proxy_send_timeout 30s;\
        proxy_connect_timeout 30s;\
    }\
' /etc/nginx/sites-available/neshastyar.com
fi

echo ""
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid!"
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
    
    echo ""
    echo "🧪 Testing webhook endpoint..."
    curl -s https://neshastyar.com/sendmail/test-meeting-id | head -c 100
    echo ""
    
    echo "🎉 Webhook configuration complete!"
else
    echo "❌ Nginx configuration has errors. Please check manually."
    echo "📋 Current configuration:"
    sudo cat /etc/nginx/sites-available/neshastyar.com
fi
