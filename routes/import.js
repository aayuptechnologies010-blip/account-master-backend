const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { previewImport, runImport, downloadFailedReport } = require('../controllers/importController');

// Wraps multer so file-type/size errors come back as clean JSON instead
// of crashing the request or falling through to a default error page.
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    next();
  });
};

router.post('/:resource/preview', auth, handleUpload, previewImport);
router.post('/:resource', auth, handleUpload, runImport);
router.get('/:resource/download-failed/:importId', auth, downloadFailedReport);

module.exports = router;
