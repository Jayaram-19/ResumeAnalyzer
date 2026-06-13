const express = require('express');
const router = express.Router();
const {
  uploadResume,
  analyzeResume,
  getResumeHistory,
  getResumeAnalysis,
  deleteResume,
} = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All resume routes are protected by JWT authentication
router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.post('/analyze/:id', analyzeResume);
router.get('/history', getResumeHistory);
router.get('/analysis/:id', getResumeAnalysis);
router.delete('/:id', deleteResume);

module.exports = router;
