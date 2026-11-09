const path = require('path');
const fs = require('fs');
const reportService = require('../services/reportService');
const userService = require('../services/userService');

class PublicReportController {
  async getReport(req, res) {
    try {
      const report = await reportService.getPublicReport(req.params.token);
      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'این صورتجلسه پیدا نشد یا لینک آن غیرفعال شده است',
        });
      }
      res.json(report);
    } catch (error) {
      console.error('Public report error:', error);
      res.status(500).json({
        error: 'Failed to load report',
        message: 'خطایی در دریافت صورتجلسه رخ داد',
      });
    }
  }

  async updateReport(req, res) {
    try {
      const report = await reportService.updatePublicReport(req.params.token, req.body || {});
      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'این صورتجلسه پیدا نشد یا لینک آن غیرفعال شده است',
        });
      }
      res.json(report);
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) console.error('Public report update error:', error);
      res.status(status).json({
        error: 'Failed to update report',
        message: status < 500 ? error.message : 'ذخیره صورتجلسه انجام نشد',
      });
    }
  }

  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Logo required',
          message: 'یک تصویر برای لوگو انتخاب کنید',
        });
      }

      const meeting = await reportService.loadEditableMeeting(req.params.token);
      if (!meeting) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'این صورتجلسه پیدا نشد یا لینک آن غیرفعال شده است',
        });
      }

      const relativePath = path.join('uploads', 'logos', req.file.filename);
      await userService.setOrgLogo(meeting.user_id, relativePath);
      const report = await reportService.getPublicReport(req.params.token);
      res.json(report);
    } catch (error) {
      console.error('Public logo upload error:', error);
      res.status(500).json({
        error: 'Failed to upload logo',
        message: 'ذخیره لوگو انجام نشد',
      });
    }
  }

  async getLogo(req, res) {
    try {
      const userId = req.params.userId;
      if (!userId || /[/\\]|\.\./.test(userId)) {
        return res.status(404).end();
      }

      const user = await userService.findById(userId);
      if (!user?.org_logo_path) {
        return res.status(404).end();
      }

      const filePath = userService.resolveStoredFilePath(user.org_logo_path);
      const logosRoot = path.resolve(process.cwd(), 'uploads', 'logos');
      if (!filePath || !filePath.startsWith(logosRoot + path.sep) || !fs.existsSync(filePath)) {
        return res.status(404).end();
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('Public logo error:', error);
      res.status(500).end();
    }
  }
}

module.exports = new PublicReportController();
