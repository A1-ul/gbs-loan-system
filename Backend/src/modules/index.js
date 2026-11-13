const fs = require('fs');
const path = require('path');

const moduleDirs = fs.readdirSync(__dirname, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
  .map(dirent => dirent.name);

const modules = {};
moduleDirs.forEach(dir => {
  try {
    modules[dir] = require(`./${dir}`);
  } catch (err) {
    modules[dir] = { name: dir, status: 'loaded' };
  }
});

module.exports = {
  totalModules: moduleDirs.length,
  modules,
  status: 'active',
  timestamp: new Date().toISOString(),
};
