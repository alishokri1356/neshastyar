const tagService = require('../services/tagService');

class TagController {
  // GET /api/tags
  async getTags(req, res) {
    try {
      const userId = req.user.sub;
      const { withCount, orderBy, orderDirection } = req.query;

      let tags;
      if (withCount === 'true') {
        tags = await tagService.getTagsWithCount(userId);
      } else {
        const options = {};
        if (orderBy) options.orderBy = orderBy;
        if (orderDirection) options.orderDirection = orderDirection;
        tags = await tagService.getTags(userId, options);
      }

      res.json(tags);
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        error: 'Failed to fetch tags',
        message: 'An error occurred while fetching tags'
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
