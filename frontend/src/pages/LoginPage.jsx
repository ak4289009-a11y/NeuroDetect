import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, User, Stethoscope, ShieldCheck, ArrowLeft, Key, X, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Toast from '../components/common/Toast';
import Logo from '../components/common/Logo';

const LoginPage = () => {
  const [role, setRole] = useState('PATIENT'); // PATIENT | DOCTOR | ADMIN
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Request OTP, 2: Reset Password with OTP
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const data = await login(cleanEmail, password, role);
      setToast({ message: `Welcome back, ${data.name}! Redirecting to ${data.role} dashboard...`, type: 'success' });
      
      setTimeout(() => {
        if (data.role === 'ADMIN') navigate('/admin');
        else if (data.role === 'DOCTOR') navigate('/doctor');
        else navigate('/patient');
      }, 700);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      const msg = res.data?.message || 'Password reset OTP verification code dispatched to your email address!';
      setToast({ message: msg, type: 'success' });
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setForgotStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send OTP reset email. Please check email address.';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match!', type: 'error' });
      return;
    }
    setForgotLoading(true);
    try {
      await authAPI.resetPassword({
        email: forgotEmail,
        reset_code: resetOtp,
        new_password: newPassword
      });
      setToast({ message: 'Password updated successfully! You can now log in.', type: 'success' });
      setShowForgotModal(false);
      setEmail(forgotEmail);
      setPassword(newPassword);
      setForgotStep(1);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid OTP code or email.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col justify-between p-4 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-5">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <Logo size="large" className="justify-center mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">User Authentication</h2>
          <p className="text-xs text-gray-500">Select role & enter credentials to access your dashboard</p>
        </div>

        {/* 3 Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200">
          {[
            { id: 'PATIENT', label: 'Patient', icon: User },
            { id: 'DOCTOR', label: 'Doctor', icon: Stethoscope },
            { id: 'ADMIN', label: 'Admin', icon: ShieldCheck },
          ].map((r) => {
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1-Click Demo Fill for Viva & Evaluation */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>⚡ Demo Accounts</span>
            <span className="text-[10px] text-blue-600 font-normal">Click to auto-fill</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRole('PATIENT');
                setEmail('patient@neurodetect.ai');
                setPassword('Patient@123456');
              }}
              className="py-1 px-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded text-[11px] font-medium text-slate-700 hover:text-blue-700 transition-all text-center shadow-xs"
            >
              👤 Patient
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('DOCTOR');
                setEmail('dr.rajesh@neurodetect.ai');
                setPassword('Doctor@123456');
              }}
              className="py-1 px-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded text-[11px] font-medium text-slate-700 hover:text-blue-700 transition-all text-center shadow-xs"
            >
              🩺 Doctor
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setEmail('admin@neurodetect.ai');
                setPassword('Admin@123456');
              }}
              className="py-1 px-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded text-[11px] font-medium text-slate-700 hover:text-blue-700 transition-all text-center shadow-xs"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {role} Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === 'ADMIN' ? 'admin@neurodetect.ai' : role === 'DOCTOR' ? 'dr.rajesh@neurodetect.ai' : 'patient@neurodetect.ai'
                }
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
              className="text-blue-600 font-semibold hover:underline bg-transparent border-0 p-0 text-xs"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          Need an account?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">
            Register Here
          </Link>
        </div>

      </div>

      <div className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} NeuroDetect Project Evaluation Team
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Reset Account Password</h3>
                <p className="text-[11px] text-gray-500">
                  {forgotStep === 1 ? 'Step 1: Request 6-digit OTP verification code' : 'Step 2: Enter OTP code & set new password'}
                </p>
              </div>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Registered Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                >
                  {forgotLoading ? 'Sending OTP Code...' : 'Send Password Reset Code'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-normal">
                  ⚠️ <b>Check your Spam / Junk folder:</b> Brevo transactional emails often get filtered into your Gmail <b>Spam</b> folder or <b>Promotions</b> tab.
                </div>
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3" autoComplete="off">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">6-Digit OTP Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    name="reset_otp_code_secure"
                    id="reset_otp_code_secure"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Check your email inbox ({forgotEmail}) for the 6-digit numeric OTP code.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      name="reset_new_password_field"
                      id="reset_new_password_field"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex="-1"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      name="reset_confirm_password_field"
                      id="reset_confirm_password_field"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex="-1"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    {forgotLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
              </div>
            )}

          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default LoginPage;
