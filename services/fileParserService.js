const path = require('path');
const XLSX = require('xlsx');

const MAX_ROWS_TO_SCAN_FOR_HEADER = 20;
const MIN_MATCHES_TO_ACCEPT_HEADER = 2;

function normalize(cell) {
  return String(cell || '').toLowerCase().trim().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ');
}

function stripToAlnum(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Real-world exported spreadsheets often have a few report-title/company
// rows above the actual header row (e.g. "Report on...", a business
// name, then the real "Sr. | Party Name | Add.1..." row). Blindly
// treating row 0 as the header would map nothing and fail every row —
// so scan the first few rows for the one that actually looks like our
// resource's headers (recognized via the same alias/field-name list
// the mapping step uses) and start parsing from there instead.
function findHeaderRowIndex(rawRows, resourceConfig) {
  if (!resourceConfig) return 0;
  const schemaFields = Object.keys(resourceConfig.model.schema.paths);

  for (let i = 0; i < Math.min(rawRows.length, MAX_ROWS_TO_SCAN_FOR_HEADER); i++) {
    const row = rawRows[i] || [];
    let matches = 0;
    row.forEach((cell) => {
      if (cell === '' || cell == null) return;
      const normalized = normalize(cell);
      const stripped = stripToAlnum(cell);
      const isAlias = !!resourceConfig.columnAliases[normalized];
      const isSchemaField = schemaFields.some((f) => stripToAlnum(f) === stripped);
      if (isAlias || isSchemaField) matches += 1;
    });
    if (matches >= MIN_MATCHES_TO_ACCEPT_HEADER) return i;
  }
  return 0; // fallback: nothing recognizable found, assume row 0 as before
}

// Parses an uploaded CSV/Excel/JSON buffer into an array of plain row
// objects keyed by the file's original column headers. Never throws a
// raw parser error — always a clean, user-facing message.
function parseFile(buffer, originalName, resourceConfig) {
  const ext = path.extname(originalName || '').toLowerCase();

  try {
    if (ext === '.json') {
      const text = buffer.toString('utf8');
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of records');
      }
      return data;
    }

    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];
      const sheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
      const headerRowIndex = findHeaderRowIndex(rawRows, resourceConfig);

      return XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });
    }

    throw new Error(`Unsupported file extension "${ext}"`);
  } catch (err) {
    const wrapped = new Error(`Could not parse file: ${err.message}`);
    wrapped.isParseError = true;
    throw wrapped;
  }
}

module.exports = { parseFile };
