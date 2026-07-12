const XLSX = require('xlsx');
const { parseFile } = require('../services/fileParserService');
const importService = require('../services/importService');
const ImportLog = require('../models/ImportLog');

// POST /import/:resource/preview
exports.previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const resourceConfig = importService.getResourceConfig(req.params.resource);
    const rawRows = parseFile(req.file.buffer, req.file.originalname, resourceConfig);
    const result = await importService.preview(req.params.resource, rawRows, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || (err.isParseError ? 400 : 500);
    console.error('previewImport error:', err);
    res.status(status).json({ success: false, message: err.message || 'Internal server error' });
  }
};

// POST /import/:resource — streams progress via Server-Sent Events
exports.runImport = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!req.file) {
      send('error', { message: 'No file uploaded' });
      return res.end();
    }

    const resourceConfig = importService.getResourceConfig(req.params.resource);
    const rawRows = parseFile(req.file.buffer, req.file.originalname, resourceConfig);
    const meta = {
      fileName: req.file.originalname,
      importedBy: req.user.email || req.user.phone || req.user.id,
    };

    const summary = await importService.commit(
      req.params.resource,
      rawRows,
      req.user.id,
      meta,
      (progress) => send('progress', progress)
    );

    send('complete', summary);
    res.end();
  } catch (err) {
    console.error('runImport error:', err);
    send('error', { message: err.message || 'Internal server error' });
    res.end();
  }
};

// GET /import/:resource/download-failed/:importId?format=csv|xlsx
exports.downloadFailedReport = async (req, res) => {
  try {
    const log = await ImportLog.findOne({ _id: req.params.importId, userId: req.user.id }).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Import log not found' });

    const format = (req.query.format || 'csv').toLowerCase();
    const rows = (log.failedRecords || []).map((f) => ({
      Row: f.row,
      'Original Data': JSON.stringify(f.data),
      'Failure Reason': f.reason,
    }));

    if (format === 'xlsx') {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Failed Records');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="failed-records-${log._id}.xlsx"`);
      return res.send(buffer);
    }

    const csvSheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(csvSheet);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="failed-records-${log._id}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('downloadFailedReport error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
