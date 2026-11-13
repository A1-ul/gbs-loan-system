const fs = require('fs');
const path = require('path');
const config = require('../config');

class StorageService {
  saveFile(filename, buffer) {
    const uploadDir = path.resolve(config.upload.path);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return { filePath, filename, size: buffer.length };
  }
}

module.exports = new StorageService();
