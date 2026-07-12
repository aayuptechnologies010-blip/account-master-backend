const importSchemas = require('../config/importSchemas');
const { mapRow, getHeaderMapping } = require('./importMappingService');
const { validateRow } = require('./importValidationService');
const ImportLog = require('../models/ImportLog');

const PREVIEW_SAMPLE_LIMIT = 100;
const BATCH_SIZE = 500;

function getResourceConfig(resourceKey) {
  const config = importSchemas[resourceKey];
  if (!config) {
    const err = new Error(`Unknown import resource "${resourceKey}"`);
    err.status = 400;
    throw err;
  }
  return config;
}

function hasValue(mapped, key) {
  return mapped[key] !== undefined && mapped[key] !== null && String(mapped[key]).trim() !== '';
}

// Maps + validates every row, then does ONE batch DB query to find
// already-existing records by the resource's dedupe key. This single
// mechanism is what gives both "skip duplicates" and "resume" behavior:
// re-uploading a file just finds previously-imported keys already in
// Mongo and marks them duplicate, leaving only new/fixed rows as valid.
async function classifyRows(rawRows, resourceConfig, userId) {
  const { model, uniqueKey } = resourceConfig;

  const mappedRows = rawRows.map((raw, idx) => {
    const mapped = mapRow(raw, resourceConfig);
    const { valid, errors } = validateRow(mapped, resourceConfig);
    return { row: idx + 2, raw, mapped, valid, errors }; // +2 = header row + 1-indexed
  });

  const candidateKeys = mappedRows
    .filter((r) => r.valid && hasValue(r.mapped, uniqueKey))
    .map((r) => r.mapped[uniqueKey]);

  const existing = candidateKeys.length
    ? await model.find({ userId, [uniqueKey]: { $in: candidateKeys } }).select(uniqueKey).lean()
    : [];
  const existingKeys = new Set(existing.map((doc) => String(doc[uniqueKey])));

  const seenInFile = new Set();
  return mappedRows.map((r) => {
    if (!r.valid) return { ...r, status: 'invalid', reason: r.errors.join('; ') };

    const keyValue = hasValue(r.mapped, uniqueKey) ? String(r.mapped[uniqueKey]) : null;
    if (keyValue) {
      if (existingKeys.has(keyValue)) return { ...r, status: 'duplicate', reason: 'Already exists' };
      if (seenInFile.has(keyValue)) return { ...r, status: 'duplicate', reason: 'Duplicate within file' };
      seenInFile.add(keyValue);
    }
    return { ...r, status: 'valid', reason: null };
  });
}

async function preview(resourceKey, rawRows, userId) {
  const resourceConfig = getResourceConfig(resourceKey);
  const classified = await classifyRows(rawRows, resourceConfig, userId);

  const counts = { valid: 0, invalid: 0, duplicate: 0 };
  classified.forEach((r) => { counts[r.status] += 1; });

  return {
    totalRecords: classified.length,
    validRecords: counts.valid,
    invalidRecords: counts.invalid,
    duplicateRecords: counts.duplicate,
    headerMapping: getHeaderMapping(rawRows, resourceConfig),
    sample: classified.slice(0, PREVIEW_SAMPLE_LIMIT).map((r) => ({
      row: r.row, data: r.mapped, status: r.status, reason: r.reason,
    })),
  };
}

async function commit(resourceKey, rawRows, userId, meta, onProgress) {
  const startTime = Date.now();
  const resourceConfig = getResourceConfig(resourceKey);
  const classified = await classifyRows(rawRows, resourceConfig, userId);

  const toInsert = classified.filter((r) => r.status === 'valid');
  const skipped = classified.filter((r) => r.status === 'duplicate');
  const invalid = classified.filter((r) => r.status === 'invalid');

  const failedRecords = invalid.map((r) => ({ row: r.row, data: r.raw, reason: r.reason }));
  let importedCount = 0;

  const total = classified.length;
  let processed = skipped.length + invalid.length;

  const reportProgress = () => {
    if (onProgress) onProgress({ processed, total, percent: total ? Math.round((processed / total) * 100) : 100 });
  };
  reportProgress();

  // Some resources (e.g. Client's sr/prtCd, Item's ipmrpCd, Salesman's
  // code) have a system-assigned field covered by a unique index that
  // may or may not come from the uploaded file — generate the missing
  // ones once, up front, so every row gets a distinct value.
  const systemFields = resourceConfig.generateSystemFields
    ? await resourceConfig.generateSystemFields(userId, toInsert.map((r) => r.mapped))
    : null;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const docs = batch.map((r, batchIdx) => ({
      ...r.mapped,
      ...(systemFields ? systemFields[i + batchIdx] : null),
      userId,
    }));
    try {
      const result = await resourceConfig.model.insertMany(docs, { ordered: false });
      importedCount += result.length;
    } catch (bulkErr) {
      const insertedCount = bulkErr.insertedDocs ? bulkErr.insertedDocs.length : 0;
      importedCount += insertedCount;
      const writeErrors = bulkErr.writeErrors || [];
      writeErrors.forEach((we) => {
        const failedRow = batch[we.index];
        failedRecords.push({
          row: failedRow ? failedRow.row : -1,
          data: failedRow ? failedRow.raw : {},
          reason: we.errmsg || 'Insert failed',
        });
      });
    }
    processed += batch.length;
    reportProgress();
  }

  const durationMs = Date.now() - startTime;
  const summary = {
    totalRecords: total,
    imported: importedCount,
    skipped: skipped.length,
    failed: failedRecords.length,
    durationMs,
  };

  const log = await ImportLog.create({
    userId,
    resource: resourceKey,
    fileName: meta.fileName,
    importedBy: meta.importedBy,
    ...summary,
    failedRecords,
  });

  return { ...summary, importLogId: log._id };
}

module.exports = { getResourceConfig, preview, commit };
