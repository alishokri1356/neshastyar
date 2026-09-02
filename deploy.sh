#!/bin/bash

# Neshastyar Audio Storage Deployment Script
# A script to automate the deployment of Neshastyar on the VPS

# Exit immediately if any command fails, preventing a partial/broken deployment.
set -e

echo "🚀 Starting Neshastyar Deployment..."
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
PROJECT_DIR="/root/neshastyar"
if [ ! -d "$PROJECT_DIR" ] && [ -d "/root/modiryar" ]; then
  PROJECT_DIR="/root/modiryar"
fi
cd "$PROJECT_DIR" || exit 1
echo -e "${GREEN}✅ In directory: $(pwd)${NC}"
echo ""

# 2. Pull latest code from GitHub
echo "--- Pulling latest changes from GitHub ---"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$BRANCH"
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
pm2 delete neshastyar-backend 2>/dev/null || true
pm2 delete modiryar-backend 2>/dev/null || true

# Start the backend application with PM2
echo "--- Starting backend with PM2 ---"
pm2 start src/server.js --name neshastyar-backend

# Save PM2 configuration
pm2 save

# Verify the backend is running
echo "--- Verifying backend startup ---"
sleep 3
pm2 status neshastyar-backend

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
cd "$PROJECT_DIR" || exit 1

# Install frontend dependencies
echo "--- Installing frontend dependencies ---"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Create production environment file for frontend
echo "--- Creating production environment ---"
# Use the same domain with /api path (Nginx will proxy to backend)
echo "VITE_API_URL=https://neshastyar.com/api" > .env.production

# Build the final, optimized production-ready static files
echo "--- Building frontend ---"
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Copy the contents of the 'dist' folder to the Nginx web directory
echo "--- Syncing build files to web root ---"
mkdir -p /var/www/neshastyar.com
rm -rf /var/www/neshastyar.com/assets
cp -R dist/* /var/www/neshastyar.com/
echo -e "${GREEN}✅ Frontend files synced to /var/www/neshastyar.com/${NC}"
echo -e "${GREEN}   Built from commit: $(git -C "$PROJECT_DIR" rev-parse --short HEAD)${NC}"

echo "--- Frontend deployment complete ---"
echo ""

# --- Summary ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 FULL DEPLOYMENT SUCCESSFUL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Project Directory: $PROJECT_DIR"
echo "📁 Backend: $PROJECT_DIR/backend"
echo "📁 Uploads: $PROJECT_DIR/backend/uploads/audio"
echo "📁 Frontend: /var/www/neshastyar.com"
echo "🔌 Backend Port: 3001"
echo "🌐 Domain: neshastyar.com"
echo ""
echo "Useful Commands:"
echo "  pm2 logs neshastyar-backend      # View backend logs"
echo "  pm2 restart neshastyar-backend   # Restart backend"
echo "  pm2 stop neshastyar-backend      # Stop backend"
echo "  pm2 status                     # Check all PM2 processes"
echo "  ls -la $PROJECT_DIR/backend/uploads/audio  # Check uploads"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. Update .env file with production values if needed"
echo "2. Run database migration in phpMyAdmin:"
echo "   URL: http://phpmyadmin.online/local"
echo "   Database: modiryar"
echo "   Table: meetings"
echo "   SQL: See VPS_DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo -e "${GREEN}Deployment completed at $(date)${NC}"
echo ""
