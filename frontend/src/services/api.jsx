import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
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

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

const apiService = {
  // PIN verification
  verifyPin: (pin) => api.post('/verify-pin', { pin }),
  
  // Candidate information
  saveCandidateInfo: (data) => api.post('/save-candidate-info', data),
  
  // Test related
  getTestQuestions: () => api.get('/test-questions'),
  submitTest: (answers) => api.post('/submit-test', answers),
  
  // Admin related
  adminLogin: (credentials) => api.post('/admin/login', credentials),
  getAdminStats: () => api.get('/admin/stats'),
  getCandidates: () => api.get('/admin/candidates'),
};

export default apiService;