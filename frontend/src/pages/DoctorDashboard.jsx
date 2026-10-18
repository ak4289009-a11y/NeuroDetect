// NeuroDetect Clinical AI - Doctor Clinical Dashboard
// Dedicated workstation for Neurologists to review pending MRI scans, inspect patient history, analyze diagnostic metrics, and issue clinical reports

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Toast from '../components/common/Toast';
import {
  Users, Clock, CheckCircle2, Award, FileText, Search, Download, Eye,
  Activity, Stethoscope, Calendar, Brain, ListChecks, BarChart2, User, ChevronDown, ChevronUp, Filter, X,
  Mail, Send, MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { analyticsAPI, doctorAPI, reportAPI, scanAPI, adminAPI, contentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ClinicalChat from '../components/chat/ClinicalChat';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import UserProfileCard from '../components/common/UserProfileCard';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [pendingScans, setPendingScans] = useState([]);
  const [allScans, setAllScans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activePatientsCount, setActivePatientsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchPatientInput, setSearchPatientInput] = useState('');
  const [searchReportInput, setSearchReportInput] = useState('');
  const [reportsDiagnosisFilter, setReportsDiagnosisFilter] = useState('ALL');
  const [reportsStatusFilter, setReportsStatusFilter] = useState('ALL');
  const [apptStatusFilter, setApptStatusFilter] = useState('ALL');
  const [searchApptInput, setSearchApptInput] = useState('');
  const [expandedReportPatientIds, setExpandedReportPatientIds] = useState(new Set());
  const [patientHistoryPage, setPatientHistoryPage] = useState(1);
  const [collapsedPatientIds, setCollapsedPatientIds] = useState(new Set());

  // Tumor Classification Filter State (Interactive Pie Chart)
  const [selectedTumorFilter, setSelectedTumorFilter] = useState('ALL');

  // Review Modal State
  const [selectedScan, setSelectedScan] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    clinical_notes: '', diagnosis: '', prescription: '', suggested_tests: '', medicines: '', next_visit_date: 'In 2 Weeks', status: 'APPROVED'
  });

  // Contact Admin Helpdesk State
  const [adminMessageForm, setAdminMessageForm] = useState({ subject: '', message: '' });
  const [myAdminMessages, setMyAdminMessages] = useState([]);

  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (!adminMessageForm.subject.trim() || !adminMessageForm.message.trim()) return;
    try {
      await contentAPI.sendContactMessage({
        sender_name: user?.doctor_profile?.name || user?.name || 'Dr. Specialist',
        sender_email: user?.email || 'doctor@neurodetect.ai',
        subject: `[DOCTOR INQUIRY] ${adminMessageForm.subject}`,
        message: adminMessageForm.message,
        patient_user_id: user?.id
      });
      setToast({ message: "Inquiry sent to Administrator successfully!", type: "success" });
      setAdminMessageForm({ subject: '', message: '' });
      fetchAdminMessages();
    } catch (err) {
      setToast({ message: "Failed to send inquiry to administrator.", type: "error" });
    }
  };

  const fetchAdminMessages = async () => {
    try {
      const res = await contentAPI.getMyMessages();
      setMyAdminMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching admin messages:", err);
    }
  };

  useEffect(() => {
    fetchDoctorData(true);
    const interval = setInterval(() => {
      fetchDoctorData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDoctorData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const results = await Promise.allSettled([
        analyticsAPI.getDashboardStats(),
        analyticsAPI.getChartsData(),
        doctorAPI.getPendingScans(),
        scanAPI.getAllScans(),
        doctorAPI.getPatients(),
        doctorAPI.getAppointments()
      ]);

      const statsData = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const chartsDataVal = results[1].status === 'fulfilled' ? results[1].value.data : null;
      const docScans = results[2].status === 'fulfilled' ? (results[2].value.data || []) : [];
      const systemScans = results[3].status === 'fulfilled' ? (results[3].value.data || []) : [];
      const patsData = results[4].status === 'fulfilled' ? (results[4].value.data || []) : [];
      const apptData = results[5].status === 'fulfilled' ? (results[5].value.data || { active_patients_count: 0, appointments: [] }) : { active_patients_count: 0, appointments: [] };

      setStats(statsData);
      setChartsData(chartsDataVal);
      setPendingScans(docScans);
      setAllScans(systemScans.length > 0 ? systemScans : docScans);
      setAppointments(apptData.appointments || []);
      setActivePatientsCount(apptData.active_patients_count || 0);
      setPatients(patsData);
      fetchAdminMessages();
    } catch (err) {
      console.error("Doctor dashboard fetch error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const pendingAppointments = appointments.filter(a => a.status === 'SCHEDULED');

  const handleOpenReview = (scan) => {
    setSelectedScan(scan);
    setReviewForm({
      clinical_notes: scan.ai_report?.tumor_type !== 'No Tumor' ? 'Patient presents with persistent tension headaches. DenseNet121 spatial activation matches clinical presentation.' : 'Normal brain MRI scan study.',
      diagnosis: scan.ai_report?.tumor_type !== 'No Tumor' ? `Evaluated ${scan.ai_report?.tumor_type} lesion.` : 'Normal brain MRI scan (No Tumor).',
      prescription: scan.ai_report?.tumor_type !== 'No Tumor' ? 'Temozolomide 100mg once daily. Dexamethasone 4mg twice daily.' : 'No medication required. Normal routine.',
      suggested_tests: scan.ai_report?.tumor_type !== 'No Tumor' ? 'Follow-up Contrast MRI in 4 weeks & Complete Blood Count' : 'Annual Routine Check',
      medicines: scan.ai_report?.tumor_type !== 'No Tumor' ? 'Temozolomide, Dexamethasone, Ondansetron' : 'None',
      next_visit_date: 'In 3 Weeks',
      status: 'APPROVED'
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedScan?.ai_report?.id) return;

    try {
      await doctorAPI.submitReview({
        report_id: selectedScan.ai_report.id,
        ...reviewForm
      });
      setToast({ message: "Clinical review submitted & verified report issued!", type: "success" });
      setSelectedScan(null);
      fetchDoctorData();
    } catch (err) {
      console.error("Submit review error:", err);
      const detailMsg = err.response?.data?.detail || "Failed to submit review.";
      setToast({ message: detailMsg, type: "error" });
    }
  };

  const activeCharts = chartsData;

  const filteredPatients = patients.filter(p => {
    if (!p) return false;
    const search = (searchPatientInput || '').toLowerCase().trim();
    if (!search) return true;
    const nameMatch = (p.name || '').toLowerCase().includes(search);
    const phoneMatch = (p.phone || '').includes(search);
    const idMatch = `pt-${p.id}`.includes(search);
    return nameMatch || phoneMatch || idMatch;
  });

  const filteredScansByTumor = selectedTumorFilter === 'ALL'
    ? allScans
    : allScans.filter(s => s.ai_report?.tumor_type?.toLowerCase() === selectedTumorFilter.toLowerCase());

  const getAppointmentDetails = (patientId) => {
    const activeAppts = appointments.filter(
      a => Number(a.patient_id) === Number(patientId) && a.status !== 'CANCELLED'
    );
    if (activeAppts.length > 0) {
      const latest = activeAppts[activeAppts.length - 1];
      return { 
        date: latest.appointment_date_formatted || latest.appointment_date || 'Scheduled',
        status: latest.status 
      };
    }
    const anyAppt = appointments.find(a => Number(a.patient_id) === Number(patientId));
    if (anyAppt && anyAppt.status === 'CANCELLED') {
      return { date: 'Cancelled', status: 'CANCELLED' };
    }
    return { date: 'Not Scheduled', status: 'NONE' };
  };

  const handleUpdateAppointmentStatus = async (apptId, newStatus) => {
    try {
      await doctorAPI.updateAppointmentStatus(apptId, newStatus);
      setToast({ message: `Appointment marked as ${newStatus}!`, type: "success" });
      fetchDoctorData();
    } catch (err) {
      console.error("Update appointment status error:", err);
      const msg = err.response?.data?.detail || "Failed to update appointment status.";
      setToast({ message: msg, type: "error" });
    }
  };

  const handleDoctorCancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await doctorAPI.cancelAppointment(apptId);
      setToast({ message: "Appointment cancelled successfully.", type: "info" });
      fetchDoctorData();
    } catch (err) {
      console.error("Cancel appointment error:", err);
      const msg = err.response?.data?.detail || "Failed to cancel appointment.";
      setToast({ message: msg, type: "error" });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} pendingApptsCount={pendingAppointments.length} />

        <main className="flex-1 min-w-0 space-y-6">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Doctor Clinical Control Panel</h1>
                  <p className="text-xs text-gray-500">Welcome, {user?.doctor_profile?.name || 'Dr. Specialist'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('patients')}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                      pendingAppointments.length > 0
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                        : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Appointment Requests ({pendingAppointments.length})</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('pending-scans')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>Review Clinical Queue ({pendingAppointments.length + pendingScans.length})</span>
                  </button>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Registered Patients</span>
                  <p className="text-2xl font-bold text-gray-900">{activePatientsCount || patients.length || stats?.todays_patients || 0}</p>
                  <span className="text-[10px] text-gray-400">Total in your roster</span>
                </div>
                <div 
                  onClick={() => setCurrentTab('patients')}
                  className={`bg-white border rounded-lg p-4 shadow-sm space-y-1 cursor-pointer transition-all hover:shadow ${
                    pendingAppointments.length > 0 ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Appointment Requests</span>
                    {pendingAppointments.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                        Action Needed
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{pendingAppointments.length}</p>
                  <span className="text-[10px] text-gray-400">{appointments.length} total scheduled</span>
                </div>
                <div 
                  onClick={() => setCurrentTab('pending-scans')}
                  className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-4 shadow-sm space-y-1 cursor-pointer transition-all hover:shadow"
                >
                  <span className="text-xs font-semibold text-gray-500">Pending Scan Reviews</span>
                  <p className="text-2xl font-bold text-blue-600">{pendingScans.length}</p>
                  <span className="text-[10px] text-gray-400">Scans awaiting signoff</span>
                </div>
                <div 
                  onClick={() => setCurrentTab('reports')}
                  className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-4 shadow-sm space-y-1 cursor-pointer transition-all hover:shadow"
                >
                  <span className="text-xs font-semibold text-gray-500">Completed Reports</span>
                  <p className="text-2xl font-bold text-green-600">{allScans.filter(s => s.status === 'APPROVED').length}</p>
                  <span className="text-[10px] text-gray-400">Approved consultations</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1 col-span-2 lg:col-span-1">
                  <span className="text-xs font-semibold text-gray-500">Model Accuracy</span>
                  <p className="text-2xl font-bold text-blue-600">{stats?.average_confidence || 95.8}%</p>
                  <span className="text-[10px] text-gray-400">DenseNet121 Ensemble</span>
                </div>
              </div>

              {/* Charts & Interactive Pie Filter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Interactive Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm">Tumor Classification Breakdown</h3>
                    <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Click slice to filter patients
                    </span>
                  </div>

                  {/* Classification Filter Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['ALL', 'No Tumor', 'Glioma', 'Meningioma', 'Pituitary'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedTumorFilter(cat)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors border ${
                          selectedTumorFilter === cat
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {cat === 'ALL' ? 'All Classes' : cat}
                      </button>
                    ))}
                  </div>

                  <div className="h-60 cursor-pointer">
                    {!activeCharts || activeCharts.tumor_distribution.every(item => item.value === 0) ? (
                      <div className="h-full flex items-center justify-center text-xs text-gray-500 italic bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                        No diagnostic analytics available yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activeCharts.tumor_distribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            label
                            onClick={(entry) => setSelectedTumorFilter(entry.name)}
                          >
                            {activeCharts.tumor_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend onClick={(entry) => setSelectedTumorFilter(entry.value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. Monthly Scan Volume Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">Monthly Scan Volume</h3>
                  <div className="h-60">
                    {!activeCharts || activeCharts.monthly_scans.every(item => item.scans === 0) ? (
                      <div className="h-full flex items-center justify-center text-xs text-gray-500 italic bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                        No verification data available yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeCharts.monthly_scans}>
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="scans" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* FILTERED PATIENTS TABLE (Triggered by clicking "No Tumor", "Glioma", etc.) */}
              {selectedTumorFilter !== 'ALL' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-blue-900">
                        Patients Filtered by Classification: <span className="underline font-mono text-blue-700 font-extrabold">{selectedTumorFilter}</span>
                      </span>
                      <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                        {filteredScansByTumor.length} Records Found
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTumorFilter('ALL')}
                      className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Clear Filter (Show All)
                    </button>
                  </div>

                  {filteredScansByTumor.length === 0 ? (
                    <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-xs text-gray-500">
                      No patients found matching classification '{selectedTumorFilter}'.
                    </div>
                  ) : (
                    <table className="table-academic bg-white rounded-lg overflow-hidden border border-gray-200">
                      <thead>
                        <tr>
                          <th>Scan ID</th>
                          <th>Patient Name</th>
                          <th>Age / Gender</th>
                          <th>Phone Number</th>
                          <th>Appointment Date & Time</th>
                          <th>AI Diagnosis</th>
                          <th>Confidence</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredScansByTumor.map((scan) => {
                          const patient = patients.find(p => p.id === scan.patient_id);
                          const apptInfo = getAppointmentDetails(scan.patient_id);
                          return (
                            <tr key={scan.id}>
                              <td className="font-mono font-bold">#ND-{scan.id}</td>
                              <td className="font-medium text-gray-900">{patient?.name || `Patient #${scan.patient_id}`}</td>
                              <td>{patient?.age ? `${patient.age} yrs` : 'N/A'} / {patient?.gender || 'N/A'}</td>
                              <td>{patient?.phone || 'N/A'}</td>
                              <td className="font-semibold text-blue-700">{apptInfo.date}</td>
                              <td>
                                <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                  scan.ai_report?.tumor_type === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                  : scan.ai_report?.tumor_type === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {scan.ai_report?.tumor_type}
                                </span>
                              </td>
                              <td className="font-bold">{scan.ai_report?.confidence}%</td>
                              <td>
                                {scan.ai_report && (
                                  <button
                                    onClick={() => reportAPI.downloadPDF(scan.ai_report.id)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm"
                                  >
                                    <Download className="w-3 h-3" /> Download PDF
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Incoming Patient Appointment Requests Widget */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Incoming Patient Appointment Requests</h3>
                      <p className="text-[11px] text-gray-500">Real-time clinical consultation bookings requested by patients</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                      pendingAppointments.length > 0 
                        ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold' 
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {pendingAppointments.length > 0 
                        ? `${pendingAppointments.length} Requests Awaiting Action` 
                        : 'All Requests Handled'}
                    </span>
                    <button
                      onClick={() => setCurrentTab('patients')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <span>View All Roster ({appointments.length})</span>
                    </button>
                  </div>
                </div>

                {pendingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200 space-y-1">
                    <p className="font-semibold text-gray-700">No pending appointment requests</p>
                    <p className="text-gray-400">All patient consultation requests for your profile are up to date.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-academic">
                      <thead>
                        <tr>
                          <th>Patient ID</th>
                          <th>Patient Name</th>
                          <th>Age / Gender</th>
                          <th>Phone</th>
                          <th>Requested Date & Time</th>
                          <th>Reason / Symptoms</th>
                          <th>Diagnosis</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAppointments.map((appt) => {
                          const diag = appt.diagnosis || 'Not yet analyzed';
                          return (
                            <tr key={appt.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="font-mono font-bold text-blue-700">PT-{appt.patient_id}</td>
                              <td className="font-semibold text-gray-900">{appt.patient_name || 'Patient'}</td>
                              <td>{appt.age ? `${appt.age} yrs` : 'N/A'} / {appt.gender || 'N/A'}</td>
                              <td>{appt.phone || 'N/A'}</td>
                              <td className="font-semibold text-blue-700 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{appt.appointment_date_formatted || appt.appointment_date}</span>
                                </div>
                              </td>
                              <td className="max-w-[200px] truncate" title={appt.notes || 'Clinical Consultation'}>
                                {appt.notes || 'Clinical Consultation'}
                              </td>
                              <td>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  diag === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                  : diag === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                  : diag === 'Not yet analyzed' ? 'bg-gray-100 text-gray-600 border-gray-200 font-normal'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {diag}
                                </span>
                              </td>
                              <td>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
                                  {appt.status}
                                </span>
                              </td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'CONFIRMED')}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold transition-colors shadow-xs"
                                    title="Confirm appointment request"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleDoctorCancelAppointment(appt.id)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition-colors"
                                    title="Decline appointment request"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => setCurrentTab('messages')}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Open clinical messaging"
                                  >
                                    <MessageSquare className="w-3 h-3 text-blue-600" />
                                    <span>Chat</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pending Queue Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Pending Scan Verification Queue</h3>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    {pendingScans.length} Scans Awaiting Verification
                  </span>
                </div>

                {pendingScans.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">No pending scans awaiting review. All scans are up-to-date!</div>
                ) : (
                  <table className="table-academic">
                    <thead>
                      <tr>
                        <th>Scan ID</th>
                        <th>AI Prediction</th>
                        <th>Confidence</th>
                        <th>Upload Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingScans.map((scan) => (
                        <tr key={scan.id}>
                          <td className="font-mono font-bold">#ND-{scan.id}</td>
                          <td className="font-bold text-blue-600">{scan.ai_report?.tumor_type}</td>
                          <td className="font-bold">{scan.ai_report?.confidence}%</td>
                          <td className="text-xs">{new Date(scan.upload_date).toLocaleDateString()}</td>
                          <td>
                            <button
                              onClick={() => handleOpenReview(scan)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm"
                            >
                              Review Scan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLINICAL QUEUE (APPOINTMENTS & SCANS) */}
          {currentTab === 'pending-scans' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Doctor Clinical Action Queue</h1>
                  <p className="text-xs text-gray-500">Review pending patient consultation requests and verified diagnostic MRI scan queue</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                    {pendingAppointments.length} Appointments Pending
                  </span>
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full border border-blue-300">
                    {pendingScans.length} Scans Pending
                  </span>
                </div>
              </div>

              {/* 1. Patient Appointment Requests Queue */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Patient Consultation & Appointment Requests</h3>
                      <p className="text-[11px] text-gray-500">Incoming patient appointment bookings awaiting doctor confirmation</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    pendingAppointments.length > 0 
                      ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold' 
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {pendingAppointments.length > 0 ? `${pendingAppointments.length} Requests Awaiting Review` : 'No Pending Requests'}
                  </span>
                </div>

                {pendingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200 space-y-1">
                    <p className="font-semibold text-gray-700">No pending appointment requests in queue</p>
                    <p className="text-gray-400">All patient consultation requests have been attended to.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-academic">
                      <thead>
                        <tr>
                          <th>Patient ID</th>
                          <th>Patient Name</th>
                          <th>Age / Gender</th>
                          <th>Phone</th>
                          <th>Requested Date & Time</th>
                          <th>Reason / Notes</th>
                          <th>Diagnosis</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAppointments.map((appt) => {
                          const diag = appt.diagnosis || 'Not yet analyzed';
                          return (
                            <tr key={appt.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="font-mono font-bold text-blue-700">PT-{appt.patient_id}</td>
                              <td className="font-semibold text-gray-900">{appt.patient_name || 'Patient'}</td>
                              <td>{appt.age ? `${appt.age} yrs` : 'N/A'} / {appt.gender || 'N/A'}</td>
                              <td>{appt.phone || 'N/A'}</td>
                              <td className="font-semibold text-blue-700 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{appt.appointment_date_formatted || appt.appointment_date}</span>
                                </div>
                              </td>
                              <td className="max-w-[200px] truncate" title={appt.notes || 'Clinical Consultation'}>
                                {appt.notes || 'Clinical Consultation'}
                              </td>
                              <td>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  diag === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                  : diag === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                  : diag === 'Not yet analyzed' ? 'bg-gray-100 text-gray-600 border-gray-200 font-normal'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {diag}
                                </span>
                              </td>
                              <td>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
                                  {appt.status}
                                </span>
                              </td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'CONFIRMED')}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold transition-colors shadow-xs"
                                    title="Confirm appointment request"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleDoctorCancelAppointment(appt.id)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition-colors"
                                    title="Decline appointment request"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => setCurrentTab('messages')}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Open clinical messaging"
                                  >
                                    <MessageSquare className="w-3 h-3 text-blue-600" />
                                    <span>Chat</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Pending MRI Scan Reviews Queue */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">MRI Scan Verification Queue</h3>
                      <p className="text-[11px] text-gray-500">Patient scans awaiting AI report signoff and clinical prescription</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {pendingScans.length} Scans Awaiting Verification
                  </span>
                </div>

                {pendingScans.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200 space-y-1">
                    <p className="font-semibold text-gray-700">No pending scan reviews in queue</p>
                    <p className="text-gray-400">All patient MRI scans for your profile have been verified.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-academic">
                      <thead>
                        <tr>
                          <th>PATIENT</th>
                          <th>MRI SCAN</th>
                          <th>AI PREDICTION</th>
                          <th>CONFIDENCE</th>
                          <th>STATUS</th>
                          <th className="text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingScans.map((scan) => {
                          const patObj = scan.patient || patients.find(p => p.id === scan.patient_id) || { id: scan.patient_id, name: `Patient #${scan.patient_id}`, age: 0, gender: 'N/A' };
                          const uploadDateFormatted = new Date(scan.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return (
                            <tr key={scan.id}>
                              <td className="space-y-0.5">
                                <div className="font-bold text-sm text-gray-900">{patObj.name}</div>
                                <div className="font-mono text-xs font-bold text-blue-700">PT-{patObj.id}</div>
                                <div className="text-xs text-gray-500 font-medium">{patObj.age} yrs • {patObj.gender}</div>
                              </td>
                              <td className="space-y-0.5">
                                <div className="font-medium text-xs text-gray-800 font-mono truncate max-w-xs">{scan.original_filename}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                  <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{uploadDateFormatted}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                  scan.ai_report?.tumor_type === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                  : scan.ai_report?.tumor_type === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {scan.ai_report?.tumor_type || 'Processing'}
                                </span>
                              </td>
                              <td className="font-bold text-xs">{scan.ai_report?.confidence ? `${scan.ai_report.confidence}%` : 'N/A'}</td>
                              <td>
                                <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                  {scan.status}
                                </span>
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => handleOpenReview(scan)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                                >
                                  Review Scan
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PATIENT HISTORY */}
          {currentTab === 'patient-history' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Patient Diagnostic History</h1>
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {filteredPatients.length === 0 ? 0 : (patientHistoryPage - 1) * 10 + 1}–{Math.min(patientHistoryPage * 10, filteredPatients.length)} of {filteredPatients.length} Authorized Patients ({allScans.length} Scans Total)
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search all authorized patients..."
                    value={searchPatientInput}
                    onChange={(e) => {
                      setSearchPatientInput(e.target.value);
                      setPatientHistoryPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredPatients.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-gray-200 rounded-lg text-gray-500 text-xs">
                    No authorized patients found matching search criteria.
                  </div>
                ) : (
                  filteredPatients.slice((patientHistoryPage - 1) * 10, patientHistoryPage * 10).map((patientItem) => {
                    const patientScans = allScans.filter(s => Number(s.patient_id) === Number(patientItem.id));
                    const isExpanded = !collapsedPatientIds.has(patientItem.id);
                    return (
                      <div key={patientItem.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm text-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">{patientItem.name}</h3>
                            <p className="text-gray-500">ID: PT-{patientItem.id} · {patientItem.age} yrs / {patientItem.gender} · {patientScans.length} Scans</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-gray-700">{patientItem.phone}</span>
                            <button
                              onClick={() => {
                                setCollapsedPatientIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(patientItem.id)) next.delete(patientItem.id);
                                  else next.add(patientItem.id);
                                  return next;
                                });
                              }}
                              className="p-1.5 rounded text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold flex items-center gap-1 text-xs"
                            >
                              <span>{isExpanded ? 'Collapse' : 'Expand Timeline'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-gray-600"><b>Address:</b> {patientItem.address || 'N/A'}</p>

                        {/* Diagnostic History List */}
                        {isExpanded && (
                          <div className="pt-2 space-y-2 border-t border-gray-100">
                            <p className="font-bold text-gray-800">Scan Diagnostic Timeline ({patientScans.length} MRI Scans):</p>
                            {patientScans.length === 0 ? (
                              <p className="text-gray-500 italic">No MRI scans uploaded yet for this patient.</p>
                            ) : (
                              <table className="table-academic">
                                <thead>
                                  <tr>
                                    <th>Patient Name</th>
                                    <th>Patient ID</th>
                                    <th>Scan Date</th>
                                    <th>Diagnosis</th>
                                    <th>Confidence</th>
                                    <th>Doctor</th>
                                    <th>Status</th>
                                    <th>PDF Report</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {patientScans.map((scan) => (
                                    <tr key={scan.id}>
                                      <td className="font-medium text-gray-900">{patientItem.name}</td>
                                      <td className="font-mono font-bold text-gray-700">PT-{patientItem.id}</td>
                                      <td className="text-xs">{new Date(scan.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                      <td className="font-bold text-blue-600">{scan.ai_report?.tumor_type || 'Processing'}</td>
                                      <td className="font-bold">{scan.ai_report?.confidence ? `${scan.ai_report.confidence}%` : 'N/A'}</td>
                                      <td className="text-xs font-medium text-gray-600">{scan.preferred_doctor?.name || 'Assigned Specialist'}</td>
                                      <td><span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-semibold">{scan.status}</span></td>
                                      <td>
                                        {scan.ai_report && (
                                          <button onClick={() => reportAPI.downloadPDF(scan.ai_report.id)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors">
                                            <Download className="w-3 h-3" /> PDF
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {filteredPatients.length > 10 && (
                <div className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded-lg text-xs">
                  <button
                    disabled={patientHistoryPage === 1}
                    onClick={() => setPatientHistoryPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-gray-600">
                    Page {patientHistoryPage} of {Math.ceil(filteredPatients.length / 10)}
                  </span>
                  <button
                    disabled={patientHistoryPage * 10 >= filteredPatients.length}
                    onClick={() => setPatientHistoryPage(p => p + 1)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REPORTS (GROUPED BY PATIENT) */}
          {currentTab === 'reports' && (() => {
            const groupedMap = new Map();
            allScans.forEach((scan) => {
              if (!scan) return;
              if (reportsDiagnosisFilter !== 'ALL' && scan.ai_report?.tumor_type !== reportsDiagnosisFilter) return;
              if (reportsStatusFilter !== 'ALL' && scan.status !== reportsStatusFilter) return;

              const pId = scan.patient_id;
              if (!groupedMap.has(pId)) {
                const patObj = scan.patient || patients.find(p => p.id === pId) || { id: pId, name: `Patient #${pId}`, age: 0, gender: 'N/A' };
                groupedMap.set(pId, { patient: patObj, scans: [] });
              }
              groupedMap.get(pId).scans.push(scan);
            });

            const groupedList = Array.from(groupedMap.values()).filter(({ patient }) => {
              if (!patient) return false;
              const search = (searchReportInput || '').toLowerCase().trim();
              if (!search) return true;
              const nameMatch = (patient.name || '').toLowerCase().includes(search);
              const idMatch = `pt-${patient.id}`.includes(search);
              const phoneMatch = (patient.phone || '').includes(search);
              return nameMatch || idMatch || phoneMatch;
            });

            groupedList.forEach(group => {
              group.scans.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
            });

            return (
              <div className="space-y-5">
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
                      <option value="AI_COMPLETED">AI Completed</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {groupedList.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-gray-200 rounded-xl text-gray-500 text-xs font-medium">
                      No patient reports available matching criteria.
                    </div>
                  ) : (
                    groupedList.map(({ patient, scans }) => {
                      const isExpanded = !expandedReportPatientIds.has(patient.id);
                      const latestScan = scans[0];
                      const lastScanDate = latestScan?.upload_date ? new Date(latestScan.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

                      return (
                        <div key={patient.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm hover:border-blue-300 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-gray-900">{patient.name}</h3>
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  PT-{patient.id}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 font-medium">
                                {patient.age} yrs · {patient.gender} · {scans.length} {scans.length === 1 ? 'Report' : 'Reports'}
                                {lastScanDate && ` · Last Scan: ${lastScanDate}`}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setExpandedReportPatientIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(patient.id)) next.delete(patient.id);
                                  else next.add(patient.id);
                                  return next;
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors self-start sm:self-center"
                            >
                              <span>{isExpanded ? 'Hide History' : 'View History'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="pt-2">
                              <table className="table-academic text-xs">
                                <thead>
                                  <tr>
                                    <th>Scan Date</th>
                                    <th>Diagnosis</th>
                                    <th>Confidence</th>
                                    <th>Status</th>
                                    <th>Attending Doctor</th>
                                    <th>Report Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scans.map((scan) => (
                                    <tr key={scan.id}>
                                      <td className="font-semibold text-gray-900">
                                        {new Date(scan.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </td>
                                      <td>
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                          scan.ai_report?.tumor_type === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                          : scan.ai_report?.tumor_type === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                          {scan.ai_report?.tumor_type || 'Processing'}
                                        </span>
                                      </td>
                                      <td className="font-bold">{scan.ai_report?.confidence ? `${scan.ai_report.confidence}%` : 'N/A'}</td>
                                      <td>
                                        <span className={`px-2 py-0.5 rounded text-xs border font-semibold ${
                                          scan.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                          {scan.status}
                                        </span>
                                      </td>
                                      <td className="text-gray-600 font-medium">{scan.preferred_doctor?.name || 'Specialist'}</td>
                                      <td>
                                        {scan.ai_report && (
                                          <button
                                            onClick={() => reportAPI.downloadPDF(scan.ai_report.id)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                                          >
                                            <Download className="w-3 h-3" /> View PDF
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 6: PATIENT ROSTER & APPOINTMENTS */}
          {currentTab === 'patients' && (() => {
            const filteredAppointments = appointments.filter(a => {
              if (apptStatusFilter !== 'ALL' && a.status !== apptStatusFilter) return false;
              if (searchApptInput.trim()) {
                const q = searchApptInput.toLowerCase().trim();
                const nameMatch = (a.patient_name || '').toLowerCase().includes(q);
                const phoneMatch = (a.phone || '').includes(q);
                const idMatch = `pt-${a.patient_id}`.toLowerCase().includes(q);
                const notesMatch = (a.notes || '').toLowerCase().includes(q);
                return nameMatch || phoneMatch || idMatch || notesMatch;
              }
              return true;
            });

            return (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Patient Roster & Scheduled Appointments</h1>
                    <p className="text-xs text-gray-500">Manage incoming consultation requests, confirmed visits, and patient history</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      {activePatientsCount} Active Patients
                    </span>
                    {pendingAppointments.length > 0 && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                        {pendingAppointments.length} Pending Approval
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm text-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search patient name, phone, notes, or PT-ID..."
                      value={searchApptInput}
                      onChange={(e) => setSearchApptInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'ALL', label: 'All', count: appointments.length },
                      { id: 'SCHEDULED', label: 'Pending Requests', count: pendingAppointments.length },
                      { id: 'CONFIRMED', label: 'Confirmed', count: appointments.filter(a => a.status === 'CONFIRMED').length },
                      { id: 'COMPLETED', label: 'Completed', count: appointments.filter(a => a.status === 'COMPLETED').length },
                      { id: 'CANCELLED', label: 'Cancelled', count: appointments.filter(a => a.status === 'CANCELLED').length },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setApptStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          apptStatusFilter === tab.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          apptStatusFilter === tab.id ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  {filteredAppointments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs font-medium">
                      No appointments matching selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table-academic">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Patient Name</th>
                            <th>Age / Gender</th>
                            <th>Phone Number</th>
                            <th>Appointment Date & Time</th>
                            <th>Reason / Notes</th>
                            <th>Diagnosis Classification</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAppointments.map((appt) => {
                        const diag = appt.diagnosis || 'Not yet analyzed';
                        return (
                          <tr key={appt.id}>
                            <td className="font-mono font-bold">PT-{appt.patient_id}</td>
                            <td className="font-medium text-gray-900">{appt.patient_name || 'Patient'}</td>
                            <td>{appt.age ? `${appt.age} yrs` : 'N/A'} / {appt.gender || 'N/A'}</td>
                            <td>{appt.phone || 'N/A'}</td>
                            <td className="font-semibold text-blue-700">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{appt.appointment_date_formatted || appt.appointment_date}</span>
                              </div>
                            </td>
                            <td className="max-w-[180px] truncate" title={appt.notes || 'Clinical Consultation'}>
                              {appt.notes || 'Clinical Consultation'}
                            </td>
                            <td>
                              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                diag === 'No Tumor' ? 'bg-green-50 text-green-700 border-green-200'
                                : diag === 'Glioma' ? 'bg-red-50 text-red-700 border-red-200'
                                : diag === 'Not yet analyzed' ? 'bg-gray-100 text-gray-600 border-gray-200 font-normal'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {diag}
                              </span>
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-xs border font-bold ${
                                appt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200'
                                : appt.status === 'COMPLETED' ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                {appt.status === 'SCHEDULED' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'CONFIRMED')}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                                    title="Confirm this appointment"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {appt.status === 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'COMPLETED')}
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                                    title="Mark consultation as completed"
                                  >
                                    Complete
                                  </button>
                                )}
                                {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => handleDoctorCancelAppointment(appt.id)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition-colors"
                                    title="Cancel appointment"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={() => setCurrentTab('messages')}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  title="Message patient"
                                >
                                  <MessageSquare className="w-3 h-3 text-blue-600" />
                                  <span>Chat</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

          {/* TAB 8: MESSAGES */}
          {currentTab === 'messages' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900 font-sans">Patient Clinical Messaging</h1>
              <ClinicalChat userRole="DOCTOR" />
            </div>
          )}

          {/* TAB 9: CONTACT ADMIN */}
          {currentTab === 'contact-admin' && (
            <div className="space-y-6 max-w-4xl font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900">Administrator Helpdesk & Support</h1>
                  <p className="text-xs text-gray-500">Direct communication portal with NeuroDetect Platform Administrator</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Admin Support Desk</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* Left: Compose Inquiry Form */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-sm text-gray-900">Send Message to Admin</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">New Message</span>
                  </div>

                  <form onSubmit={handleSendAdminMessage} className="space-y-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Inquiry Subject / Topic</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Request for Hospital Credential Update or System Inquiry..."
                        value={adminMessageForm.subject}
                        onChange={(e) => setAdminMessageForm({ ...adminMessageForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Message Details</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Describe your request or technical inquiry in detail..."
                        value={adminMessageForm.message}
                        onChange={(e) => setAdminMessageForm({ ...adminMessageForm, message: e.target.value })}
                        className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Message to Administrator</span>
                    </button>
                  </form>
                </div>

                {/* Right: Submitted Messages & Admin Replies List */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-sm text-gray-900">Your Submitted Admin Inquiries</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {myAdminMessages.length} Total
                    </span>
                  </div>

                  {myAdminMessages.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 space-y-1">
                      <Mail className="w-8 h-8 mx-auto text-gray-300 stroke-[1.5]" />
                      <p className="font-semibold">No inquiries submitted yet.</p>
                      <p className="text-[11px]">Use the form on the left to send a message to the administrator.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {myAdminMessages.map((msg) => (
                        <div key={msg.id} className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-gray-900 text-xs">{msg.subject}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                              msg.status === 'REPLIED' ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {msg.status === 'REPLIED' ? 'Replied by Admin' : 'Pending Response'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-[11px] leading-relaxed">{msg.message}</p>
                          <span className="text-[10px] text-gray-400 block">{new Date(msg.created_at).toLocaleString()}</span>

                          {/* Admin Reply Card */}
                          {msg.reply_text && (
                            <div className="p-2.5 bg-green-50/80 border border-green-200 rounded-lg space-y-1 mt-2 text-[11px]">
                              <div className="flex items-center gap-1.5 text-green-800 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                <span>Administrator Response ({msg.replied_by_name || 'Admin'}):</span>
                              </div>
                              <p className="text-green-900 font-medium leading-relaxed pl-5">{msg.reply_text}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: DOCTOR PROFILE */}
          {currentTab === 'profile' && (
            <div className="space-y-5">
              <UserProfileCard />
            </div>
          )}

        </main>
      </div>

      {/* REVIEW MODAL */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-base text-gray-900">Clinical Verification & Review</h3>
              <button onClick={() => setSelectedScan(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-gray-500">Patient:</p>
                <p className="font-bold text-gray-900">{selectedScan.patient?.name || (patients.find(p => p.id === selectedScan.patient_id)?.name) || `Patient #${selectedScan.patient_id}`}</p>
                <p className="font-mono text-xs font-bold text-blue-700">PT-{selectedScan.patient_id}</p>
                <p className="text-xs text-gray-500 font-medium">{selectedScan.patient?.age || (patients.find(p => p.id === selectedScan.patient_id)?.age) || 'N/A'} yrs • {selectedScan.patient?.gender || (patients.find(p => p.id === selectedScan.patient_id)?.gender) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">AI Classification & File:</p>
                <p className="font-bold text-blue-600 text-sm">{selectedScan.ai_report?.tumor_type}</p>
                <p className="font-bold text-gray-700">Confidence: {selectedScan.ai_report?.confidence}%</p>
                <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={selectedScan.original_filename}>{selectedScan.original_filename}</p>
              </div>
            </div>

            {/* Visual Explainability: Original Axial MRI vs Grad-CAM Saliency Heatmap */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-blue-600" />
                  <span>Explainable AI (Grad-CAM Saliency Localization)</span>
                </span>
                <span className="text-[10px] text-gray-500 font-mono">DenseNet-121 Attention</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white p-2 border border-gray-200 rounded-lg space-y-1 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-600">Original Axial Brain MRI</p>
                  <img
                    src={selectedScan.file_path}
                    alt="Axial Brain MRI Scan"
                    className="w-full h-36 object-contain rounded bg-slate-900 mx-auto"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="bg-white p-2 border border-gray-200 rounded-lg space-y-1 shadow-sm">
                  <p className="text-[10px] font-bold text-blue-700">Grad-CAM Spatial Heatmap</p>
                  {selectedScan.ai_report?.heatmap_path ? (
                    <img
                      src={selectedScan.ai_report.heatmap_path}
                      alt="DenseNet121 Grad-CAM Heatmap"
                      className="w-full h-36 object-contain rounded bg-slate-900 mx-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-gray-400 bg-gray-100 rounded text-[11px]">
                      Heatmap unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Diagnosis</label>
                <input type="text" required value={reviewForm.diagnosis} onChange={(e) => setReviewForm({ ...reviewForm, diagnosis: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Notes</label>
                <textarea rows={2} value={reviewForm.clinical_notes} onChange={(e) => setReviewForm({ ...reviewForm, clinical_notes: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Prescription Guidelines</label>
                <textarea rows={2} value={reviewForm.prescription} onChange={(e) => setReviewForm({ ...reviewForm, prescription: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Suggested Follow-Up Tests</label>
                  <input type="text" value={reviewForm.suggested_tests} onChange={(e) => setReviewForm({ ...reviewForm, suggested_tests: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Recommended Medicines</label>
                  <input type="text" value={reviewForm.medicines} onChange={(e) => setReviewForm({ ...reviewForm, medicines: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSelectedScan(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm">Submit Clinical Verification & Issue Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DoctorDashboard;
