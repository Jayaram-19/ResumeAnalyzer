/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const scanTexts = [
  'Uploading file securely...',
  'Extracting raw resume text...',
  'Performing deep keyword extraction...',
  'Consulting Gemini AI engine...',
  'Assessing layout and structure...',
  'Formulating bullet point optimizations...',
  'Finalizing ATS scoring matrix...',
];

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch recent uploads
  const fetchHistory = async () => {
    try {
      const res = await API.get('/resumes/history');
      setHistory(res.data.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Increment scan steps dynamically
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setScanStep((prev) => {
          if (prev < scanTexts.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
    } else {
      setScanStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setError('');

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e) => {
    setError('');
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      setError('Invalid file format. Please upload PDF, DOCX, or TXT.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setFile(file);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a resume file first.');
      return;
    }
    if (!targetRole.trim()) {
      setError('Please specify a target job role or job description.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Step 1: Upload resume
      const formData = new FormData();
      formData.append('resume', file);

      const uploadRes = await API.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const resumeId = uploadRes.data.data._id;

      // Step 2: Trigger AI ATS analysis
      const analysisRes = await API.post(`/resumes/analyze/${resumeId}`, {
        targetRole,
      });

      const analysisId = analysisRes.data.data._id;

      // Reset states
      setFile(null);
      setTargetRole('');
      setLoading(false);

      // Navigate to detailed view
      navigate(`/analysis/${analysisId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'An error occurred during resume scanning. Please try again.');
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume and its analysis?')) return;

    try {
      await API.delete(`/resumes/${id}`);
      fetchHistory();
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate statistics
  const totalAnalyzed = history.reduce((acc, curr) => acc + (curr.analyses?.length || 0), 0);
  
  const allScores = history.flatMap(h => h.analyses.map(a => a.atsScore));
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const topGrade = allScores.length > 0 ? Math.max(...allScores) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10 relative flex-1 w-full">
      {/* Hero Welcome banner */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center mb-10 sm:mb-14">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-brand-indigo dark:text-blue-400 shadow-sm mb-5">
            <ShieldCheck size={15} />
            AI-powered resume risk graph
          </div>
          <h1 className="wiz-hero-title font-display font-extrabold mb-5">
            Protect every career move you make.
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl">
            SkillMetric connects your resume, target role, keywords, and ATS rules into one clear scoring graph, then turns weak signals into fixes you can use immediately.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-7">
            <a href="#analyze" className="orange-cta rounded-full px-6 py-3 text-sm font-bold inline-flex items-center gap-2 bg-brand-orange shadow-lg shadow-brand-orange/25 hover:bg-orange-500 transition-colors">
              Start analysis <ArrowRight size={16} />
            </a>
            <span className="text-sm font-semibold text-brand-indigo">
              Welcome back, <span className="text-brand-orange">{user?.name || 'candidate'}</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="wiz-card p-5 sm:p-7 relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#005bff_0_50%,#ff8a00_50%_100%)]"></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-brand-indigo">
                Resume to <span className="text-brand-orange">role map</span>
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {['Resume', 'Role', 'ATS'].map((label, index) => (
              <div key={label} className="bg-[#f4f9ff] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-2xl p-4 text-center">
                <div className={`mx-auto mb-2 h-10 w-10 rounded-full flex items-center justify-center text-white font-black ${index === 0 ? 'bg-brand-indigo' : index === 1 ? 'bg-brand-orange' : 'bg-brand-emerald'}`}>
                  {index + 1}
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {['Parse experience signals', 'Match role-critical keywords', 'Generate ready-to-use resume fixes'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3">
                <CheckCircle2 size={17} className="text-brand-emerald" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats Widgets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        <div className="glass rounded-3xl p-6 flex items-center gap-4 hover:border-blue-200 transition-all">
          <div className="w-12 h-12 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 flex items-center justify-center text-brand-indigo shadow-lg shadow-brand-indigo/5">
            <FileCheck2 size={24} />
          </div>
          <div>
            <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Scanned</span>
            <span className="text-3xl font-bold text-brand-indigo mt-1 block">{totalAnalyzed}</span>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex items-center gap-4 hover:border-blue-200 transition-all">
          <div className="w-12 h-12 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald shadow-lg shadow-brand-emerald/5">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Average ATS Score</span>
            <span className="text-3xl font-bold text-brand-orange mt-1 block">{avgScore || '--'}<span className="text-sm text-slate-400 font-normal">/100</span></span>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex items-center gap-4 hover:border-blue-200 transition-all">
          <div className="w-12 h-12 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange shadow-lg shadow-brand-orange/5">
            <Award size={24} />
          </div>
          <div>
            <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Highest Score</span>
            <span className="text-3xl font-bold text-brand-indigo mt-1 block">{topGrade || '--'}<span className="text-sm text-slate-400 font-normal">/100</span></span>
          </div>
        </div>
      </motion.div>

      {/* Main Form + Recent Resumes block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          id="analyze"
          className="lg:col-span-2 wiz-card p-5 sm:p-8 relative overflow-hidden"
        >
          {loading && (
            <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-40 flex flex-col items-center justify-center p-6 text-center">
              <div className="resume-scan-loader mb-8" aria-hidden="true">
                <svg viewBox="0 0 160 160" className="resume-scan-mark">
                  <defs>
                    <linearGradient id="loaderPage" x1="42" y1="22" x2="108" y2="136" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffffff" />
                      <stop offset="1" stopColor="#edf6ff" />
                    </linearGradient>
                    <linearGradient id="loaderBlue" x1="48" y1="30" x2="124" y2="128" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00a3ff" />
                      <stop offset="1" stopColor="#005bff" />
                    </linearGradient>
                    <linearGradient id="loaderOrange" x1="40" y1="32" x2="124" y2="134" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffb347" />
                      <stop offset="1" stopColor="#ff8a00" />
                    </linearGradient>
                  </defs>
                  <path d="M42 20h68l24 24v96H42V20Z" fill="url(#loaderPage)" stroke="#005bff" strokeWidth="6" strokeLinejoin="round" />
                  <path d="M110 20v24h24" fill="#dceeff" stroke="#005bff" strokeWidth="6" strokeLinejoin="round" />
                  <rect x="54" y="54" width="12" height="30" rx="4" fill="url(#loaderOrange)" />
                  <rect x="72" y="42" width="12" height="42" rx="4" fill="url(#loaderBlue)" />
                  <rect x="90" y="34" width="12" height="50" rx="4" fill="url(#loaderOrange)" />
                  <path d="M54 102h52M54 118h42" stroke="#005bff" strokeWidth="6" strokeLinecap="round" />
                  <path d="M106 94a24 24 0 1 0 0-48 24 24 0 0 0 0 48Z" fill="#ffffff" stroke="#005bff" strokeWidth="6" />
                  <path d="M106 46v24l16 17" fill="none" stroke="#005bff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M106 46a24 24 0 0 1 23 18h-23V46Z" fill="url(#loaderOrange)" />
                </svg>
                <svg viewBox="0 0 96 96" className="resume-scan-glass">
                  <circle cx="39" cy="39" r="23" fill="rgba(255,255,255,0.82)" stroke="#005bff" strokeWidth="9" />
                  <circle cx="39" cy="39" r="12" fill="rgba(0,163,255,0.12)" stroke="#ff8a00" strokeWidth="5" />
                  <path d="M56 56 82 82" stroke="#005bff" strokeWidth="10" strokeLinecap="round" />
                  <path d="M72 72 86 86" stroke="#ff8a00" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-brand-indigo dark:text-blue-400 mb-2 font-display">Deep Scanning in Progress</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">Analyzing credentials, checking industry keyword metrics, and optimizing bullet syntax.</p>
              
              <div className="px-6 py-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-full inline-flex items-center gap-2 text-brand-indigo dark:text-blue-400 text-xs font-semibold tracking-wide animate-pulse">
                <span>{scanTexts[scanStep]}</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-brand-indigo dark:text-white flex items-center gap-2">
              <Sparkles className="text-brand-orange" size={20} />
              <span>
                SkillMetric <span className="text-brand-orange">AI Powered Resume Analyzer</span>
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Upload your resume and state your target role to get full ATS analytics feedback.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm mb-6">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Drag & drop box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
                isDragOver
                ? 'border-brand-indigo bg-brand-indigo/5 shadow-inner'
                  : file
                  ? 'border-brand-emerald/40 bg-brand-emerald/5'
                  : 'border-blue-100 dark:border-slate-700 hover:border-brand-indigo/40 hover:bg-[#f4f9ff] dark:hover:bg-slate-800'
              }`}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <input
                id="file-upload-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald shadow-lg mb-4">
                    <FileText size={32} />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white text-base mb-1 max-w-[280px] truncate">{file.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-3">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs font-bold text-brand-indigo hover:text-blue-700 px-3 py-1.5 rounded-lg bg-brand-indigo/10 border border-brand-indigo/20 transition-all cursor-pointer"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 flex items-center justify-center text-brand-indigo shadow-lg mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={30} />
                  </div>
                  <h3 className="font-semibold text-brand-indigo dark:text-blue-400 text-base mb-1">Drag & Drop Resume</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mb-4">Supports PDF, DOCX, or TXT formats (Max size: 5MB)</p>
                  <span className="px-4 py-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    Browse Files
                  </span>
                </div>
              )}

              {/* Glowing vertical slider representing laser scanner */}
              {isDragOver && <div className="laser-scan"></div>}
            </div>

            {/* Target Job Role Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Target Job Role / Description
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Developer, React Engineer"
                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-indigo/50 focus:ring-1 focus:ring-brand-indigo/25 transition-all text-sm shadow-inner"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Providing specific roles allows the AI to tailor key terms, structural weights, and bullet fixes.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || !file || !targetRole}
              className="w-full flex items-center justify-center gap-2 py-4 wiz-cta font-semibold rounded-full hover:shadow-brand-indigo/35 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              Analyze & Optimize
              <ArrowRight size={16} />
            </motion.button>
          </form>
        </motion.div>

        {/* History Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="wiz-card p-5 sm:p-6 flex flex-col h-[525px] max-h-[70vh] lg:max-h-none"
        >
          <div className="mb-4">
            <h2 className="text-xl font-bold text-brand-indigo dark:text-white">
              Recent <span className="text-brand-orange">Audits</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Quickly view or delete past graded uploads.</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 no-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 rounded-xl">
                <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No resumes uploaded yet</span>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mt-1">Upload your first resume to see active grading stats.</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item._id}
                  onClick={() => {
                    if (item.analyses && item.analyses.length > 0) {
                      navigate(`/analysis/${item.analyses[0]._id}`);
                    } else {
                      alert('This resume has not been graded yet. Choose a target role to run analysis.');
                    }
                  }}
                  className="p-4 bg-white dark:bg-slate-800/80 hover:bg-[#f4f9ff] dark:hover:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 rounded-2xl flex items-center justify-between group transition-all cursor-pointer relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#f4f9ff] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-brand-indigo dark:text-blue-400 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-slate-800 dark:text-white text-sm font-semibold truncate max-w-[140px] group-hover:text-brand-indigo dark:group-hover:text-blue-400 transition-colors">
                        {item.fileName}
                      </h4>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] mt-0.5">
                        {item.latestRole || 'No Target Role Selected'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.latestScore !== null ? (
                      <span
                        className={`text-sm font-black tabular-nums ${getScoreColor(
                          item.latestScore
                        )}`}
                      >
                        {item.latestScore}
                      </span>
                    ) : (
                      <span className="text-[10px] text-brand-indigo font-bold px-2 py-1 bg-blue-50 border border-blue-100 rounded-md">
                        Pending
                      </span>
                    )}

                    <button
                      onClick={(e) => handleDelete(item._id, e)}
                      className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
