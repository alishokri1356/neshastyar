# 🚀 VPS Setup Instructions

## Server Information
- **IP**: 127.0.0.1
- **Username**: root
- **Password**: MY-PASSWORD
- **GitHub Repo**: https://github.com/alishokri1356/neshastyar.git

---

## 📝 ONE-TIME SETUP (Do this first!)

### Step 1: SSH into your VPS

```bash
ssh root@127.0.0.1
# Password: MY-PASSWORD
```

### Step 2: Create directory and clone project

```bash
# Create neshastyar directory in /root
cd /root
mkdir -p neshastyar

# Clone the project from GitHub
cd neshastyar
git clone https://github.com/alishokri1356/neshastyar.git .

# Verify the clone
ls -la
```

### Step 3: Make deployment script executable

```bash
chmod +x deploy.sh
```

### Step 4: Install PM2 globally (if not already installed)

```bash
npm install -g pm2
```

### Step 5: Setup PM2 to start on boot

```bash
pm2 startup
# Follow the instructions it gives you
```

---

## ⚠️ IMPORTANT: Run Database Migration FIRST!

Before running the deployment script, add the new columns to your database:

1. **Go to phpMyAdmin**: http://phpmyadmin.teraxr.com/local
2. **Select database**: `modiryar`
3. **Select table**: `meetings`
4. **Click "SQL" tab**
5. **Run this SQL**:

```sql
ALTER TABLE `meetings`
ADD COLUMN `audio_file_path` VARCHAR(500) NULL,
ADD COLUMN `audio_file_size` BIGINT NULL,
ADD COLUMN `audio_duration` INT DEFAULT 0,
ADD COLUMN `audio_format` VARCHAR(50) NULL,
ADD COLUMN `title` VARCHAR(255) NULL,

CREATE INDEX `idx_audio_file_path` ON `meetings` (`audio_file_path`);
CREATE INDEX `idx_title` ON `meetings` (`title`);
```

---

## 🚀 DEPLOYMENT (Run this every time you want to deploy)

### Option 1: Run the deployment script (RECOMMENDED)

```bash
cd /root/neshastyar
./deploy.sh
```

The script will automatically:
- Pull latest code from GitHub
- Install backend dependencies
- Setup environment variables
- Create uploads directory
- Deploy backend with PM2
- Install frontend dependencies
- Build frontend
- Copy frontend files to /var/www/neshastyar.com

### Option 2: Manual deployment

If the script fails, you can deploy manually:

```bash
# 1. Navigate to project
cd /root/neshastyar

# 2. Pull latest code
git pull origin main

# 3. Deploy backend
cd backend
npm install --production
mkdir -p uploads/audio
chmod -R 755 uploads
pm2 delete neshastyar-backend 2>/dev/null || true
pm2 start src/server.js --name neshastyar-backend
pm2 save

# 4. Deploy frontend
cd /root/neshastyar
npm install
npm run build
sudo cp -R dist/* /var/www/neshastyar.com/
```

---

## 📁 Directory Structure on VPS

```
/root/neshastyar/                          # Git repository (source code)
├── backend/
│   ├── src/
│   ├── uploads/audio/                   # Audio files storage
│   ├── .env                             # Environment variables
│   └── package.json
├── src/                                 # Frontend source
├── dist/                                # Built frontend (generated)
├── deploy-to-vps.sh                     # Deployment script
└── package.json

/var/www/neshastyar.com/            # Nginx web root (served files)
├── index.html
├── assets/
└── ... (built frontend files)
```

---

## ✅ Verification Commands

After deployment, verify everything is working:

```bash
# Check backend is running
pm2 status

# View backend logs
pm2 logs neshastyar-backend --lines 50

# Test backend health
curl http://localhost:3001/health

# Check uploads directory
ls -la /root/neshastyar/backend/uploads/audio/

# Check frontend files
ls -la /var/www/neshastyar.com/

# Check disk space
df -h
```

---

## 🔄 Regular Deployment Workflow

When you push changes to GitHub:

```bash
# 1. SSH to VPS
ssh root@127.0.0.1

# 2. Run deployment script
cd /root/neshastyar
./deploy.sh

# 3. Verify deployment
pm2 status
pm2 logs neshastyar-backend --lines 20
```

---

## 🆘 Troubleshooting

### Problem: "fatal: not a git repository"
**Solution**: You haven't cloned the repo yet. Run the setup steps above.

### Problem: "Permission denied" on deploy.sh
**Solution**: 
```bash
chmod +x deploy.sh
```

### Problem: Backend not starting
**Solution**:
```bash
pm2 logs neshastyar-backend
pm2 restart neshastyar-backend
```

### Problem: Frontend not updating
**Solution**:
```bash
cd /root/neshastyar
npm run build
sudo cp -R dist/* /var/www/neshastyar.com/
```

### Problem: Port 3001 already in use
**Solution**:
```bash
pm2 delete neshastyar-backend
pm2 start /root/neshastyar/backend/src/server.js --name neshastyar-backend
```

### Problem: Out of disk space
**Solution**:
```bash
# Check disk usage
df -h

# Clean up old uploads if needed
find /root/neshastyar/backend/uploads/audio -type f -mtime +30 -delete

# Clean PM2 logs
pm2 flush
```

---

## 📞 Useful Commands

```bash
# PM2 Commands
pm2 status                           # Show all processes
pm2 logs neshastyar-backend            # View logs
pm2 restart neshastyar-backend         # Restart backend
pm2 stop neshastyar-backend            # Stop backend
pm2 delete neshastyar-backend          # Delete process
pm2 save                             # Save current process list
pm2 flush                            # Clear logs

# Git Commands
git status                           # Check git status
git pull origin main                 # Pull latest changes
git log --oneline -10                # View recent commits

# File Management
ls -la /root/neshastyar                # List project files
ls -la /var/www/neshastyar.com  # List web files
du -sh /root/neshastyar/backend/uploads # Check uploads size

# System Commands
df -h                                # Check disk space
free -h                              # Check memory
ps aux | grep node                   # Check node processes
netstat -tulpn | grep 3001           # Check port 3001
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Deploy | `cd /root/neshastyar && ./deploy.sh` |
| Check status | `pm2 status` |
| View logs | `pm2 logs neshastyar-backend` |
| Restart | `pm2 restart neshastyar-backend` |
| Pull code | `cd /root/neshastyar && git pull` |

---

**Last Updated**: September 30, 2025  
**Status**: Ready for Production Deployment

---

**🎉 Your VPS is ready to go!**

