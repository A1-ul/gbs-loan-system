const archiveRepository = require('../repositories/archive.repository');

class ArchiveService {
  async getArchivedRecords() {
    const deletedUsers = await archiveRepository.findSoftDeletedUsers();
    return { count: deletedUsers.length, records: deletedUsers };
  }
}

module.exports = new ArchiveService();
