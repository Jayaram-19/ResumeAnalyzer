const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const Analysis = require('../models/Analysis');
const { parseResume } = require('../utils/parser');
const { analyzeResumeWithAI } = require('../utils/aiEngine');
const { normalizeResumeMarkdown } = require('../utils/resumeFormatter');

/**
 * @desc    Upload resume (PDF/DOCX) & parse text
 * @route   POST /api/resumes/upload
 * @access  Private
 */
const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a resume file (PDF, DOCX, or TXT)' });
  }

  try {
    // Generate a static file URL that points to the local Express server uploads static folder
    // This allows it to serve as a Cloudinary replacement for local offline development.
    const fileUrl = `/uploads/${req.file.filename}`;

    // Read the uploaded file buffer to parse it
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Extract text
    const extractedText = await parseResume(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!extractedText || extractedText.trim().length === 0) {
      // Clean up uploaded file if parsing failed
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, error: 'Could not extract text content from the uploaded file.' });
    }

    // Save to Resume DB
    const resume = await Resume.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      rawText: extractedText,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: resume._id,
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        createdAt: resume.createdAt,
      },
    });

  } catch (error) {
    console.error('Error handling resume upload:', error);
    // Delete local file on failure if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Run ATS optimization and grading analysis
 * @route   POST /api/resumes/analyze/:id
 * @access  Private
 */
const analyzeResume = async (req, res) => {
  const { targetRole } = req.body;
  const resumeId = req.params.id;

  if (!targetRole) {
    return res.status(400).json({ success: false, error: 'Please provide a target job role or job description' });
  }

  try {
    // Find the resume
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found or unauthorized' });
    }

    // Trigger AI analysis engine
    const aiAnalysis = await analyzeResumeWithAI(resume.rawText, targetRole);

    const improvedResumeText = normalizeResumeMarkdown(
      aiAnalysis.improvedResumeText,
      resume.rawText,
      targetRole
    );

    // Remove any previous analyses for the same resume and target role (optional, let's keep them and write a new one)
    const analysis = await Analysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      targetRole: targetRole,
      atsScore: aiAnalysis.atsScore,
      breakdown: aiAnalysis.breakdown,
      skills: aiAnalysis.skills,
      bulletPointSuggestions: aiAnalysis.bulletPointSuggestions,
      generalSuggestions: aiAnalysis.generalSuggestions,
      improvedResumeText,
    });

    res.status(200).json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get user's resume history and overall stats
 * @route   GET /api/resumes/history
 * @access  Private
 */
const getResumeHistory = async (req, res) => {
  try {
    // Fetch all resumes uploaded by user
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Fetch all analyses conducted by user
    const analyses = await Analysis.find({ userId: req.user._id }).sort({ createdAt: -1 });

    // Combine them or format them for dashboard ingestion
    // Map resumes to their corresponding analyses (could be multiple analyses per resume)
    const formattedHistory = resumes.map(resume => {
      const resumeAnalyses = analyses.filter(a => a.resumeId.toString() === resume._id.toString());
      return {
        _id: resume._id,
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        createdAt: resume.createdAt,
        analyses: resumeAnalyses.map(a => ({
          _id: a._id,
          targetRole: a.targetRole,
          atsScore: a.atsScore,
          createdAt: a.createdAt,
        })),
        // Helper to grab latest analysis score
        latestScore: resumeAnalyses.length > 0 ? resumeAnalyses[0].atsScore : null,
        latestRole: resumeAnalyses.length > 0 ? resumeAnalyses[0].targetRole : null,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get detail analysis block by ID
 * @route   GET /api/resumes/analysis/:id
 * @access  Private
 */
const getResumeAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id });

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis details not found' });
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a resume and its associated analyses
 * @route   DELETE /api/resumes/:id
 * @access  Private
 */
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Try to delete local file
    const localFileName = resume.fileUrl.split('/').pop();
    const localPath = path.join(__dirname, '..', 'uploads', localFileName);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    // Delete associated analysis records
    await Analysis.deleteMany({ resumeId: resume._id });

    // Delete the resume record
    await resume.deleteOne();

    res.status(200).json({ success: true, message: 'Resume and associated analyses deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  uploadResume,
  analyzeResume,
  getResumeHistory,
  getResumeAnalysis,
  deleteResume,
};
