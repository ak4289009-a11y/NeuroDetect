import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api/v1';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) return cleanUrl;
  if (cleanUrl.endsWith('/api')) return `${cleanUrl}/v1`;
  return `${cleanUrl}/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Auth Token into every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('neurodetect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Services
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  sendRegisterOtp: (email, role = 'PATIENT') => api.post('/auth/send-register-otp', { email, role }),
  registerPatient: (data) => api.post('/auth/register/patient', data),
  registerDoctor: (formData) => api.post('/auth/register/doctor', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetData) => api.post('/auth/reset-password', resetData),
};

// MRI Scan Services
export const scanAPI = {
  uploadMRI: (formData) => api.post('/scans/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPatientScans: () => api.get('/scans/patient'),
  getAllScans: () => api.get('/scans/all'),
  getScanById: (id) => api.get(`/scans/${id}`),
};

// Doctor Services
export const doctorAPI = {
  getPublicDoctors: (location) => api.get('/doctors/public', { params: { location } }),
  getLocations: () => api.get('/doctors/locations'),
  getSuggestions: (q) => api.get('/doctors/suggestions', { params: { q } }),
  getPendingScans: () => api.get('/doctors/pending-scans'),
  getPatients: () => api.get('/doctors/patients'),
  getAppointments: () => api.get('/doctors/appointments'),
  submitReview: (reviewData) => api.post('/doctors/review', reviewData),
  getPatientHistory: (patientId) => api.get(`/doctors/patients/history/${patientId}`),
  bookAppointment: (data) => api.post('/doctors/appointments/book', data),
  getMyAppointments: () => api.get('/doctors/appointments/my-appointments'),
  cancelAppointment: (id) => api.put(`/doctors/appointments/${id}/cancel`),
  selectDoctor: (doctorId) => api.post('/doctors/select', { doctor_id: doctorId }),
  getSelectedDoctor: () => api.get('/doctors/selected'),
};

// Appointment Services
export const appointmentAPI = {
  bookAppointment: (data) => api.post('/doctors/appointments/book', data),
  getMyAppointments: () => api.get('/doctors/appointments/my-appointments'),
  cancelAppointment: (id) => api.put(`/doctors/appointments/${id}/cancel`),
};

// Report Services - Authenticated Blob PDF Download
export const reportAPI = {
  downloadPDF: async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NeuroDetect_Medical_Report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF report. Ensure you are logged in.");
    }
  },
  emailReport: (reportId) => api.post(`/reports/${reportId}/email`),
};

// Admin Services
export const adminAPI = {
  getPendingDoctors: () => api.get('/admin/doctors/pending'),
  approveDoctorAction: (doctorId, actionData) => api.post(`/admin/doctors/${doctorId}/approval`, actionData),
  getAllDoctors: () => api.get('/admin/doctors'),
  resetDoctorPassword: (doctorId, newPassword) => api.put(`/admin/doctors/${doctorId}/reset-password`, null, { params: { new_password: newPassword } }),
  deleteDoctor: (doctorId) => api.delete(`/admin/doctors/${doctorId}`),
  getAllPatients: () => api.get('/admin/patients'),
  deletePatient: (patientId) => api.delete(`/admin/patients/${patientId}`),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

// Analytics Services
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard-stats'),
  getChartsData: () => api.get('/analytics/charts-data'),
};

// Content Services - Matches FastAPI Route Prefixes Exactly
export const contentAPI = {
  getDiets: () => api.get('/diet/'),
  getVideos: () => api.get('/videos/'),
  createVideo: (videoData) => api.post('/videos/', videoData),
  deleteVideo: (videoId) => api.delete(`/videos/${videoId}`),
  getFAQs: () => api.get('/faqs/'),
  createFAQ: (faqData) => api.post('/faqs/', faqData),
  deleteFAQ: (faqId) => api.delete(`/faqs/${faqId}`),
  sendContactMessage: (msgData) => api.post('/contact/', msgData),
  getMyMessages: () => api.get('/contact/my-messages'),
  getInbox: () => api.get('/contact/inbox'),
  replyToMessage: (messageId, replyText) => api.post(`/contact/inbox/${messageId}/reply`, { reply_text: replyText }),
  updateMessageStatus: (messageId, status) => api.put(`/contact/inbox/${messageId}/status`, null, { params: { status } }),
};

// Project Documentation Specs API
export const docAPI = {
  getDocSpec: (docKey) => api.get(`/project-docs/${docKey}`),
  listDocs: () => api.get('/project-docs/'),
};

// Secure Clinical Messaging Services
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getConversationHistory: (partnerUserId) => api.get(`/messages/conversation/${partnerUserId}`),
  sendMessage: (data) => api.post('/messages/send', data),
  getUnreadCount: () => api.get('/messages/unread-count'),
  markAsRead: (messageId) => api.patch(`/messages/${messageId}/read`),
};

export default api;
