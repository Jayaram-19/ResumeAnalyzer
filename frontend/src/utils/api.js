import axios from 'axios';

let apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Self-healing: Automatically append /api if the configured URL is missing it
if (apiBaseURL && !apiBaseURL.endsWith('/api') && !apiBaseURL.endsWith('/api/')) {
  apiBaseURL = apiBaseURL.replace(/\/+$/, '') + '/api';
}

const API = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach authorization headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
