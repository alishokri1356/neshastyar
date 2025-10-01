const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for large file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user.sub;
    const uploadDir = path.join(__dirname, '../../uploads/audio', userId);
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
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
    // Allow audio files
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3', 
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm',
      'audio/mp4',
      'audio/x-m4a'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
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

      const userId = req.user.sub;
      const fileInfo = {
        path: req.file.path,
        relativePath: path.join('uploads/audio', userId, req.file.filename),
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
      const requestingUserId = req.user.sub;

      // Security check: users can only access their own files
      if (userId !== requestingUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own files'
        });
      }

      const filePath = path.join(__dirname, '../../uploads/audio', userId, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          error: 'File not found',
          message: 'The requested audio file does not exist'
        });
      }

      // Stream the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('File retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve file',
        message: error.message
      });
    }
  }

  // GET /api/audio/:userId/:filename - Public audio access with token
  async getPublicAudio(req, res) {
    try {
      const { userId, filename } = req.params;
      const token = req.query.token;

      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Access token required'
        });
      }

      // Verify the token (simple approach - in production use proper JWT verification)
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const requestingUserId = decoded.sub;

        // Security check: users can only access their own files
        if (userId !== requestingUserId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You can only access your own files'
          });
        }
      } catch (jwtError) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Access token is invalid or expired'
        });
      }

      const filePath = path.join(__dirname, '../../uploads/audio', userId, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          error: 'File not found',
          message: 'The requested audio file does not exist'
        });
      }

      // Stream the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Public audio retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve file',
        message: error.message
      });
    }
  }

  // DELETE /api/files/audio/:userId/:filename
  async deleteAudio(req, res) {
    try {
      const { userId, filename } = req.params;
      const requestingUserId = req.user.sub;

      // Security check: users can only delete their own files
      if (userId !== requestingUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own files'
        });
      }

      const filePath = path.join(__dirname, '../../uploads/audio', userId, filename);

      // Check if file exists and delete it
      try {
        await fs.unlink(filePath);
        res.json({
          data: { success: true },
          error: null
        });
      } catch (error) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            error: 'File not found',
            message: 'The requested audio file does not exist'
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        message: error.message
      });
    }
  }
}

module.exports = { FileController: new FileController(), upload };
