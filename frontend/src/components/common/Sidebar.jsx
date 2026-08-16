import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, FileText, Stethoscope, Utensils, Video,
  HelpCircle, Mail, Info, User, LogOut, CheckCircle, Users, ShieldAlert,
  BarChart2, Settings, ListChecks, Calendar, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';

const Sidebar = ({ currentTab, setCurrentTab }) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

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
    { id: 'pending-scans', label: 'Pending Reports', icon: UploadCloud },
    { id: 'patient-history', label: 'Patient History', icon: ListChecks },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'patients', label: 'Appointments', icon: Calendar },
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 min-h-[calc(100vh-4rem)] bg-white border-r border-gray-200 p-4 flex flex-col justify-between shrink-0">
      
      <div>
        {/* User Card Header */}
        <div className="p-3 mb-5 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
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
  );
};

export default Sidebar;
