const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');

// Configure multer for large file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user.sub;
    const uploadDir = path.join(process.cwd(), 'uploads/audio', userId);
    
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

      const filePath = path.join(process.cwd(), 'uploads/audio', userId, filename);

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

      console.log('🔍 Public audio request - userId:', userId, 'filename:', filename);

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

      const uploadDir = path.join(process.cwd(), 'uploads/audio', userId);
      console.log('🔍 Upload directory:', uploadDir);
      console.log('🔍 process.cwd():', process.cwd());

      // First try the exact filename
      let filePath = path.join(uploadDir, filename);
      console.log('🔍 Trying exact filename:', filePath);

      try {
        await fs.access(filePath);
        console.log('✅ File exists at:', filePath);
      } catch (error) {
        console.log('❌ Exact filename not found, searching for timestamped version...');
        
        // If exact filename not found, look for timestamped version
        try {
          const files = await fs.readdir(uploadDir);
          console.log('🔍 Files in directory:', files);
          
          // Find file that ends with the requested filename
          const matchingFile = files.find(file => file.endsWith(filename));
          
          if (matchingFile) {
            filePath = path.join(uploadDir, matchingFile);
            console.log('✅ Found timestamped file:', filePath);
          } else {
            console.log('❌ No matching file found');
            return res.status(404).json({
              error: 'File not found',
              message: 'The requested audio file does not exist'
            });
          }
        } catch (dirError) {
          console.log('❌ Error reading directory:', dirError.message);
          return res.status(404).json({
            error: 'File not found',
            message: 'The requested audio file does not exist'
          });
        }
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

  // GET /api/download/audio/:meetingId - Public audio download by meeting ID (NO AUTH)
  async downloadAudioByMeetingId(req, res) {
    try {
      const { meetingId } = req.params;
      
      console.log('🔍 Audio download request for meeting ID:', meetingId);

      if (!meetingId) {
        return res.status(400).json({
          error: 'Meeting ID required',
          message: 'Meeting ID is required to download audio file'
        });
      }

      // Get meeting data from database
      const db = require('../config/database');
      const sql = 'SELECT * FROM meetings WHERE id = ?';
      const meetings = await db.query(sql, [meetingId]);
      
      if (!meetings || meetings.length === 0) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'The requested meeting does not exist'
        });
      }

      const meeting = meetings[0];
      
      // Check if meeting has audio file
      if (!meeting.audio_file_path) {
        return res.status(404).json({
          error: 'Audio file not found',
          message: 'This meeting does not have an associated audio file'
        });
      }

      // Construct file path
      const filePath = path.join(process.cwd(), meeting.audio_file_path);
      console.log('🔍 Looking for file at:', filePath);

      // Check if file exists
      try {
        await fs.access(filePath);
        console.log('✅ File exists at:', filePath);
      } catch (error) {
        console.log('❌ File not found at:', filePath);
        
        // Try to find a matching file in the user's directory
        const userDir = path.join(process.cwd(), 'uploads', 'audio', meeting.user_id);
        console.log('🔍 Searching in user directory:', userDir);
        
        try {
          const files = await fs.readdir(userDir);
          console.log('🔍 Files in directory:', files);
          
          // Find file that matches the audio_file_name pattern
          const baseFileName = meeting.audio_file_name;
          let matchingFile = files.find(file => {
            // Extract the base name without timestamp prefix
            const baseName = file.replace(/^\d+-/, ''); // Remove timestamp prefix
            const originalBaseName = baseFileName;
            
            // Check if the base names match (ignoring timestamp prefixes)
            return baseName === originalBaseName || 
                   baseName.includes(originalBaseName.replace('.ogg', '')) ||
                   originalBaseName.includes(baseName.replace('.ogg', ''));
          });
          
          // If no exact match found, try to find any audio file for this user
          if (!matchingFile && files.length > 0) {
            console.log('🔍 No exact match found, using first available audio file');
            matchingFile = files[0]; // Use the first available file
          }
          
          if (matchingFile) {
            const foundFilePath = path.join(userDir, matchingFile);
            console.log('✅ Found file:', foundFilePath);
            
            // Set appropriate headers for file download
            const fileName = meeting.audio_file_name || `meeting-${meetingId}.${meeting.audio_format?.split('/')[1] || 'ogg'}`;
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', meeting.audio_format || 'application/octet-stream');
            
            if (meeting.audio_file_size) {
              res.setHeader('Content-Length', meeting.audio_file_size);
            }
            
            // Stream the file
            return res.sendFile(foundFilePath);
          } else {
            console.log('❌ No audio files found for this user');
            return res.status(404).json({
              error: 'Audio file not found',
              message: 'No audio files found for this meeting'
            });
          }
        } catch (dirError) {
          console.log('❌ Error reading directory:', dirError.message);
          return res.status(404).json({
            error: 'Audio file not found',
            message: 'The audio file for this meeting could not be located'
          });
        }
      }

      // Set appropriate headers for file download
      const fileName = meeting.audio_file_name || `meeting-${meetingId}.${meeting.audio_format?.split('/')[1] || 'ogg'}`;
      
      // Sanitize filename to prevent invalid characters in headers
      const sanitizedFileName = fileName.replace(/[^\w\-_.]/g, '_');
      
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
      res.setHeader('Content-Type', meeting.audio_format || 'application/octet-stream');
      
      if (meeting.audio_file_size) {
        res.setHeader('Content-Length', meeting.audio_file_size);
      }

      // Stream the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Audio download error:', error);
      res.status(500).json({
        error: 'Failed to download audio file',
        message: 'An error occurred while downloading the audio file'
      });
    }
  }
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

      const filePath = path.join(process.cwd(), 'uploads/audio', userId, filename);

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

  // GET /api/meetings/:meetingId/audio-files
  async getMeetingAudioFiles(req, res) {
    try {
      const { meetingId } = req.params;
      const requestingUserId = req.user.sub;

      // First verify the meeting belongs to the user
      const meetingQuery = `
        SELECT id, user_id 
        FROM meetings 
        WHERE id = ? AND user_id = ?
      `;
      
      const [meetingRows] = await pool.query(meetingQuery, [meetingId, requestingUserId]);
      
      if (meetingRows.length === 0) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting not found or access denied'
        });
      }

      // Get audio files for the meeting
      const audioFilesQuery = `
        SELECT 
          id,
          file_name,
          file_path,
          file_size,
          duration,
          format,
          upload_order,
          created_at,
          updated_at
        FROM audio_files 
        WHERE meeting_id = ?
        ORDER BY upload_order ASC, created_at ASC
      `;
      
      const [audioFilesRows] = await pool.query(audioFilesQuery, [meetingId]);
      
      res.json({
        data: audioFilesRows,
        error: null
      });
    } catch (error) {
      console.error('Error fetching meeting audio files:', error);
      res.status(500).json({
        error: 'Failed to fetch audio files',
        message: error.message
      });
    }
  }
}

module.exports = { FileController: new FileController(), upload };
