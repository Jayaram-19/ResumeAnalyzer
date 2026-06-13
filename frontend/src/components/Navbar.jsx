import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { LogOut, FileText, BarChart3, User as UserIcon, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const navLinkClass = (path) =>
    `relative flex items-center gap-1.5 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive(path)
        ? 'text-brand-indigo after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand-orange'
        : 'text-slate-600 dark:text-slate-400 hover:text-brand-indigo dark:hover:text-brand-indigo'
    }`;

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-blue-100/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-sm shadow-blue-100/50 dark:shadow-slate-900/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden">
            <img src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'} alt="SkillMetric logo" className="w-full h-full object-contain" />
          </span>
          <span className="font-display font-extrabold text-xl tracking-tight text-brand-indigo dark:text-white">
            Skill<span className="text-brand-orange">Metric</span>
            <span className="hidden lg:inline text-slate-500 dark:text-slate-400 font-semibold text-xs ml-3">
              AI Powered Resume Analyzer
            </span>
          </span>
        </Link>

        {/* Navigation Links */}
        {isAuthenticated && (
          <nav className="order-3 w-full md:order-none md:w-auto flex items-center gap-6 overflow-x-auto no-scrollbar">
            <Link to="/" className={navLinkClass('/')}>
                <BarChart3 size={16} />
                Dashboard
            </Link>
            <Link to="/history" className={navLinkClass('/history')}>
                <FileText size={16} />
                History & Stats
            </Link>
          </nav>
        )}

        {/* User profile / Auth buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-brand-indigo dark:text-blue-400">{user?.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</span>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-brand-indigo/10 dark:bg-brand-indigo/20 flex items-center justify-center text-brand-indigo dark:text-blue-400">
                <UserIcon size={18} />
              </div>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors duration-200 cursor-pointer"
              >
                <LogOut size={14} />
                <span className="hidden md:inline">Log Out</span>
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-indigo dark:hover:text-blue-400 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-brand-orange hover:text-brand-indigo transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
