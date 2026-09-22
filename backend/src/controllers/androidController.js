const fs = require('fs');
const path = require('path');
const { findLatestApk, PUBLIC_APK_DIR } = require('../services/androidAppService');

class AndroidController {
  // GET /api/android/latest
  async latest(req, res) {
    try {
      const apk = findLatestApk();
      if (!apk) {
        return res.status(404).json({
          error: 'Not found',
          message: 'No Android APK is available',
        });
      }

      res.json({
        data: {
          version: apk.version,
          major: apk.major,
          minor: apk.minor,
          build: apk.build,
          filename: apk.filename,
          size: apk.size,
          url: apk.url,
          path: apk.path,
        },
        error: null,
      });
    } catch (error) {
      console.error('Android latest version error:', error);
      res.status(500).json({
        error: 'Failed to resolve Android version',
        message: error.message,
      });
    }
  }

  // GET /api/android/latest/download
  async downloadLatest(req, res) {
    try {
      const apk = findLatestApk();
      if (!apk) {
        return res.status(404).json({
          error: 'Not found',
          message: 'No Android APK is available',
        });
      }

      const publicFile = path.join(PUBLIC_APK_DIR, apk.filename);
      if (fs.existsSync(publicFile)) {
        return res.redirect(302, apk.path);
      }

      res.download(apk.filePath, apk.filename);
    } catch (error) {
      console.error('Android APK download error:', error);
      res.status(500).json({
        error: 'Download failed',
        message: error.message,
      });
    }
  }
}

module.exports = new AndroidController();
