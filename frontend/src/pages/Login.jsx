import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 items-center max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 relative">
      <div className="hidden lg:block">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-brand-indigo dark:text-blue-400 shadow-sm mb-5">
          <ShieldCheck size={15} />
          AI Powered Resume Analyzer
        </div>
        <h1 className="wiz-hero-title font-display font-extrabold mb-5">Context makes every score faster.</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-xl">
          Sign in to connect resume content, target roles, and ATS feedback into one focused improvement workflow.
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md wiz-card p-5 sm:p-8 z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-brand-indigo dark:text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Log in to grade and optimize your resumes in seconds</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-indigo/50 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-brand-indigo/25 dark:focus:ring-blue-500/25 transition-all text-sm shadow-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-indigo/50 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-brand-indigo/25 dark:focus:ring-blue-500/25 transition-all text-sm shadow-sm"
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 wiz-cta font-semibold rounded-full hover:shadow-brand-indigo/35 transition-all duration-300 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-blue-100 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-indigo dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
              Create an Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
