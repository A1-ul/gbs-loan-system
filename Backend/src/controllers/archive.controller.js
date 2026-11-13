const archiveService = require('../services/archive.service');

class ArchiveController {
  async getArchived(req, res, next) {
    try {
      const data = await archiveService.getArchivedRecords();
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ArchiveController();
