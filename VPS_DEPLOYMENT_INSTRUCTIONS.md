# 🚀 VPS Deployment Instructions - Step by Step

## Server Information
- **IP**: 127.0.0.1
- **Username**: root
- **Password**: MY-PASSWORD
- **Directory**: /var/www/neshastyar.com

---

## ⚠️ IMPORTANT: Run Database Migration FIRST!

Before deploying code, you MUST add the new columns to the database.

### Go to phpMyAdmin:
URL: http://phpmyadmin.teraxr.com/local

### Select Database:
- Database: `modiryar`
- Table: `meetings`
- Click "SQL" tab

### Run this SQL:
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

## 📝 Deployment Steps

### Option 1: Use the Deployment Script (EASIEST)

1. **Push the deployment script to your repo:**
   ```bash
   # On your local machine
   git add deploy.sh
   git commit -m "Add deployment script"
   git push origin main
   ```

2. **SSH into your VPS:**
   - Use PuTTY, Terminal, or any SSH client
   - Host: 127.0.0.1
   - Username: root
   - Password: MY-PASSWORD

3. **Run the deployment script:**
   ```bash
   cd /var/www/neshastyar.com
   git pull origin main
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Done!** The script will:
   - Pull latest code
   - Install dependencies
   - Create uploads directory
   - Set permissions
   - Restart backend with PM2
   - Show status and logs

---

### Option 2: Manual Deployment (STEP BY STEP)

1. **SSH into VPS:**
   ```bash
   ssh root@127.0.0.1
   # Password: MY-PASSWORD
   ```

2. **Navigate to project directory:**
   ```bash
   cd /var/www/neshastyar.com
   ```

3. **Pull latest code:**
   ```bash
   git pull origin main
   ```

4. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

5. **Create uploads directory:**
   ```bash
   mkdir -p uploads/audio
   ```

6. **Set permissions:**
   ```bash
   chmod -R 755 uploads
   chown -R root:root uploads
   ```

7. **Verify directory:**
   ```bash
   ls -la uploads/
   ```

8. **Install PM2 (if not installed):**
   ```bash
   npm install -g pm2
   ```

9. **Restart backend:**
   ```bash
   # If backend is already running:
   pm2 restart neshastyar-backend

   # If backend is NOT running (first time):
   pm2 start src/server.js --name neshastyar-backend
   pm2 save
   pm2 startup
   ```

10. **Check status:**
    ```bash
    pm2 status
    pm2 logs neshastyar-backend
    ```

11. **Test backend:**
    ```bash
    curl http://localhost:3001/health
    ```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Database migration completed (new columns added)
- [ ] Code pulled successfully
- [ ] Dependencies installed (`node_modules` exists)
- [ ] Uploads directory created (`backend/uploads/audio/` exists)
- [ ] Permissions set correctly (755 on uploads)
- [ ] PM2 process running (`pm2 status` shows neshastyar-backend online)
- [ ] Backend responds to health check
- [ ] No errors in logs (`pm2 logs neshastyar-backend`)

---

## 🔍 Troubleshooting Commands

```bash
# Check if backend is running
pm2 status

# View backend logs
pm2 logs neshastyar-backend

# Restart backend
pm2 restart neshastyar-backend

# Stop backend
pm2 stop neshastyar-backend

# Start backend
pm2 start neshastyar-backend

# Check uploads directory
ls -la /var/www/neshastyar.com/backend/uploads

# Check disk space
df -h

# Check backend port
netstat -tulpn | grep 3001

# Test backend manually
curl http://localhost:3001/health

# Check Node.js version
node --version

# Check npm version
npm --version
```

---

## 📱 Test the Upload Feature

1. **Go to your frontend:**
   - URL: http://neshastyar.com (or http://127.0.0.1)

2. **Login to your account**

3. **Record or upload an audio file**

4. **Select tags**

5. **Click "ذخیره جلسه" (Save Session)**

6. **Verify on VPS:**
   ```bash
   ls -la /var/www/neshastyar.com/backend/uploads/audio/
   # You should see a directory with your user ID
   
   ls -la /var/www/neshastyar.com/backend/uploads/audio/{your-user-id}/
   # You should see the uploaded audio file
   ```

---

## 🆘 Common Issues

### Issue: "ALTER command denied"
**Solution**: Run SQL in phpMyAdmin (see top of this document)

### Issue: "Permission denied" on uploads
**Solution**:
```bash
chmod -R 777 /var/www/neshastyar.com/backend/uploads
```

### Issue: Backend not starting
**Solution**:
```bash
cd /var/www/neshastyar.com/backend
pm2 delete neshastyar-backend
pm2 start src/server.js --name neshastyar-backend
pm2 logs neshastyar-backend
```

### Issue: Port 3001 already in use
**Solution**:
```bash
# Find process using port 3001
netstat -tulpn | grep 3001
# Kill the process
kill -9 <PID>
# Or use PM2
pm2 restart neshastyar-backend
```

### Issue: Git pull fails
**Solution**:
```bash
cd /var/www/neshastyar.com
git stash
git pull origin main
```

---

## 📞 Need More Help?

1. Check `pm2 logs neshastyar-backend` for errors
2. Check disk space with `df -h`
3. Verify permissions with `ls -la backend/uploads`
4. Test backend manually with `curl http://localhost:3001/health`

---

**Last Updated**: September 30, 2025
**Status**: Ready for Deployment

---

**🎉 Good luck with your deployment!**

