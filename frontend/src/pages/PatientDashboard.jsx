// NeuroDetect Clinical AI - Patient Dashboard Component
// Handles patient MRI uploads, PDF report downloads, Doctor Selection by Location, Diet Plans, Videos, FAQs, and Contact Support

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Toast from '../components/common/Toast';
import MriUploadBox from '../components/patient/MriUploadBox';
import PatientScansTable from '../components/patient/PatientScansTable';
import {
  UploadCloud, FileText, CheckCircle2, Clock, Brain, Stethoscope, Utensils,
  Video as VideoIcon, HelpCircle, Phone, Info, User, Download, Mail, Play, MapPin, Search, Calendar, X, MessageSquare
} from 'lucide-react';
import { analyticsAPI, scanAPI, reportAPI, contentAPI, doctorAPI, appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ClinicalChat from '../components/chat/ClinicalChat';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import UserProfileCard from '../components/common/UserProfileCard';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [statsData, setStatsData] = useState(null);
  const [patientScansList, setPatientScansList] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [toastNotification, setToastNotification] = useState(null);

  // Content Collections
  const [dietPlansList, setDietPlansList] = useState([]);
  const [educationalVideosList, setEducationalVideosList] = useState([]);
  const [faqDirectoryList, setFaqDirectoryList] = useState([]);
  const [publicDoctorsList, setPublicDoctorsList] = useState([]);
  const [availableLocationsList, setAvailableLocationsList] = useState([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');
  const [selectedActiveVideo, setSelectedActiveVideo] = useState(null);
  const [faqSearchInput, setFaqSearchInput] = useState('');

  // Appointment Booking State
  const [myAppointments, setMyAppointments] = useState([]);
  const [bookingModalDoc, setBookingModalDoc] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:30',
    notes: 'Clinical Consultation & MRI Scan Evaluation'
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Contact Support Form State
  const [contactFormState, setContactFormState] = useState({
    sender_name: user?.patient_profile?.name || '',
    sender_email: user?.email || '',
    subject: '',
    message: ''
  });
  const [myMessages, setMyMessages] = useState([]);
  const [sendingContact, setSendingContact] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadMyMessages();
    loadMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedCityFilter !== 'All') {
      doctorAPI.getPublicDoctors(selectedCityFilter)
        .then(res => setPublicDoctorsList(res.data || []))
        .catch(err => console.error("Error fetching doctors by city:", err));
    }
  }, [selectedCityFilter]);

  const loadDashboardData = async () => {
    setLoadingStatus(true);
    try {
      const statsResponse = await analyticsAPI.getDashboardStats();
      setStatsData(statsResponse.data);

      const scansResponse = await scanAPI.getPatientScans();
      setPatientScansList(scansResponse.data);

      // Pre-fetch Content & Public Doctors by Location
      const [dietRes, videoRes, faqRes, docRes, locRes] = await Promise.all([
        contentAPI.getDiets(),
        contentAPI.getVideos(),
        contentAPI.getFAQs(),
        doctorAPI.getPublicDoctors('All'),
        doctorAPI.getLocations()
      ]);

      setDietPlansList(dietRes.data || []);
      setEducationalVideosList(videoRes.data || []);
      setFaqDirectoryList(faqRes.data || []);
      setPublicDoctorsList(docRes.data || []);
      setAvailableLocationsList(locRes.data?.locations || []);
    } catch (err) {
      console.error("Patient dashboard fetch error:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadMyMessages = async () => {
    try {
      const res = await contentAPI.getMyMessages();
      setMyMessages(res.data || []);
    } catch (err) {
      // silently ignore if not logged in yet
    }
  };

  const loadMyAppointments = async () => {
    try {
      const res = await appointmentAPI.getMyAppointments();
      setMyAppointments(res.data || []);
    } catch (err) {
      console.error("Fetch appointments error:", err);
    }
  };

  const handleConfirmAppointment = async (e) => {
    e.preventDefault();
    if (!bookingModalDoc || !bookingForm.date || !bookingForm.time) return;

    setBookingSubmitting(true);
    try {
      const dateTimeStr = `${bookingForm.date}T${bookingForm.time}:00`;
      await appointmentAPI.bookAppointment({
        doctor_id: bookingModalDoc.id,
        appointment_date: dateTimeStr,
        notes: bookingForm.notes || 'Clinical Consultation'
      });

      setToastNotification({
        message: `Appointment successfully booked with ${bookingModalDoc.name}!`,
        type: 'success'
      });
      setBookingModalDoc(null);
      await loadMyAppointments();
      setCurrentTab('appointments');
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to book appointment. Please try again.";
      setToastNotification({ message: detail, type: 'error' });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled appointment?")) return;
    try {
      await appointmentAPI.cancelAppointment(apptId);
      setToastNotification({ message: "Appointment cancelled successfully.", type: "info" });
      await loadMyAppointments();
    } catch (err) {
      setToastNotification({ message: "Failed to cancel appointment.", type: "error" });
    }
  };

  const handleContactFormSubmit = async (e) => {
    e.preventDefault();
    setSendingContact(true);
    try {
      await contentAPI.sendContactMessage({
        ...contactFormState,
        patient_user_id: user?.id || null
      });
      setToastNotification({ message: "Message sent! You'll see the admin reply here once received.", type: "success" });
      setContactFormState({ sender_name: user?.patient_profile?.name || '', sender_email: user?.email || '', subject: '', message: '' });
      await loadMyMessages();
    } catch (err) {
      setToastNotification({ message: "Failed to send message.", type: "error" });
    } finally {
      setSendingContact(false);
    }
  };

  const filteredFaqs = faqDirectoryList.filter(f =>
    f.question.toLowerCase().includes(faqSearchInput.toLowerCase()) ||
    f.answer.toLowerCase().includes(faqSearchInput.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 min-w-0 space-y-5">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {currentTab === 'dashboard' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Patient Diagnostic Portal</h1>
                  <p className="text-xs text-gray-500">Welcome, {user?.patient_profile?.name || 'Patient'}</p>
                </div>
                <button
                  onClick={() => setCurrentTab('upload')}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload MRI Scan</span>
                </button>
              </div>

              {/* Top Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Total Scans</span>
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.total_scans || patientScansList.length}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Pending Reviews</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.pending_reports || 0}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Completed Reports</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.completed_reports || patientScansList.length}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Latest AI Diagnosis</span>
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-base font-bold text-blue-600 truncate">{statsData?.latest_diagnosis || 'Glioma'}</p>
                </div>
              </div>

              {/* Patient Recent Scans Table */}
              <PatientScansTable scanRecordsList={patientScansList} />
            </div>
          )}

          {/* TAB 2: UPLOAD MRI */}
          {currentTab === 'upload' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Upload MRI Brain Scan</h1>
                <p className="text-xs text-gray-500">Upload axial brain MRI, select attending doctor by location, and generate AI report</p>
              </div>

              <MriUploadBox
                onScanComplete={loadDashboardData}
                setToastMessage={setToastNotification}
              />
            </div>
          )}

          {/* TAB 3: REPORTS HISTORY */}
          {currentTab === 'reports' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">Diagnostic Reports History</h1>
              <PatientScansTable scanRecordsList={patientScansList} />
            </div>
          )}

          {/* TAB 4: DOCTOR RECOMMENDATION & LOCATION FINDER */}
          {currentTab === 'recommendation' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Doctor Recommendations & Location Finder</h1>
                  <p className="text-xs text-gray-500">Select neurologists and clinical specialists based on hospital location</p>
                </div>

                {/* City Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className="p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
                  >
                    <option value="All">All Cities & Locations ({publicDoctorsList.length} Doctors)</option>
                    {availableLocationsList.map((loc) => (
                      <option key={loc.city} value={loc.city}>
                        {loc.location || `${loc.city}, India`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctors Location Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicDoctorsList.map((docItem) => (
                  <div key={docItem.id} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 shadow-sm text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                          {docItem.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{docItem.name}</h4>
                          <p className="text-blue-600 font-semibold">{docItem.specialization}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                        {docItem.experience_years} Yrs Exp
                      </span>
                    </div>

                    <div className="space-y-1 text-gray-600 pt-1 border-t border-gray-100">
                      <p><b>Hospital:</b> {docItem.hospital}</p>
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span><b>Location:</b> {docItem.location}</span>
                      </p>
                      <p><b>Medical Reg:</b> {docItem.medical_reg_no}</p>
                    </div>

                    <div className="pt-2 flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => {
                          setBookingModalDoc(docItem);
                          setBookingForm({
                            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                            time: '10:30',
                            notes: 'Clinical Consultation & MRI Evaluation'
                          });
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Book Appointment
                      </button>
                      <button
                        onClick={() => {
                          setCurrentTab('upload');
                          setToastNotification({ message: `Selected ${docItem.name} for MRI scan review!`, type: "info" });
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Stethoscope className="w-3.5 h-3.5" /> Select for Upload Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Verified Doctor Recommendations for Scans */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <h3 className="font-bold text-sm text-gray-900">Your Verified Clinical Reviews</h3>
                
                {patientScansList.filter(s => s.ai_report?.doctor_review).length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500 text-xs shadow-sm">
                    No clinical reviews completed yet. Select your preferred neurologist by location when uploading your MRI scan.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientScansList.filter(s => s.ai_report?.doctor_review).map((scanItem) => {
                      const review = scanItem.ai_report.doctor_review;
                      return (
                        <div key={scanItem.id} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 shadow-sm text-xs">
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-blue-600" />
                              <span className="font-bold text-sm text-gray-900">
                                Dr. {review.doctor?.name || 'Rajesh Kumar'} ({review.doctor?.specialization || 'Senior Neuro-Oncologist'})
                              </span>
                            </div>
                            <span className="text-gray-500">Reviewed: {new Date(review.reviewed_at).toLocaleDateString()}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                              <p className="font-bold text-gray-900">Clinical Diagnosis:</p>
                              <p className="text-gray-700">{review.diagnosis}</p>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                              <p className="font-bold text-gray-900">Clinical Notes:</p>
                              <p className="text-gray-700">{review.clinical_notes || 'None'}</p>
                            </div>

                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                              <p className="font-bold text-green-800">Prescription & Medicines:</p>
                              <p className="text-gray-700">{review.prescription} ({review.medicines || 'As prescribed'})</p>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                              <p className="font-bold text-blue-800">Suggested Tests & Follow-up:</p>
                              <p className="text-gray-700">{review.suggested_tests} • Next Visit: <b>{review.next_visit_date}</b></p>
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end gap-2">
                            <button
                              onClick={() => setCurrentTab('messages')}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Message Doctor
                            </button>
                            <button
                              onClick={() => reportAPI.downloadPDF(scanItem.ai_report.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Download Verified PDF Report
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DIET */}
          {currentTab === 'diet' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">Tumor Specific Diet & Nutrition</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dietPlansList.map((dietItem) => (
                  <div key={dietItem.id} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 shadow-sm text-xs">
                    <h3 className="font-bold text-sm text-blue-600 border-b border-gray-200 pb-2">{dietItem.tumor_type} Plan</h3>
                    <div>
                      <p className="font-bold text-green-700 mb-0.5">Foods to Eat:</p>
                      <p className="text-gray-600 whitespace-pre-line leading-relaxed">{dietItem.foods_to_eat}</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-700 mb-0.5">Foods to Avoid:</p>
                      <p className="text-gray-600 whitespace-pre-line leading-relaxed">{dietItem.foods_to_avoid}</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-700 mb-0.5">Water Intake & Lifestyle:</p>
                      <p className="text-gray-600 leading-relaxed">{dietItem.water_intake} • {dietItem.lifestyle_tips}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: EDUCATIONAL VIDEOS */}
          {currentTab === 'videos' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">Educational Video Resources</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {educationalVideosList.map((videoItem) => (
                  <div key={videoItem.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden space-y-2 shadow-sm">
                    <div className="relative">
                      <img src={videoItem.thumbnail_url} alt={videoItem.title} className="w-full h-40 object-cover" />
                      <button
                        onClick={() => setSelectedActiveVideo(videoItem)}
                        className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                      >
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-1 text-xs">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                        {videoItem.category}
                      </span>
                      <h4 className="font-bold text-gray-900 leading-snug">{videoItem.title}</h4>
                      <p className="text-gray-500 line-clamp-2">{videoItem.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedActiveVideo && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="bg-white p-5 rounded-lg max-w-2xl w-full space-y-3 text-xs border border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 text-sm">{selectedActiveVideo.title}</h3>
                      <button onClick={() => setSelectedActiveVideo(null)} className="font-bold text-gray-400 hover:text-gray-900">✕</button>
                    </div>
                    <div className="aspect-video w-full">
                      <iframe
                        src={selectedActiveVideo.video_url}
                        title={selectedActiveVideo.title}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

         
          {/* TAB: CONTACT SUPPORT */}
          {currentTab === 'contact' && (
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-xl font-bold text-gray-900">Contact Hospital Department</h1>

              {/* Message history */}
              {myMessages.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-gray-700">Your Message History</h2>
                  {myMessages.map((msg) => (
                    <div key={msg.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-xs">
                      {/* Patient's original message */}
                      <div className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{msg.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            msg.status === 'REPLIED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : msg.status === 'READ'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>{msg.status}</span>
                        </div>
                        <p className="text-gray-500 text-[11px]">{new Date(msg.created_at).toLocaleString()}</p>
                        <p className="text-gray-700 leading-relaxed mt-1">{msg.message}</p>
                      </div>

                      {/* Admin reply */}
                      {msg.reply_text ? (
                        <div className="bg-blue-50 border-t border-blue-100 p-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">A</div>
                            <span className="font-bold text-blue-800 text-[11px]">{msg.replied_by_name || 'NeuroDetect Admin'}</span>
                            <span className="text-blue-400 text-[10px]">{msg.replied_at ? new Date(msg.replied_at).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-blue-900 leading-relaxed pl-8">{msg.reply_text}</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-t border-gray-100 p-3">
                          <p className="text-gray-400 text-[11px] italic">⏳ Awaiting reply from support desk...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New message form */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm text-xs">
                <h2 className="text-sm font-bold text-gray-900">Send a New Message</h2>
                <form onSubmit={handleContactFormSubmit} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={contactFormState.subject}
                      onChange={(e) => setContactFormState({ ...contactFormState, subject: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      placeholder="e.g. Appointment Inquiry"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={contactFormState.message}
                      onChange={(e) => setContactFormState({ ...contactFormState, message: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      placeholder="Type your message to the support desk..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingContact}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors shadow-sm text-xs"
                  >
                    {sendingContact ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          )}

         

          {/* TAB: APPOINTMENTS */}
          {currentTab === 'appointments' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Scheduled Clinical Appointments</h1>
                  <p className="text-xs text-gray-500">Track and manage your upcoming consultations with neurologists</p>
                </div>
                <button
                  onClick={() => setCurrentTab('recommendation')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Calendar className="w-4 h-4" /> Book New Appointment
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                {myAppointments.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-500 font-medium">No appointments scheduled yet.</p>
                    <button
                      onClick={() => setCurrentTab('recommendation')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs"
                    >
                      Browse Doctors Directory & Book
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAppointments.map((appt) => (
                      <div key={appt.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">{appt.doctor_name}</h4>
                            <p className="text-blue-600 font-semibold">{appt.specialization}</p>
                          </div>
                          <StatusBadge status={appt.status} />
                        </div>

                        <div className="space-y-1 text-gray-700">
                          <p className="flex items-center gap-1.5 font-bold text-gray-900">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>{appt.appointment_date_formatted}</span>
                          </p>
                          <p><b>Hospital:</b> {appt.hospital} ({appt.city})</p>
                          <p><b>Reason / Notes:</b> {appt.notes || 'Clinical consultation'}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-gray-200">
                          <button
                            onClick={() => setCurrentTab('messages')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message Doctor
                          </button>

                          {appt.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleCancelAppointment(appt.id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-semibold text-xs transition-colors"
                            >
                              Cancel Appointment
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MESSAGES */}
          {currentTab === 'messages' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900 font-sans">Doctor Consultation Messaging</h1>
              <ClinicalChat userRole="PATIENT" />
            </div>
          )}

          {/* TAB 10: PATIENT PROFILE */}
          {currentTab === 'profile' && (
            <div className="space-y-5">
              <UserProfileCard />
            </div>
          )}

        </main>
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {bookingModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs border border-gray-200">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center text-sm">
                  {bookingModalDoc.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{bookingModalDoc.name}</h3>
                  <p className="text-blue-600 font-semibold">{bookingModalDoc.specialization}</p>
                </div>
              </div>
              <button
                onClick={() => setBookingModalDoc(null)}
                className="text-gray-400 hover:text-gray-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-1 text-blue-900">
              <p><b>Hospital:</b> {bookingModalDoc.hospital}</p>
              <p><b>Location:</b> {bookingModalDoc.location}</p>
              <p><b>Experience:</b> {bookingModalDoc.experience_years} Years</p>
            </div>

            <form onSubmit={handleConfirmAppointment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Preferred Time Slot</label>
                  <select
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs focus:ring-2 focus:ring-green-600 focus:outline-none"
                  >
                    <option value="09:30">09:30 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:45">11:45 AM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:30">03:30 PM</option>
                    <option value="17:00">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Symptoms / Consultation Notes</label>
                <textarea
                  rows={3}
                  required
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-600 focus:outline-none"
                  placeholder="Describe your symptoms or reason for clinical visit..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingModalDoc(null)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  {bookingSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastNotification && <Toast message={toastNotification.message} type={toastNotification.type} onClose={() => setToastNotification(null)} />}
    </div>
  );
};

export default PatientDashboard;
