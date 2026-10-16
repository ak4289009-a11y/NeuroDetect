import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PWAStatusBanner from './components/common/PWAStatusBanner';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300">
    <div className="relative w-12 h-12 mb-4">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse"></div>
      <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
    </div>
    <span className="text-sm font-medium tracking-wide text-slate-400">Loading NeuroDetect Workspace...</span>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <PWAStatusBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Patient Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
                <Route path="/patient" element={<PatientDashboard />} />
              </Route>

              {/* Doctor Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
