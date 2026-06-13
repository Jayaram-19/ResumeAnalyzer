/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { motion } from 'framer-motion';
import ClassicDropdown from '../components/ClassicDropdown';
import {
  FileText,
  Trash2,
  TrendingUp,
  Search,
  Eye,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const sortOptions = [
  { value: 'date-desc', label: 'Newest Scanned' },
  { value: 'date-asc', label: 'Oldest Scanned' },
  { value: 'score-desc', label: 'Highest Grade' },
  { value: 'score-asc', label: 'Lowest Grade' },
];

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-desc'); // 'date-desc', 'date-asc', 'score-desc', 'score-asc'
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      const res = await API.get('/resumes/history');
      setHistory(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching history:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume audit?')) return;

    try {
      await API.delete(`/resumes/${id}`);
      fetchHistory();
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-500/10 text-green-700 border-green-500/30';
    if (score >= 50) return 'bg-yellow-400/20 text-yellow-700 border-yellow-400/40';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  // Compile history items into flat audits
  const allAudits = history.flatMap((resume) => {
    return (resume.analyses || []).map((analysis) => ({
      resumeId: resume._id,
      fileName: resume.fileName,
      fileUrl: resume.fileUrl,
      analysisId: analysis._id,
      targetRole: analysis.targetRole,
      atsScore: analysis.atsScore,
      createdAt: new Date(analysis.createdAt),
    }));
  });

  // Filter audits
  const filteredAudits = allAudits.filter((audit) => {
    return (
      audit.fileName.toLowerCase().includes(search.toLowerCase()) ||
      audit.targetRole.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sort audits
  const sortedAudits = [...filteredAudits].sort((a, b) => {
    if (sort === 'date-desc') return b.createdAt - a.createdAt;
    if (sort === 'date-asc') return a.createdAt - b.createdAt;
    if (sort === 'score-desc') return b.atsScore - a.atsScore;
    if (sort === 'score-asc') return a.atsScore - b.atsScore;
    return 0;
  });

  // Compile chart dataset chronologically
  const chronologicalAudits = [...allAudits].sort((a, b) => a.createdAt - b.createdAt);

  const chartData = {
    labels: chronologicalAudits.map((a) => a.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        fill: true,
        label: 'ATS Compatibility Score',
        data: chronologicalAudits.map((a) => a.atsScore),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#2563eb',
        pointRadius: 4,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#ffffff',
        titleColor: '#4b5563',
        bodyColor: '#111827',
        borderColor: 'rgba(148,163,184,0.35)',
        borderWidth: 1,
        titleFont: { size: 10, weight: 'semibold' },
        bodyFont: { size: 12, weight: 'bold' },
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.22)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col relative w-full">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-brand-indigo dark:text-blue-400 shadow-sm mb-4">
          <TrendingUp size={15} />
          Continuous resume posture
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-3 leading-none">
          <span className="text-brand-indigo dark:text-white">Audit History & Trends</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base">Visualize your career growth and check historic ATS compatibilities.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin mb-4"></div>
          <span className="text-slate-400 font-semibold text-sm">Loading historical data...</span>
        </div>
      ) : (
        <div className="space-y-8 flex-1 flex flex-col">
          {/* Performance Trend Chart */}
          {chronologicalAudits.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="wiz-card p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-brand-indigo dark:text-blue-400" />
                <h3 className="text-lg font-bold text-brand-indigo dark:text-white">
                  ATS Scoring <span className="text-brand-orange">Trends</span>
                </h3>
              </div>
              <div className="h-64 w-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            </motion.div>
          )}

          {/* Filtering and table */}
          <div className="flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by resume name or target role..."
                  className="block w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-indigo/50 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-brand-indigo/25 dark:focus:ring-blue-500/25 transition-all text-xs shadow-sm"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider shrink-0">Sort By:</span>
                <ClassicDropdown
                  value={sort}
                  options={sortOptions}
                  onChange={setSort}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>

            {/* Audits table grid */}
            <div className="flex-1 min-h-[300px]">
              {sortedAudits.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 rounded-2xl min-h-[300px]">
                  <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No historical audits found</span>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                    {search ? 'Try modifying your search keywords.' : 'Run your first upload on the Dashboard to populate audits.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedAudits.map((audit) => (
                    <motion.div
                      key={audit.analysisId}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => navigate(`/analysis/${audit.analysisId}`)}
                      className="wiz-card hover:border-brand-indigo/20 p-5 flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div>
                        {/* Header filename */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-brand-indigo/10 dark:bg-blue-500/10 border border-brand-indigo/20 dark:border-blue-500/20 flex items-center justify-center text-brand-indigo dark:text-blue-400 shrink-0">
                              <FileText size={16} />
                            </div>
                            <h4 className="text-slate-800 dark:text-slate-200 text-xs font-bold truncate group-hover:text-brand-indigo dark:group-hover:text-blue-400 transition-colors">
                              {audit.fileName}
                            </h4>
                          </div>

                          <span className={`text-sm font-black px-2.5 py-1.5 rounded-xl border ${getScoreColor(audit.atsScore)}`}>
                            {audit.atsScore}
                          </span>
                        </div>

                        {/* Middle metadata details */}
                        <div className="space-y-2 border-t border-blue-100 dark:border-slate-700 pt-4">
                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                            <Sparkles size={13} className="text-brand-orange" />
                            <span className="font-semibold truncate">Role: {audit.targetRole}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                            <Calendar size={13} />
                            <span>Graded: {audit.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-5 pt-3 border-t border-blue-100 dark:border-slate-700">
                        <span className="text-[10px] text-brand-indigo dark:text-blue-400 font-bold tracking-wider uppercase group-hover:text-brand-orange transition-all inline-flex items-center gap-1">
                          View Analysis
                          <Eye size={12} />
                        </span>

                        <button
                          onClick={(e) => handleDelete(audit.resumeId, e)}
                          className="text-slate-500 dark:text-slate-400 hover:text-brand-indigo dark:hover:text-blue-400 p-1.5 hover:bg-brand-indigo/10 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
