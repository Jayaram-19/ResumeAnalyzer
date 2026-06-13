const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from the backend folder regardless of launch cwd.
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to Database
connectDB();

// Initialize Express App
const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows loading files from static uploads in dev
}));

// CORS Middleware
app.use(cors({
  origin:['http://localhost:5173','https://resume-analyzer-lac-phi.vercel.app'], // In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dev Logging Middleware
app.use(morgan('dev'));

// Serve Static Files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));

// Welcome Landing Page Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the SkillMetric - AI Powered Resume Analyzer API!',
    status: 'online',
  });
});

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error Handler:', err);
  
  // Custom check for Multer size/type limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error. Something went wrong.',
  });
});

// Define Server Port
const PORT = process.env.PORT || 5000;

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
