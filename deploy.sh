#!/bin/bash

# Modiryar Audio Storage Deployment Script
# A script to automate the deployment of Modiryar on the VPS

# Exit immediately if any command fails, preventing a partial/broken deployment.
set -e

echo "🚀 Starting Modiryar Deployment..."
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
cd /root/modiryar || exit 1
echo -e "${GREEN}✅ In directory: $(pwd)${NC}"
echo ""

# 2. Pull latest code from GitHub
echo "--- Pulling latest changes from GitHub ---"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# --- Deploying Backend ---
echo "--- Deploying Backend ---"
# Navigate to the backend directory
cd backend || exit 1

# Install dependencies (production only)
npm install --production
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# --- CRITICAL: Setup Environment Variables ---
echo "--- Setting up environment variables ---"
# Ensure .env file exists (copy from env.example if not)
if [ ! -f .env ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
    echo -e "${YELLOW}⚠️  Please update .env file with production values${NC}"
fi

# Create uploads directory
echo "--- Creating uploads directory ---"
mkdir -p uploads/audio
chmod -R 755 uploads
chown -R root:root uploads
echo -e "${GREEN}✅ Uploads directory created with correct permissions${NC}"

# Ensure PM2 ecosystem config is up to date
echo "--- Updating PM2 configuration ---"
# Delete existing PM2 process to ensure clean restart with new env vars
pm2 delete modiryar-backend 2>/dev/null || true

# Start the backend application with PM2
echo "--- Starting backend with PM2 ---"
pm2 start src/server.js --name modiryar-backend

# Save PM2 configuration
pm2 save

# Verify the backend is running
echo "--- Verifying backend startup ---"
sleep 3
pm2 status modiryar-backend

# Test backend health
echo "--- Testing backend health ---"
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${RED}⚠️  Backend health check failed - check logs${NC}"
fi

echo "--- Backend deployment complete ---"
echo ""

# --- Deploying Frontend ---
echo "--- Deploying Frontend ---"
# Navigate to the frontend directory (root of project)
cd /root/modiryar || exit 1

# Install frontend dependencies
echo "--- Installing frontend dependencies ---"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Create production environment file for frontend
echo "--- Creating production environment ---"
# Use the same domain with /api path (Nginx will proxy to backend)
echo "VITE_API_URL=https://modiryar.teraxr.com/api" > .env.production

# Build the final, optimized production-ready static files
echo "--- Building frontend ---"
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Copy the contents of the 'dist' folder to the Nginx web directory
echo "--- Copying build files to web root ---"
sudo cp -R dist/* /var/www/modiryar.teraxr.com/
echo -e "${GREEN}✅ Frontend files copied to /var/www/modiryar.teraxr.com/${NC}"

echo "--- Frontend deployment complete ---"
echo ""

# --- Summary ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 FULL DEPLOYMENT SUCCESSFUL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Project Directory: /root/modiryar"
echo "📁 Backend: /root/modiryar/backend"
echo "📁 Uploads: /root/modiryar/backend/uploads/audio"
echo "📁 Frontend: /var/www/modiryar.teraxr.com"
echo "🔌 Backend Port: 3001"
echo "🌐 Domain: modiryar.teraxr.com"
echo ""
echo "Useful Commands:"
echo "  pm2 logs modiryar-backend      # View backend logs"
echo "  pm2 restart modiryar-backend   # Restart backend"
echo "  pm2 stop modiryar-backend      # Stop backend"
echo "  pm2 status                     # Check all PM2 processes"
echo "  ls -la /root/modiryar/backend/uploads/audio  # Check uploads"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. Update .env file with production values if needed"
echo "2. Run database migration in phpMyAdmin:"
echo "   URL: http://phpmyadmin.teraxr.com/local"
echo "   Database: modiryar"
echo "   Table: meetings"
echo "   SQL: See VPS_DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo -e "${GREEN}Deployment completed at $(date)${NC}"
echo ""
