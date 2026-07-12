const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json'];
const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  'text/plain', // some browsers report CSV as text/plain
  'application/octet-stream', // fallback some OSes use for csv/xlsx
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  if (file.mimetype && !ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file content type "${file.mimetype}"`));
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter,
});

module.exports = upload;
