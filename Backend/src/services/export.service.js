class ExportService {
  generateCsv(data, headers) {
    if (!data || !data.length) return '';
    const headerRow = headers.join(',');
    const bodyRows = data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
    return [headerRow, ...bodyRows].join('\n');
  }
}

module.exports = new ExportService();
