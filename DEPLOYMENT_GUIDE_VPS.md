# 🚀 Complete Deployment Guide for Ubuntu VPS
## Modiryar Audio Storage Implementation

**Server IP:** 195.248.240.30  
**Approach:** Option 1 - Filesystem Storage (Recommended for 100MB+ files)

---

## 📋 Prerequisites

- Ubuntu VPS with root or sudo access
- Node.js installed (v16+ recommended)
- MySQL server running
- SSH access to the VPS

---

## 🔧 STEP-BY-STEP IMPLEMENTATION

### **STEP 1: SSH into Your VPS**

```bash
# From your local machine
ssh root@195.248.240.30
# Or if you have a specific user
ssh your_username@195.248.240.30
```

---

### **STEP 2: Run Database Migration**

You need to add the new columns to the `meetings` table. You have two options:

#### **Option A: Using phpMyAdmin (Easiest)**

1. Go to your phpMyAdmin at: http://phpmyadmin.teraxr.com/local
2. Select the `modiryar` database
3. Click on the `meetings` table
4. Click on the "SQL" tab
5. Copy and paste this SQL command:

```sql
-- Add audio storage columns
ALTER TABLE `meetings`
ADD COLUMN `audio_file_path` VARCHAR(500) NULL COMMENT 'Full path to audio file',
ADD COLUMN `audio_file_size` BIGINT NULL COMMENT 'File size in bytes',
ADD COLUMN `audio_duration` INT DEFAULT 0 COMMENT 'Audio duration in seconds',
ADD COLUMN `audio_format` VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)',
ADD COLUMN `title` VARCHAR(255) NULL COMMENT 'Meeting title',
ADD COLUMN `storage_type` ENUM('local', 's3', 'supabase', 'other') DEFAULT 'local' COMMENT 'Storage location';

-- Add indexes for better performance
CREATE INDEX `idx_audio_file_path` ON `meetings` (`audio_file_path`);
CREATE INDEX `idx_storage_type` ON `meetings` (`storage_type`);
CREATE INDEX `idx_title` ON `meetings` (`title`);
```

6. Click "Go" to execute

#### **Option B: Using MySQL Command Line**

```bash
# SSH into your VPS first
ssh root@195.248.240.30

# Connect to MySQL
mysql -u root -p modiryar

# Or connect remotely from your local machine
mysql -h 195.248.240.30 -u root -p modiryar

# Then paste the SQL commands from Option A
```

---

### **STEP 3: Create Upload Directory on VPS**

```bash
# SSH into your VPS
ssh root@195.248.240.30

# Navigate to your application directory
cd /var/www/modiryar.teraxr.com

# Create the backend directory structure if not exists
mkdir -p backend/uploads/audio

# Set proper permissions
chmod 755 backend/uploads
chmod 755 backend/uploads/audio

# Set owner - Find your web server user first:
# Check which user is running your web server:
ps aux | grep -E 'apache|nginx|httpd' | head -1
# Or check which user node process runs as:
whoami

# Then set owner (common options):
chown -R www-data:www-data backend/uploads  # For Apache/Ubuntu
# OR
chown -R apache:apache backend/uploads      # For Apache/CentOS
# OR
chown -R root:root backend/uploads          # If running as root
# OR for current user:
chown -R $(whoami):$(whoami) backend/uploads
```

---

### **STEP 4: Install Required Packages**

On your **local development machine**, install the required packages:

```bash
cd D:\Projects\Modiryar\modiryar\backend
npm install multer
```

---

### **STEP 5: Deploy Code to VPS**

✅ **All backend code has been created!** Now you need to deploy it to your VPS.

```bash
# On your local machine, commit the changes
git add .
git commit -m "Add audio file storage with filesystem approach"
git push origin main

# SSH into your VPS
ssh root@195.248.240.30

# Navigate to your app directory
cd /var/www/modiryar

# Pull the latest code
git pull origin main

# Install dependencies (including multer)
cd backend
npm install

# Create uploads directory if not exists
mkdir -p uploads/audio
chmod 755 uploads
chmod 755 uploads/audio
```

---

###  **STEP 6: Update Frontend to Upload Files**

✅ **Frontend has been updated!** The `TagSelection.tsx` file now uploads files to the backend.

The upload process:
1. Creates a FormData with the audio file
2. Uploads to `/api/upload/audio` endpoint
3. Stores file metadata in database
4. Creates meeting with full audio information

---

### **STEP 7: Test Locally First**

Before deploying to VPS, test the implementation locally:

```bash
# 1. Make sure backend is running
cd backend
node src/server.js

# 2. In another terminal, run frontend
cd ..
npm run dev

# 3. Test the flow:
# - Login to the app
# - Record or upload an audio file
# - Select tags
# - Click "ذخیره جلسه" (Save Session)
# - Check if file is saved in backend/uploads/audio/{user_id}/
```

---

### **STEP 8: Deploy to VPS**

Once testing is successful locally:

```bash
# 1. Commit and push your changes
git add .
git commit -m "Implement audio file upload with filesystem storage"
git push origin main

# 2. SSH into your VPS
ssh root@195.248.240.30

# 3. Navigate to your app directory
cd /var/www/modiryar.teraxr.com

# 4. Pull latest changes
git pull origin main

# 5. Install dependencies
cd backend
npm install

# 6. Create uploads directory with proper permissions
mkdir -p uploads/audio
chmod 755 uploads
chmod 755 uploads/audio

# 7. Restart the backend service
# If using PM2:
pm2 restart modiryar-backend
# Or if using systemd:
sudo systemctl restart modiryar-backend
# Or manually:
# Kill existing process and start new one
pkill -f "node src/server.js"
nohup node src/server.js > output.log 2>&1 &
```

---

### **STEP 9: Set Up PM2 (Production Process Manager) - RECOMMENDED**

For production, use PM2 to manage your Node.js process:

```bash
# SSH into your VPS
ssh root@195.248.240.30

# Install PM2 globally (if not installed)
npm install -g pm2

# Navigate to backend directory
cd /var/www/modiryar.teraxr.com/backend

# Start backend with PM2
pm2 start src/server.js --name modiryar-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# View logs
pm2 logs modiryar-backend

# Other useful PM2 commands:
# pm2 restart modiryar-backend
# pm2 stop modiryar-backend
# pm2 delete modiryar-backend
# pm2 list
```

---

### **STEP 10: Configure Nginx (Web Server)**

If you're using Nginx as a reverse proxy:

```nginx
# /etc/nginx/sites-available/modiryar
server {
    listen 80;
    server_name modiryar.teraxr.com;

    # Increase upload size limit for large audio files
    client_max_body_size 500M;
    
    # Frontend
    location / {
        root /var/www/modiryar.teraxr.com/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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
        
        # Increase timeout for large file uploads
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # Serve uploaded audio files (optional - for direct access)
    location /uploads/ {
        alias /var/www/modiryar.teraxr.com/backend/uploads/;
        
        # Security: Only authenticated users should access
        # You might want to proxy through backend for auth check
    }
}
```

Apply Nginx configuration:

```bash
# Test Nginx configuration
sudo nginx -t

# If OK, reload Nginx
sudo systemctl reload nginx
```

---

### **STEP 11: Monitor Disk Space**

Since you're storing large files (100MB+), monitor your disk space:

```bash
# Check disk usage
df -h

# Check uploads directory size
du -sh /var/www/modiryar.teraxr.com/backend/uploads/

# Set up automatic disk monitoring (optional)
# Install and configure monitoring tools like:
# - Monit
# - Netdata
# - Custom scripts with cron
```

---

### **STEP 12: Set Up Backup Strategy**

Important for production:

```bash
# Create backup script
cat > /usr/local/bin/backup-modiryar-audio.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/modiryar/audio"
SOURCE_DIR="/var/www/modiryar.teraxr.com/backend/uploads/audio"
DATE=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/audio-backup-$DATE.tar.gz" "$SOURCE_DIR"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "audio-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
chmod +x /usr/local/bin/backup-modiryar-audio.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-modiryar-audio.sh
```

---

## 📊 Summary

### ✅ What We've Implemented:

1. **Database Schema**: Added 6 new columns to `meetings` table
2. **Backend File Upload**: Multer-based file upload controller
3. **File Storage**: Local filesystem in `uploads/audio/{user_id}/`
4. **Security**: User-specific directories, file type validation
5. **Frontend Integration**: FormData upload with progress tracking
6. **Database Integration**: Full metadata storage

### 📁 File Structure:

```
modiryar/
├── backend/
│   ├── uploads/
│   │   └── audio/
│   │       └── {user_id}/
│   │           └── {timestamp}-{filename}.ogg
│   ├── src/
│   │   ├── controllers/
│   │   │   └── fileController.js  ✅ NEW
│   │   ├── routes/
│   │   │   └── files.js  ✅ NEW
│   │   ├── services/
│   │   │   └── meetingService.js  ✅ UPDATED
│   │   └── server.js  ✅ UPDATED
│   └── .gitignore  ✅ NEW
└── src/
    └── pages/
        └── TagSelection.tsx  ✅ UPDATED
```

### 🔒 Security Features:

- User-specific directories
- File type validation
- Size limits (500MB)
- Authentication required
- Email verification required
- Access control (users can only access their own files)

### 📈 Performance:

- Streaming file uploads
- Progress tracking
- Efficient disk storage
- Indexed database queries

### 💰 Storage Estimates:

- **1 user, 10 meetings/month, 100MB each**: ~1GB/month
- **100 users**: ~100GB/month
- **1000 users**: ~1TB/month

### 🎯 Next Steps (Optional):

1. **Implement file cleanup**: Delete audio files when meetings are deleted
2. **Add compression**: Compress audio files to save space
3. **Migrate to S3**: For better scalability
4. **Add CDN**: For faster file delivery
5. **Implement chunked uploads**: For more reliable large file uploads

---

## 🆘 Troubleshooting

### Problem: "ALTER command denied"
**Solution**: Run SQL migration in phpMyAdmin (STEP 2)

### Problem: Permission denied on uploads directory
**Solution**: 
```bash
# First, check who you are logged in as:
whoami

# Set permissions
chmod 755 /var/www/modiryar.teraxr.com/backend/uploads

# Set owner (if you're root, use root:root):
chown -R root:root /var/www/modiryar.teraxr.com/backend/uploads

# Or if running as a specific user:
chown -R $(whoami):$(whoami) /var/www/modiryar.teraxr.com/backend/uploads
```

### Problem: File upload fails with 413 error
**Solution**: Increase nginx upload size:
```nginx
client_max_body_size 500M;
```

### Problem: Backend not starting
**Solution**: Check logs and restart:
```bash
pm2 logs modiryar-backend
pm2 restart modiryar-backend
```

---

## 📞 Support

If you encounter any issues:
1. Check logs: `pm2 logs modiryar-backend`
2. Check disk space: `df -h`
3. Check permissions: `ls -la /var/www/modiryar.teraxr.com/backend/uploads`
4. Test locally first before deploying to VPS

---

**🎉 Congratulations! Your audio storage system is now ready for deployment!**


