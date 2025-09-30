#!/bin/bash

# Modiryar Audio Storage Deployment Script
# Run this script on your VPS at /var/www/modiryar.teraxr.com

echo "🚀 Starting Modiryar Audio Storage Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running as root${NC}"
echo ""

# 1. Navigate to project directory
cd /var/www/modiryar.teraxr.com || exit 1
echo -e "${GREEN}✅ In directory: $(pwd)${NC}"
echo ""

# 2. Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from git...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# 3. Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd backend || exit 1
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# 4. Create uploads directory
echo -e "${YELLOW}📁 Creating uploads directory...${NC}"
mkdir -p uploads/audio
echo -e "${GREEN}✅ Uploads directory created${NC}"
echo ""

# 5. Set permissions
echo -e "${YELLOW}🔒 Setting permissions...${NC}"
chmod -R 755 uploads
chown -R root:root uploads
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# 6. Verify directory structure
echo -e "${YELLOW}📋 Verifying directory structure...${NC}"
ls -la uploads/
echo ""

# 7. Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 PM2 not found. Installing...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed${NC}"
fi
echo ""

# 8. Check if backend process exists
if pm2 list | grep -q "modiryar-backend"; then
    echo -e "${YELLOW}🔄 Restarting backend...${NC}"
    pm2 restart modiryar-backend
    echo -e "${GREEN}✅ Backend restarted${NC}"
else
    echo -e "${YELLOW}🚀 Starting backend for the first time...${NC}"
    pm2 start src/server.js --name modiryar-backend
    pm2 save
    echo -e "${GREEN}✅ Backend started${NC}"
fi
echo ""

# 9. Show backend status
echo -e "${YELLOW}📊 Backend status:${NC}"
pm2 status modiryar-backend
echo ""

# 10. Show logs (last 20 lines)
echo -e "${YELLOW}📝 Recent backend logs:${NC}"
pm2 logs modiryar-backend --lines 20 --nostream
echo ""

# 11. Test backend health
echo -e "${YELLOW}🏥 Testing backend health...${NC}"
sleep 2
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Check logs with: pm2 logs modiryar-backend"
fi
echo ""

# 12. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 App Directory: $(pwd)"
echo "📁 Uploads Directory: $(pwd)/uploads/audio"
echo "🔌 Backend Port: 3001"
echo "🌐 Domain: modiryar.teraxr.com"
echo ""
echo "Useful Commands:"
echo "  pm2 logs modiryar-backend      # View logs"
echo "  pm2 restart modiryar-backend   # Restart backend"
echo "  pm2 stop modiryar-backend      # Stop backend"
echo "  ls -la uploads/audio           # Check uploads"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Don't forget to run the database migration!${NC}"
echo "   Go to: http://phpmyadmin.teraxr.com/local"
echo "   Database: modiryar"
echo "   Table: meetings"
echo "   Run the SQL commands from DEPLOYMENT_GUIDE_VPS.md (STEP 2)"
echo ""
