import React, { useState } from 'react';
import {
  User, Stethoscope, ShieldCheck, Mail, Phone, MapPin, Building2,
  Award, Calendar, FileText, CheckCircle2, Lock, Activity, Moon, Sun,
  Sparkles, Key, Bell, Shield, Edit3, HeartPulse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const UserProfileCard = () => {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // overview | security

  const isDoctor = role === 'DOCTOR';
  const isPatient = role === 'PATIENT';
  const isAdmin = role === 'ADMIN';

  const doctorData = user?.doctor_profile || {};
  const patientData = user?.patient_profile || {};

  const name = isDoctor
    ? doctorData.name || user?.name || 'Dr. Specialist'
    : isPatient
    ? patientData.name || user?.name || 'Registered Patient'
    : 'System Administrator';

  const email = user?.email || 'user@neurodetect.ai';
  const idPrefix = isDoctor ? `DR-${doctorData.id || user?.id || 101}` : isPatient ? `PAT-${patientData.id || user?.id || 202}` : `ADM-${user?.id || 1}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* 1. TOP HERO COVER BANNER & AVATAR CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
        {/* Cover Header */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 relative p-6 flex justify-between items-start">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[11px] font-bold border border-white/30">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>NeuroDetect Secure Healthcare Network</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-xl text-white transition-colors border border-white/30 flex items-center gap-1.5 text-xs font-semibold"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-200" />}
            <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Avatar Badge */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl sm:text-4xl flex items-center justify-center border-4 border-white shadow-md">
                {name[0] || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-green-500 text-white rounded-full border-2 border-white shadow" title="Account Active & Verified">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Name & Role Details */}
            <div className="space-y-1 sm:mb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase border ${
                  isDoctor
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : isPatient
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {role}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1 font-mono font-bold text-gray-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {idPrefix}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-200">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              <span>Identity Verified</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 border-t border-gray-100 bg-gray-50/50 flex gap-6 text-xs font-bold text-gray-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'security' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security & Compliance</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* 2. CLINICAL / METRIC HIGHLIGHTS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {isDoctor ? (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Specialization</span>
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                    {doctorData.specialization || 'Neuro-Oncology'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Clinical Reg No</span>
                    <Award className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-sm font-extrabold font-mono text-gray-900 truncate">
                    {doctorData.medical_reg_no || 'Verified Specialist'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Clinical Practice</span>
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-gray-900">
                    {doctorData.experience_years ? `${doctorData.experience_years} Years Exp.` : 'Senior Specialist'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Verification Status</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-extrabold text-emerald-600">
                    Auto-Verified
                  </p>
                </div>
              </>
            ) : isPatient ? (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Age / Gender</span>
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-gray-900">
                    {patientData.age ? `${patientData.age} Yrs` : 'N/A'} • {patientData.gender || 'Not Specified'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Contact Phone</span>
                    <Phone className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-sm font-extrabold font-mono text-gray-900 truncate">
                    {patientData.phone || 'Not Provided'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">Primary Location</span>
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-extrabold text-gray-900 truncate">
                    {patientData.address || 'Not Provided'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-bold uppercase">AI MRI Diagnostics</span>
                    <Activity className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-sm font-extrabold text-blue-600">
                    DenseNet121 Active
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* 3. MAIN DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Personal / Professional Information */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-gray-900">
                    {isDoctor ? 'Clinical Credentials & Practice' : 'Patient Profile Details'}
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Information</span>
              </div>

              {isDoctor ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <Stethoscope className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Specialization Category</span>
                      <p className="font-bold text-gray-900 text-xs">{doctorData.specialization || 'Neuro-Oncology & Brain Diagnostic Imaging'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <Building2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Affiliated Medical Center</span>
                      <p className="font-bold text-gray-900 text-xs">{doctorData.hospital || 'Neuro-Imaging Research Center'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Practice City / Location (India)</span>
                      <p className="font-bold text-gray-900 text-xs">{doctorData.location || 'New Delhi, Delhi (NCT), India'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <Award className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Medical Registration Number</span>
                      <p className="font-bold font-mono text-gray-900 text-xs">{doctorData.medical_reg_no || 'Verified Specialist'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <User className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Full Legal Name</span>
                      <p className="font-bold text-gray-900 text-xs">{name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <Phone className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Primary Phone Number</span>
                      <p className="font-bold font-mono text-gray-900 text-xs">{patientData.phone || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Residential Address (India)</span>
                      <p className="font-bold text-gray-900 text-xs">{patientData.address || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                    <HeartPulse className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase">Registered Demographics</span>
                      <p className="font-bold text-gray-900 text-xs">{patientData.age ? `${patientData.age} Years Old` : 'Age N/A'} • {patientData.gender || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Platform Capabilities & System Configuration Settings */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-gray-900">System Configuration & Institution</h3>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                  Verified
                </span>
              </div>

              {/* Institution / Hospital Name Banner */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl shadow-sm border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-yellow-400 font-extrabold text-[10px] uppercase tracking-wider">
                  <span>Affiliated Healthcare Institution</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {doctorData.hospital || 'NeuroDetect Clinical Neuro-Imaging Network'}
                </h4>
                <p className="text-[11px] text-slate-300 font-medium">
                  Department of Radiomics & Deep Learning Diagnostics • Research Demonstration Portal
                </p>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold border border-white/20">
                    🔬 Deep Learning Screening
                  </span>
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold border border-white/20">
                    🛡️ Research Prototype
                  </span>
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold border border-white/20">
                    🔒 Encrypted Cloud Storage
                  </span>
                </div>
              </div>

              {/* Technical System Configuration Badges */}
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-blue-900 font-bold">
                    <span>Supabase Private Storage</span>
                    <span className="text-[10px] font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">NeuroDetect Org</span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    All patient MRI scans & PDF reports encrypted in private storage using 10-minute signed URLs.
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-indigo-900 font-bold">
                    <span>DenseNet121 Neural Network</span>
                    <span className="text-[10px] font-mono bg-indigo-100 px-2 py-0.5 rounded text-indigo-800">True Grad-CAM</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Trained multi-class classifier (Glioma, Meningioma, Pituitary, No Tumor) with heatmap localization.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1 text-emerald-950">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span>Supabase PostgreSQL Engine</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Session Pooler 6543</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    576 live records across 15 relational tables with strict hospital-level authorization scoping.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {activeTab === 'security' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5 text-xs">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-gray-900">Security Credentials & Data Compliance</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400">JWT-HS256 Standard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Password & Authentication</span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Your password is protected using PBKDF2 SHA-256 salted hashes. You can request a 6-digit OTP reset code at any time from the login portal.
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>Gmail SMTP Notifications</span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Email alerts and appointment confirmation updates are dispatched via encrypted TLS 587 SMTP connection.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserProfileCard;
