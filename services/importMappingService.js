// Normalizes a raw column header for alias lookup: lowercase, trim,
// collapse internal whitespace/underscores to single spaces.
function normalizeHeader(header) {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

// Strips everything but letters/digits — used for a looser fallback
// match (e.g. "Party Name" vs schema field "partyName").
function stripToAlnum(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getSchemaFieldNames(model) {
  return Object.keys(model.schema.paths).filter(
    (f) => !['_id', '__v', 'userId', 'createdAt', 'updatedAt'].includes(f)
  );
}

// Resolves one raw header to a schema field name, or null if no match
// (unmatched columns are intentionally dropped — never adds new fields).
function resolveHeader(rawHeader, resourceConfig) {
  const normalized = normalizeHeader(rawHeader);
  if (resourceConfig.columnAliases[normalized]) {
    return resourceConfig.columnAliases[normalized];
  }

  const stripped = stripToAlnum(rawHeader);
  const schemaFields = getSchemaFieldNames(resourceConfig.model);
  const exact = schemaFields.find((f) => stripToAlnum(f) === stripped);
  return exact || null;
}

// Builds a { originalHeader: schemaFieldOrNull } map for the preview UI.
function getHeaderMapping(rawRows, resourceConfig) {
  if (!rawRows.length) return {};
  const headers = Object.keys(rawRows[0]);
  const mapping = {};
  headers.forEach((h) => {
    mapping[h] = resolveHeader(h, resourceConfig);
  });
  return mapping;
}

// Maps one raw row (original headers) to schema-field keys, dropping
// any column that doesn't resolve to a real field on the model.
function mapRow(rawRow, resourceConfig) {
  const mapped = {};
  Object.keys(rawRow).forEach((rawHeader) => {
    const field = resolveHeader(rawHeader, resourceConfig);
    if (!field) return; // ignore extra/unknown columns
    const value = rawRow[rawHeader];
    mapped[field] = typeof value === 'string' ? value.trim() : value;
  });
  return mapped;
}

module.exports = { mapRow, getHeaderMapping, normalizeHeader };
