const tagService = require('../services/tagService');

class TagController {
  // GET /api/tags
  async getTags(req, res) {
    try {
      // Get user ID from JWT token or query parameter
      const userId = req.user?.sub || req.query.user_id;
      
      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to fetch tags'
        });
      }

      const { withCount, orderBy, orderDirection } = req.query;

      console.log('Fetching tags for user:', userId);
      let tags;
      if (withCount === 'true') {
        tags = await tagService.getTagsWithCount(userId);
      } else {
        const options = {};
        if (orderBy) options.orderBy = orderBy;
        if (orderDirection) options.orderDirection = orderDirection;
        tags = await tagService.getTags(userId, options);
      }
      console.log('Found tags:', tags.length);

      res.json(tags);
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        error: 'Failed to fetch tags',
        message: 'An error occurred while fetching tags'
      });
    }
  }

  // GET /api/tags/management
  async getManagementData(req, res) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to fetch tag management data'
        });
      }

      const data = await tagService.getTagManagementData(userId);
      res.json(data);
    } catch (error) {
      console.error('Get tag management data error:', error);
      res.status(500).json({
        error: 'Failed to fetch tag management data',
        message: 'An error occurred while fetching the tag management overview'
      });
    }
  }

  // GET /api/tags/:id
  async getTagById(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const tag = await tagService.getTagById(id, userId);
      if (!tag) {
        return res.status(404).json({
          error: 'Tag not found',
          message: 'Tag not found or access denied'
        });
      }

      res.json(tag);
    } catch (error) {
      console.error('Get tag error:', error);
      res.status(500).json({
        error: 'Failed to fetch tag',
        message: 'An error occurred while fetching the tag'
      });
    }
  }

  // POST /api/tags/merge
  async mergeTags(req, res) {
    try {
      const userId = req.user.sub;
      const { sourceTagNames, targetTagName } = req.body || {};

      if (!Array.isArray(sourceTagNames) || sourceTagNames.length < 2) {
        return res.status(400).json({
          error: 'Invalid source tags',
          message: 'حداقل دو برچسب برای ادغام لازم است.'
        });
      }

      if (!targetTagName || typeof targetTagName !== 'string' || !targetTagName.trim()) {
        return res.status(400).json({
          error: 'Invalid target tag',
          message: 'نام مقصد برای ادغام برچسب‌ها الزامی است.'
        });
      }

      const result = await tagService.mergeTags(userId, sourceTagNames, targetTagName);

      res.json(result);
    } catch (error) {
      console.error('Merge tags error:', error);

      if (error.message === 'At least two tag names are required to merge') {
        return res.status(400).json({
          error: 'Invalid source tags',
          message: 'حداقل دو برچسب برای ادغام لازم است.'
        });
      }

      if (error.message === 'A target tag name is required') {
        return res.status(400).json({
          error: 'Invalid target tag',
          message: 'نام مقصد برای ادغام برچسب‌ها الزامی است.'
        });
      }

      if (error.message === 'Target tag could not be determined') {
        return res.status(400).json({
          error: 'Target tag missing',
          message: 'برچسب مقصد یافت نشد یا قابل ایجاد نیست.'
        });
      }

      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Tag name already exists',
          message: 'برچسبی با این نام از قبل وجود دارد.'
        });
      }

      res.status(500).json({
        error: 'Failed to merge tags',
        message: 'در ادغام برچسب‌ها خطایی رخ داد.'
      });
    }
  }

  // POST /api/tags
  async createTag(req, res) {
    try {
      const userId = req.user.sub;
      const tagData = req.body;

      if (!tagData.name) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Tag name is required'
        });
      }

      const tag = await tagService.createTag(userId, tagData);

      res.status(201).json(tag);
    } catch (error) {
      console.error('Create tag error:', error);
      
      // Handle duplicate tag name error
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
        return res.status(409).json({
          error: 'Tag already exists',
          message: `A tag with the name "${req.body.name}" already exists. Please choose a different name.`
        });
      }

      res.status(500).json({
        error: 'Failed to create tag',
        message: 'An error occurred while creating the tag'
      });
    }
  }

  // PUT /api/tags/:id
  async updateTag(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const updates = req.body;

      const tag = await tagService.updateTag(id, userId, updates);
      if (!tag) {
        return res.status(404).json({
          error: 'Tag not found',
          message: 'Tag not found or access denied'
        });
      }

      res.json(tag);
    } catch (error) {
      console.error('Update tag error:', error);
      
      // Handle duplicate tag name error
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
        return res.status(409).json({
          error: 'Tag name already exists',
          message: `A tag with the name "${req.body.name}" already exists. Please choose a different name.`
        });
      }

      res.status(500).json({
        error: 'Failed to update tag',
        message: 'An error occurred while updating the tag'
      });
    }
  }

  // DELETE /api/tags/:id
  async deleteTag(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const success = await tagService.deleteTag(id, userId);
      if (!success) {
        return res.status(404).json({
          error: 'Tag not found',
          message: 'Tag not found or access denied'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete tag error:', error);
      res.status(500).json({
        error: 'Failed to delete tag',
        message: 'An error occurred while deleting the tag'
      });
    }
  }

  // GET /api/tags/:id/meetings
  async getMeetingsByTag(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const meetings = await tagService.getMeetingsByTag(id, userId);

      res.json(meetings);
    } catch (error) {
      console.error('Get meetings by tag error:', error);
      res.status(500).json({
        error: 'Failed to fetch meetings',
        message: 'An error occurred while fetching meetings for this tag'
      });
    }
  }
}

module.exports = new TagController();
