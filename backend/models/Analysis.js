const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    targetRole: {
      type: String,
      required: true,
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    breakdown: {
      formatting: { type: Number, required: true },
      keywords: { type: Number, required: true },
      impact: { type: Number, required: true },
      structure: { type: Number, required: true },
    },
    skills: {
      matched: [{ type: String }],
      missing: [{ type: String }],
    },
    bulletPointSuggestions: [
      {
        original: { type: String, required: true },
        suggestion: { type: String, required: true },
        benefit: { type: String, required: true },
      },
    ],
    generalSuggestions: [{ type: String }],
    improvedResumeText: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Analysis', analysisSchema);
