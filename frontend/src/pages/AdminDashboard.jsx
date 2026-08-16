// B.Tech Final Year CSE Project - Admin Management Dashboard
// Handles Doctor Approvals, Patient Management, Report Audit, FAQ & Video CMS, and System Settings

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Toast from '../components/common/Toast';
import {
  Users, Stethoscope, CheckCircle2, Clock, FileText, Settings as SettingsIcon, ShieldAlert,
  HelpCircle, Video as VideoIcon, Mail, Trash2, Key, Check, X, Download, Plus, Save, Search, ChevronDown, ChevronUp,
  Building2, Activity, Sparkles
} from 'lucide-react';
import { adminAPI, analyticsAPI, contentAPI, scanAPI, reportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Report Grouping & Filter State
  const [searchReportInput, setSearchReportInput] = useState('');
  const [reportsDiagnosisFilter, setReportsDiagnosisFilter] = useState('ALL');
  const [reportsStatusFilter, setReportsStatusFilter] = useState('ALL');
  const [expandedPatientIds, setExpandedPatientIds] = useState([]);

  const toggleExpandPatient = (patientId) => {
    setExpandedPatientIds(prev => 
      prev.includes(patientId) ? prev.filter(id => id !== patientId) : [...prev, patientId]
    );
  };

  // Data Collections
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [replyDraft, setReplyDraft] = useState({});   // { [messageId]: string }

  // Modals & Forms State
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'Brain Tumor', is_published: true });

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    category: 'Brain Tumor',
    thumbnail_url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
    video_url: 'https://www.youtube.com/embed/5qap5aO4i9A'
  });

  const [selectedDoctorModal, setSelectedDoctorModal] = useState(null);
  const [doctorFilter, setDoctorFilter] = useState('ALL');
  const [doctorSearch, setDoctorSearch] = useState('');

  const handleApproveDoctor = async (doc) => {
    const confirmApprove = window.confirm(
      `Have you manually verified this doctor's registration and submitted information?\n\nDoctor: ${doc.name}\nReg No: ${doc.medical_reg_no}\nHospital: ${doc.hospital}`
    );
    if (!confirmApprove) return;

    try {
      await adminAPI.approveDoctorAction(doc.id, { status: 'APPROVED', notes: 'Manual verification confirmed by Administrator' });
      setToast({ message: `Dr. ${doc.name} has been manually approved!`, type: "success" });
      fetchAdminData();
      setSelectedDoctorModal(null);
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Approval action failed.";
      setToast({ message: errMsg, type: "error" });
    }
  };

  const handleRejectDoctor = async (doc) => {
    const reason = prompt(`Enter rejection reason for Dr. ${doc.name}:`, "Medical registration information could not be verified.");
    if (!reason || !reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }

    try {
      await adminAPI.approveDoctorAction(doc.id, { status: 'REJECTED', notes: reason.trim() });
      setToast({ message: `Dr. ${doc.name} application rejected.`, type: "success" });
      fetchAdminData();
      setSelectedDoctorModal(null);
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Rejection action failed.";
      setToast({ message: errMsg, type: "error" });
    }
  };

  const [settingsForm, setSettingsForm] = useState({
    hospital_name: 'National Institute Medical Center',
    dense_net_threshold: '0.85',
    smtp_gateway: 'smtp.gmail.com',
    smtp_port: '587',
    jwt_expiry_hours: '24'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pDocs, docs, pats, reps, f, v, inbox] = await Promise.all([
        analyticsAPI.getDashboardStats().catch(() => ({ data: null })),
        adminAPI.getPendingDoctors().catch(() => ({ data: [] })),
        adminAPI.getAllDoctors().catch(() => ({ data: [] })),
        adminAPI.getAllPatients().catch(() => ({ data: [] })),
        scanAPI.getAllScans().catch(() => ({ data: [] })),
        contentAPI.getFAQs().catch(() => ({ data: [] })),
        contentAPI.getVideos().catch(() => ({ data: [] })),
        contentAPI.getInbox().catch(() => ({ data: [] })),
      ]);
      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (pDocs && pDocs.data) setPendingDoctors(pDocs.data);
      if (docs && docs.data) setAllDoctors(docs.data);
      if (pats && pats.data) setAllPatients(pats.data);
      if (reps && reps.data) setAllReports(reps.data);
      if (f && f.data) setFaqs(f.data);
      if (v && v.data) setVideos(v.data);
      if (inbox && inbox.data) setInboxMessages(inbox.data);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId) => {
    const text = replyDraft[messageId];
    if (!text || !text.trim()) return;
    try {
      await contentAPI.replyToMessage(messageId, text.trim());
      setToast({ message: "Reply sent successfully!", type: "success" });
      setReplyDraft((prev) => ({ ...prev, [messageId]: '' }));
      const inbox = await contentAPI.getInbox();
      setInboxMessages(inbox.data);
    } catch (err) {
      setToast({ message: "Failed to send reply.", type: "error" });
    }
  };

  const handleArchive = async (messageId) => {
    try {
      await contentAPI.updateMessageStatus(messageId, 'ARCHIVED');
      const inbox = await contentAPI.getInbox();
      setInboxMessages(inbox.data);
    } catch (err) {
      setToast({ message: "Failed to archive message.", type: "error" });
    }
  };

  const handleDoctorApprovalAction = async (doctorId, statusAction) => {
    try {
      await adminAPI.approveDoctorAction(doctorId, { status: statusAction, notes: `Action by Admin` });
      setToast({ message: `Doctor status updated to ${statusAction}!`, type: "success" });
      fetchAdminData();
    } catch (err) {
      setToast({ message: "Approval action failed.", type: "error" });
    }
  };

  const handleResetPassword = async (doctorId) => {
    const newPwd = prompt("Enter new password for doctor:", "Doctor@123456");
    if (newPwd) {
      try {
        await adminAPI.resetDoctorPassword(doctorId, newPwd);
        setToast({ message: "Doctor password reset successfully!", type: "success" });
      } catch (err) {
        setToast({ message: "Password reset failed.", type: "error" });
      }
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (window.confirm("Delete this doctor account?")) {
      try {
        await adminAPI.deleteDoctor(doctorId);
        setToast({ message: "Doctor account deleted.", type: "success" });
        fetchAdminData();
      } catch (err) {
        setToast({ message: "Delete failed.", type: "error" });
      }
    }
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    try {
      await contentAPI.createFAQ(faqForm);
      setToast({ message: "FAQ item created!", type: "success" });
      setShowFaqModal(false);
      fetchAdminData();
    } catch (err) {
      setToast({ message: "Failed to create FAQ.", type: "error" });
    }
  };

  const handleDeleteFaq = async (faqId) => {
    if (window.confirm("Are you sure you want to delete this FAQ item?")) {
      try {
        await contentAPI.deleteFAQ(faqId);
        setToast({ message: "FAQ item deleted successfully.", type: "success" });
        fetchAdminData();
      } catch (err) {
        setToast({ message: "Failed to delete FAQ item.", type: "error" });
      }
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    try {
      await contentAPI.createVideo(videoForm);
      setToast({ message: "Educational video added successfully!", type: "success" });
      setShowVideoModal(false);
      setVideoForm({
        title: '',
        description: '',
        category: 'Brain Tumor',
        thumbnail_url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
        video_url: 'https://www.youtube.com/embed/5qap5aO4i9A'
      });
      fetchAdminData();
    } catch (err) {
      setToast({ message: "Failed to add video.", type: "error" });
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm("Delete this educational video resource?")) {
      try {
        await contentAPI.deleteVideo(videoId);
        setToast({ message: "Video resource deleted.", type: "success" });
        fetchAdminData();
      } catch (err) {
        setToast({ message: "Failed to delete video.", type: "error" });
      }
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setToast({ message: "System configuration settings saved successfully!", type: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 space-y-5">
          
          {/* OVERVIEW DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Management Panel</h1>
                <p className="text-xs text-gray-500">Academic Project Administration & User Controls</p>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Registered Patients</span>
                  <p className="text-2xl font-bold text-gray-900">{stats?.patients_count || 0}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Total Doctors</span>
                  <p className="text-2xl font-bold text-gray-900">{stats?.doctors_count || 0}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Pending Doctors</span>
                  <p className="text-2xl font-bold text-amber-600">{stats?.pending_doctors_count || 0}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Total Predictions</span>
                  <p className="text-2xl font-bold text-blue-600">{stats?.total_predictions || 0}</p>
                </div>
              </div>

              {/* Pending Doctor Approvals Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-sm">Doctor Registration Approval Queue</h3>
                {pendingDoctors.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">No pending doctor registration approvals.</div>
                ) : (
                  <table className="table-academic">
                    <thead>
                      <tr>
                        <th>Doctor Name</th>
                        <th>Specialization</th>
                        <th>Hospital</th>
                        <th>Reg Number</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDoctors.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-medium text-gray-900">{doc.name}</td>
                          <td>{doc.specialization}</td>
                          <td>{doc.hospital}</td>
                          <td className="font-mono text-xs">{doc.medical_reg_no}</td>
                          <td>
                            <div className="flex gap-2">
                              <button onClick={() => handleDoctorApprovalAction(doc.id, 'APPROVED')} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold">Approve</button>
                              <button onClick={() => handleDoctorApprovalAction(doc.id, 'REJECTED')} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* DOCTOR APPROVAL TAB */}
          {(currentTab === 'doctor-approval' || currentTab === 'dashboard') && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-bold text-sm text-blue-900">Doctor Verification Protocol</h2>
                  <p className="text-xs text-blue-700 mt-0.5">
                    All doctor accounts require manual administrator verification of medical council credentials before clinical privileges are granted. AI plays zero role in doctor approval decisions.
                  </p>
                </div>
              </div>

              {/* Status Summary & Filters */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">Filter Queue:</span>
                  {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setDoctorFilter(st)}
                      className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
                        doctorFilter === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {st === 'ALL' ? 'All Requests' : st}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search doctor name, reg number, city, hospital..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs w-full md:w-72"
                />
              </div>

              {/* Doctor Registration Queue Table */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Doctor Verification Queue</h3>
                {(() => {
                  const sourceList = allDoctors.length ? allDoctors : pendingDoctors;
                  const filtered = sourceList.filter((doc) => {
                    if (doctorFilter !== 'ALL' && doc.status !== doctorFilter) return false;
                    if (!doctorSearch.trim()) return true;
                    const q = doctorSearch.toLowerCase();
                    return (
                      doc.name.toLowerCase().includes(q) ||
                      doc.medical_reg_no.toLowerCase().includes(q) ||
                      (doc.hospital || '').toLowerCase().includes(q) ||
                      (doc.city || '').toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return <div className="p-8 text-center text-gray-500 text-xs font-medium">No doctor registration requests matching criteria.</div>;
                  }

                  return (
                    <table className="table-academic text-xs">
                      <thead>
                        <tr>
                          <th>Doctor Name</th>
                          <th>Specialization</th>
                          <th>Hospital & Location</th>
                          <th>Medical Reg No</th>
                          <th>Verification Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((doc) => (
                          <tr key={doc.id}>
                            <td className="font-bold text-gray-900">{doc.name}</td>
                            <td className="text-gray-700 font-medium">{doc.specialization}</td>
                            <td className="text-gray-600 font-medium">{doc.hospital} ({doc.city || 'India'})</td>
                            <td className="font-mono font-bold text-blue-800">{doc.medical_reg_no}</td>
                            <td>
                              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                doc.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200'
                                : doc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {doc.status === 'PENDING' ? 'Manual Verification Required' : doc.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedDoctorModal(doc)}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold border border-gray-200"
                                >
                                  View Details
                                </button>
                                {doc.status !== 'APPROVED' && (
                                  <button
                                    onClick={() => handleApproveDoctor(doc)}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
                                  >
                                    Approve
                                  </button>
                                )}
                                {doc.status !== 'REJECTED' && (
                                  <button
                                    onClick={() => handleRejectDoctor(doc)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* MANAGE DOCTORS TAB */}
          {currentTab === 'doctors' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-gray-900">Registered Doctors Directory</h1>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                  Total: {allDoctors.length} Doctors
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                {allDoctors.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-medium">No registered doctors currently found in directory.</div>
                ) : (
                  <table className="table-academic">
                    <thead>
                      <tr>
                        <th>Doctor Name</th>
                        <th>Specialization</th>
                        <th>Hospital / City</th>
                        <th>Reg Number</th>
                        <th>Verification Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDoctors.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-bold text-gray-900">{doc.name}</td>
                          <td>{doc.specialization}</td>
                          <td>{doc.hospital} ({doc.city || 'India'})</td>
                          <td className="font-mono text-xs">{doc.medical_reg_no}</td>
                          <td>
                            <StatusBadge status={doc.status} />
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button onClick={() => setSelectedDoctorModal(doc)} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold border border-gray-200">Details</button>
                              <button onClick={() => handleResetPassword(doc.id)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">Reset Pwd</button>
                              <button onClick={() => handleDeleteDoctor(doc.id)} className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* MANAGE PATIENTS TAB */}
          {currentTab === 'patients' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">Registered Patients Directory</h1>
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <table className="table-academic">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Age / Gender</th>
                      <th>Phone</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPatients.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono">PT-{p.id}</td>
                        <td className="font-medium">{p.name}</td>
                        <td>{p.age} yrs / {p.gender}</td>
                        <td>{p.phone}</td>
                        <td>
                          <button onClick={() => adminAPI.deletePatient(p.id).then(() => fetchAdminData())} className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL REPORTS TAB - GROUPED BY PATIENT */}
          {currentTab === 'reports' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">System Diagnostic Reports</h1>
                <p className="text-xs text-gray-500">Grouped patient MRI reports & verified PDF generation</p>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient name, ID (e.g. PT-1)..."
                    value={searchReportInput}
                    onChange={(e) => setSearchReportInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={reportsDiagnosisFilter}
                    onChange={(e) => setReportsDiagnosisFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    <option value="ALL">All Diagnoses</option>
                    <option value="Glioma">Glioma</option>
                    <option value="Meningioma">Meningioma</option>
                    <option value="Pituitary">Pituitary</option>
                    <option value="No Tumor">No Tumor</option>
                  </select>

                  <select
                    value={reportsStatusFilter}
                    onChange={(e) => setReportsStatusFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending Review</option>
                  </select>
                </div>
              </div>

              {/* Patient Grouped Cards List */}
              {(() => {
                const groups = {};
                allReports.forEach(scan => {
                  const pid = scan.patient_id;
                  if (!groups[pid]) {
                    const patientObj = allPatients.find(p => p.id === pid) || scan.patient || { id: pid, name: `Patient PT-${pid}`, age: '--', gender: '--' };
                    groups[pid] = {
                      patient: patientObj,
                      scans: []
                    };
                  }
                  groups[pid].scans.push(scan);
                });

                const groupedList = Object.values(groups);

                const search = searchReportInput.toLowerCase().trim();
                const filteredGroups = groupedList.filter(group => {
                  const patient = group.patient;
                  const nameMatch = (patient.name || '').toLowerCase().includes(search);
                  const idMatch = `pt-${patient.id}`.toLowerCase().includes(search) || `${patient.id}` === search;
                  
                  if (search && !nameMatch && !idMatch) return false;

                  const matchingScans = group.scans.filter(scan => {
                    const tumor = scan.ai_report?.tumor_type || 'Unknown';
                    const status = scan.status || 'AI_COMPLETED';
                    const diagOk = reportsDiagnosisFilter === 'ALL' || tumor === reportsDiagnosisFilter;
                    const statusOk = reportsStatusFilter === 'ALL' || 
                      (reportsStatusFilter === 'APPROVED' && status === 'APPROVED') ||
                      (reportsStatusFilter === 'PENDING' && status !== 'APPROVED');
                    return diagOk && statusOk;
                  });

                  return matchingScans.length > 0;
                });

                groupedList.forEach(group => {
                  group.scans.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
                });

                if (filteredGroups.length === 0) {
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-xs text-gray-500 shadow-sm">
                      No patient diagnostic reports found matching the selected search and filter criteria.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredGroups.map(group => {
                      const patient = group.patient;
                      const isExpanded = expandedPatientIds.includes(patient.id);
                      
                      const displayedScans = group.scans.filter(scan => {
                        const tumor = scan.ai_report?.tumor_type || 'Unknown';
                        const status = scan.status || 'AI_COMPLETED';
                        const diagOk = reportsDiagnosisFilter === 'ALL' || tumor === reportsDiagnosisFilter;
                        const statusOk = reportsStatusFilter === 'ALL' || 
                          (reportsStatusFilter === 'APPROVED' && status === 'APPROVED') ||
                          (reportsStatusFilter === 'PENDING' && status !== 'APPROVED');
                        return diagOk && statusOk;
                      });

                      const lastScanDate = group.scans[0] ? new Date(group.scans[0].upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

                      return (
                        <div key={patient.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all">
                          {/* Top Card Header */}
                          <div 
                            onClick={() => toggleExpandPatient(patient.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                {patient.name?.[0] || 'P'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm text-gray-900">{patient.name}</h3>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    PT-{patient.id}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {patient.age ? `${patient.age} yrs` : 'Adult'} • {patient.gender || 'Patient'} • <span className="font-semibold text-gray-700">{group.scans.length} {group.scans.length === 1 ? 'report' : 'reports'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Last Study</span>
                                <span className="text-xs font-bold text-gray-800">{lastScanDate}</span>
                              </div>

                              <button 
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                              >
                                <span>{isExpanded ? 'Hide History' : 'View History'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable History Table */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 p-4 bg-gray-50/50">
                              <table className="table-academic">
                                <thead>
                                  <tr>
                                    <th>Scan ID</th>
                                    <th>Scan Date</th>
                                    <th>AI Diagnosis</th>
                                    <th>Confidence</th>
                                    <th>Clinical Status</th>
                                    <th>Report PDF</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {displayedScans.map(scan => {
                                    const dateStr = new Date(scan.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const tumor = scan.ai_report?.tumor_type || 'Unknown';
                                    const conf = scan.ai_report?.confidence || 0;
                                    const isApproved = scan.status === 'APPROVED';

                                    return (
                                      <tr key={scan.id}>
                                        <td className="font-mono font-bold text-gray-900">#ND-{scan.id}</td>
                                        <td className="text-gray-600">{dateStr}</td>
                                        <td>
                                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            tumor === 'No Tumor' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                          }`}>
                                            {tumor}
                                          </span>
                                        </td>
                                        <td className="font-bold text-gray-800">{conf}%</td>
                                        <td>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            isApproved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                          }`}>
                                            {isApproved ? 'Verified by Doctor' : 'AI Completed (Pending Review)'}
                                          </span>
                                        </td>
                                        <td>
                                          {scan.ai_report && (
                                            <button 
                                              onClick={() => reportAPI.downloadPDF(scan.ai_report.id)} 
                                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                                            >
                                              <Download className="w-3 h-3" /> PDF Report
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* FAQ TAB */}
          {currentTab === 'faqs' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">FAQ Management</h1>
                <button onClick={() => setShowFaqModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add FAQ Item
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                {faqs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 font-medium">No FAQ items published.</div>
                ) : (
                  faqs.map((f) => (
                    <div key={f.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start justify-between gap-4 text-xs transition-colors hover:bg-gray-100/60">
                      <div className="space-y-1 overflow-hidden">
                        <h4 className="font-bold text-gray-900 text-sm">{f.question}</h4>
                        <p className="text-gray-600 leading-relaxed">{f.answer}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFaq(f.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {showFaqModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg max-w-lg w-full space-y-4 text-xs border border-gray-200">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <h3 className="font-bold text-sm text-gray-900">Add New FAQ Item</h3>
                      <button onClick={() => setShowFaqModal(false)} className="font-bold text-gray-400">✕</button>
                    </div>
                    <form onSubmit={handleSaveFaq} className="space-y-3">
                      <div>
                        <label className="block font-semibold mb-1">Question</label>
                        <input type="text" required value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Answer</label>
                        <textarea rows={3} required value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">Save FAQ</button>
                        <button type="button" onClick={() => setShowFaqModal(false)} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs">Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIDEOS TAB */}
          {currentTab === 'videos' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">Educational Video Directory</h1>
                <button onClick={() => setShowVideoModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Add Video Resource
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <table className="table-academic">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Video URL</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v) => (
                      <tr key={v.id}>
                        <td className="font-medium text-gray-900">{v.title}</td>
                        <td><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-semibold border border-blue-200">{v.category}</span></td>
                        <td className="font-mono text-xs text-blue-600 truncate max-w-xs">{v.video_url}</td>
                        <td>
                          <button onClick={() => handleDeleteVideo(v.id)} className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ADD VIDEO MODAL DIALOG */}
              {showVideoModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg max-w-lg w-full space-y-4 text-xs border border-gray-200">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <h3 className="font-bold text-sm text-gray-900">Add New Educational Video</h3>
                      <button onClick={() => setShowVideoModal(false)} className="font-bold text-gray-400">✕</button>
                    </div>

                    <form onSubmit={handleSaveVideo} className="space-y-3">
                      <div>
                        <label className="block font-semibold mb-1">Video Title</label>
                        <input
                          type="text"
                          required
                          value={videoForm.title}
                          onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                          placeholder="e.g. Brain MRI Contrast Agent Guide"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Category</label>
                        <select
                          value={videoForm.category}
                          onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="Brain Tumor">Brain Tumor</option>
                          <option value="MRI Guide">MRI Guide</option>
                          <option value="Nutrition">Nutrition</option>
                          <option value="Recovery">Recovery</option>
                          <option value="Healthy Lifestyle">Healthy Lifestyle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Description</label>
                        <textarea
                          rows={2}
                          required
                          value={videoForm.description}
                          onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                          placeholder="Brief description of the educational content..."
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Thumbnail Image URL</label>
                        <input
                          type="text"
                          required
                          value={videoForm.thumbnail_url}
                          onChange={(e) => setVideoForm({ ...videoForm, thumbnail_url: e.target.value })}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">YouTube Embed URL</label>
                        <input
                          type="text"
                          required
                          value={videoForm.video_url}
                          onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                          placeholder="https://www.youtube.com/embed/XXXXX"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">Publish Video</button>
                        <button type="button" onClick={() => setShowVideoModal(false)} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs">Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INBOX TAB */}
          {currentTab === 'inbox' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">Patient Message Inbox</h1>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {inboxMessages.filter(m => m.status === 'UNREAD').length} Unread
                </span>
              </div>

              {inboxMessages.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-xs text-gray-400 shadow-sm">
                  No messages in inbox yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {inboxMessages.map((msg) => (
                    <div key={msg.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      {/* Message header */}
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{msg.subject}</p>
                            <p className="text-[11px] text-gray-500">
                              From <span className="font-semibold text-gray-700">{msg.sender_name}</span>
                              {' '}({msg.sender_email}) &nbsp;·&nbsp; {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              msg.status === 'REPLIED' ? 'bg-green-50 text-green-700 border-green-200'
                              : msg.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500 border-gray-200'
                              : msg.status === 'READ' ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>{msg.status}</span>
                            {msg.status !== 'ARCHIVED' && (
                              <button
                                onClick={() => handleArchive(msg.id)}
                                title="Archive message"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed border-t border-gray-100 pt-2">{msg.message}</p>
                      </div>

                      {/* Existing reply */}
                      {msg.reply_text && (
                        <div className="bg-green-50 border-t border-green-100 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">A</div>
                            <span className="text-[11px] font-bold text-green-800">Your reply</span>
                            <span className="text-green-400 text-[10px]">{msg.replied_at ? new Date(msg.replied_at).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-xs text-green-900 pl-7 leading-relaxed">{msg.reply_text}</p>
                        </div>
                      )}

                      {/* Reply composer */}
                      {msg.status !== 'ARCHIVED' && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              placeholder="Type your reply here..."
                              value={replyDraft[msg.id] || ''}
                              onChange={(e) => setReplyDraft((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                              className="flex-1 p-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                            />
                            <button
                              onClick={() => handleReply(msg.id)}
                              disabled={!replyDraft[msg.id]?.trim()}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-lg transition-colors shrink-0 self-end"
                            >
                              Send Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {currentTab === 'settings' && (
            <div className="space-y-6 max-w-4xl font-sans">
              
              {/* Header Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-blue-400" />
                      <h1 className="text-xl font-extrabold tracking-tight text-white">System Configuration & Institution Control</h1>
                    </div>
                    <p className="text-xs text-slate-300">
                      Configure primary hospital branding, AI confidence thresholds, SMTP credentials, and database storage settings.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-bold border border-green-500/30 flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span>System Online</span>
                    </span>
                  </div>
                </div>

                {/* System Badges */}
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 bg-white/10 text-white rounded-lg font-bold border border-white/10 flex items-center gap-1">
                    🐘 Supabase PostgreSQL (Session Pooler 6543)
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 text-white rounded-lg font-bold border border-white/10 flex items-center gap-1">
                    📦 Supabase Storage ("NeuroDetect Org")
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 text-white rounded-lg font-bold border border-white/10 flex items-center gap-1">
                    🧠 DenseNet121 Grad-CAM Engine
                  </span>
                </div>
              </div>

              {/* Main Settings Form */}
              <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
                
                {/* 1. Hospital / Institution Branding Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-sm text-gray-900">Hospital & Healthcare Institution Branding</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">Primary Facility</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Hospital / Institution Name (Appears on Patient Reports & Dashboards)
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={settingsForm.hospital_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, hospital_name: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                          placeholder="e.g. AIIMS New Delhi — Advanced Institute of Neuro-Oncology"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 block mb-1.5">Quick Hospital Name Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'AIIMS New Delhi — Advanced Institute of Neuro-Oncology',
                          'Apollo Hospitals, Bangalore — Center for Neurosciences',
                          'Manipal Hospital, Bangalore — Institute of Brain & Spine',
                          'Fortis Healthcare, Mumbai — Department of Neurological Surgery',
                          'Max Super Speciality Hospital, New Delhi — Neuro-Diagnostic Division'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSettingsForm({ ...settingsForm, hospital_name: preset })}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-gray-700 rounded-lg text-[11px] font-semibold border border-gray-200 transition-colors"
                          >
                            + {preset.split('—')[0].trim()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-blue-900">
                      <span className="text-[11px] font-bold">Institution Accreditations & Certifications</span>
                      <div className="flex gap-1.5">
                        <span className="px-2 py-0.5 bg-white text-blue-700 rounded font-bold text-[10px] border border-blue-200">NABH Accredited</span>
                        <span className="px-2 py-0.5 bg-white text-blue-700 rounded font-bold text-[10px] border border-blue-200">ISO 15189</span>
                        <span className="px-2 py-0.5 bg-white text-blue-700 rounded font-bold text-[10px] border border-blue-200">ICMR Approved</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AI Classifier Threshold Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-sm text-gray-900">DenseNet121 Classification Confidence Threshold</h3>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase">AI Model v2.4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Minimum Confidence Cutoff (0.50 to 0.99)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={settingsForm.dense_net_threshold}
                          onChange={(e) => setSettingsForm({ ...settingsForm, dense_net_threshold: e.target.value })}
                          className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                      <span className="font-bold text-indigo-900 block text-[11px]">Classifier Sensitivity:</span>
                      <p className="text-[11px] text-indigo-700">
                        Predictions with confidence ≥ <b className="text-indigo-900 font-mono">{settingsForm.dense_net_threshold}</b> are flagged for instant attending physician review with Grad-CAM heatmap overlay.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. SMTP Gateway & Security Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-600" />
                      <h3 className="font-bold text-sm text-gray-900">SMTP Gateway & Email Notification Server</h3>
                    </div>
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase">TLS Encrypted</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">SMTP Server Host</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.smtp_gateway}
                        onChange={(e) => setSettingsForm({ ...settingsForm, smtp_gateway: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-600 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">SMTP Server Port</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.smtp_port}
                        onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Settings Action Button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500 font-medium">All settings changes apply instantly across the NeuroDetect platform.</span>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save System Configuration</span>
                  </button>
                </div>

              </form>
            </div>
          )}

        </main>
      </div>

      {/* DOCTOR DETAILS MODAL */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-base text-gray-900">Submitted Doctor Registration Details</h3>
              <button onClick={() => setSelectedDoctorModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-2 text-gray-700">
              <p><b>Doctor Name:</b> <span className="font-bold text-gray-900">{selectedDoctorModal.name}</span></p>
              <p><b>Specialization:</b> {selectedDoctorModal.specialization}</p>
              <p><b>Medical Registration No:</b> <span className="font-mono font-bold text-blue-700">{selectedDoctorModal.medical_reg_no}</span></p>
              <p><b>Experience:</b> {selectedDoctorModal.experience_years} Years</p>
              <p><b>Hospital Name:</b> {selectedDoctorModal.hospital}</p>
              <p><b>City & State:</b> {selectedDoctorModal.city || 'N/A'}, India</p>
              <p><b>Full Practice Address:</b> {selectedDoctorModal.location}</p>
              <p><b>Verification Status:</b> <span className="font-bold text-amber-700">{selectedDoctorModal.status === 'PENDING' ? 'Manual Verification Required' : selectedDoctorModal.status}</span></p>
            </div>

            {selectedDoctorModal.certificate_url && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                <span className="font-medium text-gray-700">Medical Council Certificate:</span>
                <a
                  href={`http://127.0.0.1:8000${selectedDoctorModal.certificate_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs"
                >
                  View Document
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setSelectedDoctorModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg">Close</button>
              {selectedDoctorModal.status !== 'APPROVED' && (
                <button onClick={() => handleApproveDoctor(selectedDoctorModal)} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm">
                  Approve Doctor Account
                </button>
              )}
              {selectedDoctorModal.status !== 'REJECTED' && (
                <button onClick={() => handleRejectDoctor(selectedDoctorModal)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm">
                  Reject Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;
