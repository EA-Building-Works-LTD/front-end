import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session expiration
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session=expired';
      }
    }
    
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Auth endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    verifyToken: () => api.get('/auth/verify'),
  },
  
  // Leads endpoints
  leads: {
    getAll: (params) => api.get('/leads', { params }),
    getById: (id) => api.get(`/leads/${id}`),
    create: (leadData) => api.post('/leads', leadData),
    update: (id, leadData) => api.put(`/leads/${id}`, leadData),
    delete: (id) => api.delete(`/leads/${id}`),
    getMyLeads: (params) => api.get('/leads/my-leads', { params }),
  },
  
  // Appointments endpoints
  appointments: {
    getAll: (params) => api.get('/appointments', { params }),
    getById: (id) => api.get(`/appointments/${id}`),
    create: (appointmentData) => api.post('/appointments', appointmentData),
    update: (id, appointmentData) => api.put(`/appointments/${id}`, appointmentData),
    delete: (id) => api.delete(`/appointments/${id}`),
  },
  
  // Proposals endpoints
  proposals: {
    getAll: (params) => api.get('/proposals', { params }),
    getById: (id) => api.get(`/proposals/${id}`),
    create: (proposalData) => api.post('/proposals', proposalData),
    update: (id, proposalData) => api.put(`/proposals/${id}`, proposalData),
    delete: (id) => api.delete(`/proposals/${id}`),
    getTemplates: () => api.get('/proposals/templates'),
  },
  
  // Builders endpoints
  builders: {
    getAll: () => api.get('/builders'),
    getById: (id) => api.get(`/builders/${id}`),
    create: (builderData) => api.post('/builders', builderData),
    update: (id, builderData) => api.put(`/builders/${id}`, builderData),
    delete: (id) => api.delete(`/builders/${id}`),
  },
  
  // Google Sheets integration
  googleLeads: {
    getAll: () => api.get('/google-leads'),
    update: (id, data) => api.put(`/google-leads/${id}`, data),
  },
  
  // Form submissions
  formSubmissions: {
    getAll: (params) => api.get('/form-submissions', { params }),
    getById: (id) => api.get(`/form-submissions/${id}`),
    create: (formData) => api.post('/form-submissions', formData),
    update: (id, formData) => api.put(`/form-submissions/${id}`, formData),
    delete: (id) => api.delete(`/form-submissions/${id}`),
  },
};

export default apiService; 