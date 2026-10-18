import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, FileText, Stethoscope, Utensils, Video,
  HelpCircle, Mail, User, LogOut, CheckCircle, Users,
  ListChecks, Calendar, MessageSquare, ChevronDown, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { messageAPI, doctorAPI } from '../../services/api';

const Sidebar = ({ currentTab, setCurrentTab, pendingApptsCount: propApptsCount }) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApptsCount, setPendingApptsCount] = useState(propApptsCount || 0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (propApptsCount !== undefined) {
      setPendingApptsCount(propApptsCount);
    }
  }, [propApptsCount]);

  useEffect(() => {
    if (role === 'DOCTOR' || role === 'PATIENT') {
      const fetchUnread = async () => {
        try {
          const res = await messageAPI.getUnreadCount();
          setUnreadCount(res.data.unread_count || 0);
        } catch (e) {
          // ignore silent polling errors
        }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 5000);
      return () => clearInterval(interval);
    }
  }, [role]);

  useEffect(() => {
    if (role === 'DOCTOR') {
      const fetchDoctorAppts = async () => {
        try {
          const res = await doctorAPI.getAppointments();
          const count = res.data?.pending_requests_count ?? (res.data?.appointments || []).filter(a => a.status === 'SCHEDULED').length;
          setPendingApptsCount(count);
        } catch (e) {
          // ignore silent polling errors
        }
      };
      fetchDoctorAppts();
      const interval = setInterval(fetchDoctorAppts, 10000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const patientNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload MRI', icon: UploadCloud },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'recommendation', label: 'Doctor Recommendation', icon: Stethoscope },
    { id: 'diet', label: 'Diet', icon: Utensils },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const doctorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pending-scans', label: 'Clinical Queue', icon: ListChecks, badge: pendingApptsCount },
    { id: 'patient-history', label: 'Patient History', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'patients', label: 'Appointments', icon: Calendar, badge: pendingApptsCount },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'contact-admin', label: 'Contact Admin', icon: Mail },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'doctor-approval', label: 'Approve Doctors', icon: CheckCircle },
    { id: 'patients', label: 'Manage Patients', icon: Users },
    { id: 'doctors', label: 'Manage Doctors', icon: Stethoscope },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'inbox', label: 'Inbox', icon: Mail },
    { id: 'faqs', label: 'FAQ', icon: HelpCircle },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = role === 'ADMIN' ? adminNav : role === 'DOCTOR' ? doctorNav : patientNav;
  const activeItem = navItems.find((item) => item.id === currentTab) || navItems[0];
  const ActiveIcon = activeItem?.icon || LayoutDashboard;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* 1. MOBILE & TABLET NAVIGATION STRIP (< lg) */}
      <div className="lg:hidden w-full bg-white border border-gray-200 rounded-xl p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.patient_profile?.name?.[0] || user?.doctor_profile?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-800 truncate">
                {user?.patient_profile?.name || user?.doctor_profile?.name || user?.email?.split('@')[0]}
              </p>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                {role} PORTAL
              </span>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <ActiveIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[100px] truncate">{activeItem?.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Scrollable horizontal tab pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar border-t border-gray-100 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.label}</span>
                {Boolean(item.badge) && item.badge > 0 && (
                  <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                    isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Dropdown Expanded List */}
        {mobileMenuOpen && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5 animate-in fade-in duration-150">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {Boolean(item.badge) && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. DESKTOP VERTICAL SIDEBAR (>= lg) */}
      <aside className="hidden lg:flex w-60 min-h-[calc(100vh-5rem)] bg-white border border-gray-200 rounded-xl p-4 flex-col justify-between shrink-0 shadow-sm sticky top-20">
        <div>
          {/* User Card Header */}
          <div className="p-3 mb-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {user?.patient_profile?.name?.[0] || user?.doctor_profile?.name?.[0] || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {user?.patient_profile?.name || user?.doctor_profile?.name || user?.email?.split('@')[0]}
                </p>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {role}
                </span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {Boolean(item.badge) && item.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
