# Audio File Storage Implementation Guide

## Overview

For storing large audio files (100MB+), we recommend using **filesystem storage** rather than storing files directly in the database.

## Recommended Approach: Filesystem Storage

### 1. Database Schema (Use Option 1)

Run the migration: `backend/migrations/add_audio_storage_fields.sql`

This adds:
- `audio_file_path` - Full path to the file
- `audio_file_size` - File size in bytes
- `audio_duration` - Duration in seconds
- `audio_format` - File format (mp3, wav, ogg, etc.)
- `title` - Meeting title

### 2. Storage Options

#### Option A: Local Filesystem (Simplest)
```javascript
// Store files in: backend/uploads/audio/{user_id}/{filename}
const uploadDir = path.join(__dirname, '../../uploads/audio', userId);
```

**Pros:**
- Simple to implement
- No additional costs
- Fast access

**Cons:**
- Difficult to scale across multiple servers
- Requires backup strategy
- Disk space management

#### Option B: AWS S3 (Production Recommended)
```javascript
// Use AWS SDK to upload to S3
const s3 = new AWS.S3();
await s3.upload({
  Bucket: 'modiryar-audio',
  Key: `${userId}/${filename}`,
  Body: fileStream
});
```

**Pros:**
- Highly scalable
- Automatic backups
- CDN integration
- No server disk management

**Cons:**
- Additional cost
- Requires AWS account
- Network latency for uploads

#### Option C: Cloud Storage (Good Alternative)
```javascript
// Use cloud storage client
await storageClient
  .from('meeting-audio')
  .upload(audioFilePath, audioBlob);
```

**Pros:**
- Easy integration
- Good pricing
- Built-in CDN

**Cons:**
- Vendor lock-in
- External dependency

### 3. Implementation Steps

#### Step 1: Install Required Packages

```bash
cd backend
npm install multer express-fileupload
# For AWS S3 (optional):
npm install aws-sdk
```

#### Step 2: Create Upload Directory

```bash
mkdir -p backend/uploads/audio
```

#### Step 3: Create File Upload Endpoint

Create `backend/src/controllers/fileController.js`:

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for large file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user.sub;
    const uploadDir = path.join(__dirname, '../../uploads/audio', userId);
    
    // Create directory if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

class FileController {
  // POST /api/upload/audio
  async uploadAudio(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide an audio file'
        });
      }

      const fileInfo = {
        path: req.file.path,
        size: req.file.size,
        format: req.file.mimetype,
        originalName: req.file.originalname,
        filename: req.file.filename
      };

      res.json({
        data: fileInfo,
        error: null
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }

  // GET /api/files/audio/:userId/:filename
  async getAudio(req, res) {
    try {
      const { userId, filename } = req.params;
      const filePath = path.join(__dirname, '../../uploads/audio', userId, filename);

      // Check if file exists
      await fs.access(filePath);

      // Stream the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('File not found:', error);
      res.status(404).json({
        error: 'File not found',
        message: 'The requested audio file does not exist'
      });
    }
  }
}

module.exports = { FileController: new FileController(), upload };
```

#### Step 4: Add Upload Routes

Create `backend/src/routes/files.js`:

```javascript
const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// Upload audio file
router.post('/upload/audio', upload.single('audio'), FileController.uploadAudio);

// Get audio file
router.get('/files/audio/:userId/:filename', FileController.getAudio);

module.exports = router;
```

#### Step 5: Update server.js

```javascript
const fileRoutes = require('./routes/files');

// Add this line with other routes
app.use('/api', fileRoutes);
```

#### Step 6: Update Meeting Service

Update `backend/src/services/meetingService.js`:

```javascript
async createMeeting(userId, meetingData) {
  const id = authService.generateId();
  const now = new Date();

  const sql = `
    INSERT INTO meetings (
      id, user_id, audio_file_name, audio_file_path, 
      audio_file_size, audio_duration, audio_format,
      title, meeting_date, status, summary, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    userId,
    meetingData.audio_file_name || null,
    meetingData.audio_file_path || null,
    meetingData.audio_file_size || null,
    meetingData.audio_duration || 0,
    meetingData.audio_format || null,
    meetingData.title || null,
    meetingData.meeting_date || now,
    meetingData.status || 'pending',
    meetingData.summary || null,
    now,
    now
  ];

  await db.query(sql, values);
  return await this.getMeetingById(id, userId);
}
```

### 4. Frontend Implementation

Update `src/pages/TagSelection.tsx`:

```typescript
// 1. Upload the audio file
const formData = new FormData();
formData.append('audio', recordingData.audioBlob, fileName);

const uploadResponse = await fetch('http://localhost:3001/api/upload/audio', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  },
  body: formData
});

const uploadResult = await uploadResponse.json();

// 2. Create meeting with file info
const { data: meetingData, error: meetingError } = await mysqlClient
  .from('meetings')
  .insert({
    meeting_date: new Date().toISOString(),
    user_id: user.id,
    summary: '',
    audio_file_name: fileName,
    audio_file_path: uploadResult.data.path,
    audio_file_size: uploadResult.data.size,
    audio_format: uploadResult.data.format,
    audio_duration: Math.floor(recordingData.duration / 1000),
    title: meetingTitle,
    status: 'آماده پردازش',
  });
```

### 5. MySQL Configuration for Large Files

If you must use BLOB storage, update MySQL configuration:

```ini
# /etc/mysql/my.cnf or C:\ProgramData\MySQL\MySQL Server X.X\my.ini

[mysqld]
max_allowed_packet=500M
innodb_buffer_pool_size=2G
innodb_log_file_size=512M
```

## Security Considerations

1. **File Validation**: Always validate file type and size
2. **Path Traversal**: Never use user input directly in file paths
3. **Access Control**: Only allow users to access their own files
4. **Virus Scanning**: Consider integrating antivirus scanning for uploads
5. **Rate Limiting**: Limit upload frequency per user

## Performance Optimization

1. **Streaming**: Use streams for large file uploads/downloads
2. **Chunked Uploads**: Implement chunked upload for better reliability
3. **Compression**: Consider compressing audio files
4. **CDN**: Use CDN for file delivery
5. **Cleanup**: Implement automatic cleanup of old/unused files

## Backup Strategy

1. **Local Storage**: Regular filesystem backups
2. **S3 Storage**: Enable versioning and lifecycle policies
3. **Database**: Regular MySQL backups
4. **Disaster Recovery**: Test restore procedures

## Cost Estimation (AWS S3)

- **Storage**: $0.023/GB/month
- **Uploads**: $0.005/1000 requests
- **Downloads**: $0.09/GB

For 1000 users uploading 100MB files monthly:
- Storage: 100GB × $0.023 = $2.30/month
- Transfer: ~$9/month
- **Total**: ~$11-12/month

## Recommended Solution

**For Production**: Use **AWS S3** or **Cloud Storage**
**For Development**: Use **Local Filesystem**

Start with local filesystem for development, then migrate to S3 for production.

