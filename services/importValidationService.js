const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}[0-9]$/;

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function checkType(field, value, type) {
  switch (type) {
    case 'email':
      return EMAIL_RE.test(String(value)) ? null : `Invalid email format in "${field}"`;
    case 'phone':
      return PHONE_RE.test(String(value)) ? null : `Invalid phone format in "${field}"`;
    case 'number':
      return Number.isNaN(Number(value)) ? `"${field}" must be a number` : null;
    case 'date':
      return Number.isNaN(new Date(value).getTime()) ? `Invalid date in "${field}"` : null;
    default:
      return null; // 'string' or unspecified — no extra shape check
  }
}

// Validates one mapped row (schema-field keys) against a resource's
// required fields, declared field types, and enum whitelists. A bad
// row never throws — it just comes back with a list of reasons.
function validateRow(mappedRow, resourceConfig) {
  const errors = [];

  (resourceConfig.requiredFields || []).forEach((field) => {
    if (isEmpty(mappedRow[field])) {
      errors.push(`Required field "${field}" is missing`);
    }
  });

  const fieldTypes = resourceConfig.fieldTypes || {};
  Object.keys(fieldTypes).forEach((field) => {
    if (isEmpty(mappedRow[field])) return; // only type-check when present
    const err = checkType(field, mappedRow[field], fieldTypes[field]);
    if (err) errors.push(err);
  });

  const enums = resourceConfig.enums || {};
  Object.keys(enums).forEach((field) => {
    if (isEmpty(mappedRow[field])) return;
    if (!enums[field].includes(mappedRow[field])) {
      errors.push(`"${field}" must be one of: ${enums[field].join(', ')}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRow };
