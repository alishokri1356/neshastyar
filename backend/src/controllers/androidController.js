const { findLatestApk, findApkByFilename } = require('../services/androidAppService');

function apkPayload(apk) {
  return {
    version: apk.version,
    major: apk.major,
    minor: apk.minor,
    build: apk.build,
    filename: apk.filename,
    size: apk.size,
    downloadUrl: apk.downloadUrl,
    downloadPath: apk.downloadPath,
  };
}

function sendApkFile(res, apk) {
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(apk.filePath, apk.filename);
}

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
        data: apkPayload(apk),
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
  // GET /api/android/latest/download/:filename
  async downloadLatest(req, res) {
    try {
      const requestedName = req.params.filename;
      const apk = requestedName ? findApkByFilename(requestedName) : findLatestApk();
      if (!apk) {
        return res.status(404).json({
          error: 'Not found',
          message: requestedName
            ? `Android APK ${requestedName} is not available`
            : 'No Android APK is available',
        });
      }

      sendApkFile(res, apk);
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
