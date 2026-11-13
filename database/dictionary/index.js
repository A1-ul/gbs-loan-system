const schemaDictionary = require('./schema_dictionary.json');

module.exports = {
  schemaDictionary,
  system: 'GBS Enterprise Data Dictionary',
  tablesCount: schemaDictionary.tables.length,
};
