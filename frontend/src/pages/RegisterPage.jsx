import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Stethoscope, ArrowLeft, CheckCircle2, Key, X, Mail, Eye, EyeOff } from 'lucide-react';
import { authAPI, doctorAPI } from '../services/api';
import Toast from '../components/common/Toast';
import Logo from '../components/common/Logo';

const RegisterPage = () => {
  const [activeRole, setActiveRole] = useState('PATIENT');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Password visibility states
  const [showPatientPassword, setShowPatientPassword] = useState(false);
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);

  // Registration OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registerOtp, setRegisterOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingTargetEmail, setPendingTargetEmail] = useState('');

  const [patientForm, setPatientForm] = useState({
    name: '', email: '', password: '', age: 30, gender: 'Male', phone: '', address: ''
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '', email: '', password: '', specialization: 'Neuro-Oncology', hospital: '', city: 'New Delhi', location: 'New Delhi, Delhi (NCT)', medical_reg_no: '', experience_years: 5
  });
  const [certificateFile, setCertificateFile] = useState(null);

  // Autocomplete Suggestions State
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [hospitalSuggestions, setHospitalSuggestions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showHospDropdown, setShowHospDropdown] = useState(false);
  const [showLocDropdown, setShowLocDropdown] = useState(false);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (activeRole === 'DOCTOR' && (hospitalQuery || locationQuery)) {
      const timer = setTimeout(async () => {
        try {
          const queryParam = hospitalQuery || locationQuery;
          const res = await doctorAPI.getSuggestions(queryParam);
          if (res.data) {
            setHospitalSuggestions(res.data.hospitals || []);
            setLocationSuggestions(res.data.locations || []);
          }
        } catch (err) {
          console.error("Autocomplete suggestion fetch error:", err);
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [hospitalQuery, locationQuery, activeRole]);

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (!patientForm.email) {
      setToast({ message: "Please enter your email address.", type: "error" });
      return;
    }
    handleRequestOtp(patientForm.email, 'PATIENT');
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!doctorForm.email) {
      setToast({ message: "Please enter your email address.", type: "error" });
      return;
    }
    handleRequestOtp(doctorForm.email, 'DOCTOR');
  };

  const handleRequestOtp = async (targetEmail, role) => {
    if (!targetEmail) {
      setToast({ message: "Please enter your email address first.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendRegisterOtp(targetEmail, role);
      const msg = res.data?.message || 'Registration OTP code dispatched to your email address!';
      setToast({ message: msg, type: 'success' });
      setRegisterOtp(res.data?.otp_hint || '');
      setPendingTargetEmail(targetEmail);
      setShowOtpModal(true);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Registration OTP request failed.";
      setToast({ message: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeRegistration = async (e) => {
    e.preventDefault();
    if (!registerOtp) return;
    setOtpLoading(true);
    try {
      if (activeRole === 'PATIENT') {
        await authAPI.registerPatient({
          ...patientForm,
          otp_code: registerOtp
        });
        setToast({ message: "Email verified & Patient account created successfully! Please login.", type: "success" });
      } else {
        const formData = new FormData();
        Object.keys(doctorForm).forEach(key => formData.append(key, doctorForm[key]));
        formData.append('otp_code', registerOtp);
        if (certificateFile) {
          formData.append('certificate', certificateFile);
        }
        const res = await authAPI.registerDoctor(formData);
        setToast({ message: res.data.message || "Email verified & Doctor application submitted!", type: "success" });
      }
      setShowOtpModal(false);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "OTP Verification failed.", type: "error" });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col justify-between p-4 font-sans">
      
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-2xl w-full mx-auto my-8 bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-5">
        
        <div className="text-center space-y-2">
          <Logo size="large" className="justify-center mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Registration Portal</h2>
          <p className="text-xs text-gray-500">Register as a Patient or Doctor (India-Wide Coverage)</p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveRole('PATIENT')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-colors ${
              activeRole === 'PATIENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient Registration</span>
          </button>
          <button
            onClick={() => setActiveRole('DOCTOR')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-colors ${
              activeRole === 'DOCTOR' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Registration</span>
          </button>
        </div>

        {activeRole === 'PATIENT' && (
          <form onSubmit={handlePatientSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input type="text" required value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} placeholder="John Doe" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold">Email Address *</label>
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(patientForm.email, 'PATIENT')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Verify via OTP
                  </button>
                </div>
                <input type="email" required value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} placeholder="john@example.com" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPatientPassword ? "text" : "password"}
                    required
                    value={patientForm.password}
                    onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPatientPassword(!showPatientPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex="-1"
                    aria-label={showPatientPassword ? "Hide password" : "Show password"}
                  >
                    {showPatientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Age *</label>
                <input type="number" required value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: parseInt(e.target.value) })} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Gender *</label>
                <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Address / Location (India)</label>
              <textarea rows={2} value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} placeholder="City, State, Pin Code (e.g. Kolkata, West Bengal)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              {loading ? 'Processing...' : 'Register Patient Account'}
            </button>
          </form>
        )}

        {activeRole === 'DOCTOR' && (
          <form onSubmit={handleDoctorSubmit} className="space-y-3 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Doctor accounts with valid medical credentials are <b>Auto-Verified</b> for immediate access across India.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Doctor Name (Dr.) *</label>
                <input type="text" required value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} placeholder="Dr. Sarah Connor" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold">Email Address *</label>
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(doctorForm.email, 'DOCTOR')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Verify via OTP
                  </button>
                </div>
                <input type="email" required value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} placeholder="dr.connor@hospital.org" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showDoctorPassword ? "text" : "password"}
                    required
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDoctorPassword(!showDoctorPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex="-1"
                    aria-label={showDoctorPassword ? "Hide password" : "Show password"}
                  >
                    {showDoctorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Specialization *</label>
                <input type="text" required value={doctorForm.specialization} onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} placeholder="Neuro-Oncology" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              {/* Hospital Field with Autocomplete */}
              <div className="relative">
                <label className="block font-semibold mb-1">Hospital / Medical Center *</label>
                <input
                  type="text"
                  required
                  value={doctorForm.hospital}
                  onChange={(e) => {
                    setDoctorForm({ ...doctorForm, hospital: e.target.value });
                    setHospitalQuery(e.target.value);
                    setShowHospDropdown(true);
                  }}
                  onFocus={() => setShowHospDropdown(true)}
                  placeholder="Type Hospital (e.g. Apollo Hospital)"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                />
                {showHospDropdown && hospitalSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {hospitalSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDoctorForm({
                            ...doctorForm,
                            hospital: item.hospital,
                            city: item.city || doctorForm.city,
                            location: item.location || doctorForm.location
                          });
                          setShowHospDropdown(false);
                        }}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-xs"
                      >
                        <p className="font-bold text-gray-900">{item.hospital}</p>
                        <p className="text-[10px] text-gray-500">{item.location}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Autocomplete (City, State) */}
              <div className="relative">
                <label className="block font-semibold mb-1">City / Location (India) *</label>
                <input
                  type="text"
                  required
                  value={doctorForm.city}
                  onChange={(e) => {
                    setDoctorForm({ ...doctorForm, city: e.target.value, location: `${e.target.value}, India` });
                    setLocationQuery(e.target.value);
                    setShowLocDropdown(true);
                  }}
                  onFocus={() => setShowLocDropdown(true)}
                  placeholder="Type City (e.g. Kolkata, Bhubaneswar)"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                />
                {showLocDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {locationSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDoctorForm({
                            ...doctorForm,
                            city: item.city,
                            location: item.location
                          });
                          setShowLocDropdown(false);
                        }}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-xs"
                      >
                        <p className="font-bold text-gray-900">{item.city}</p>
                        <p className="text-[10px] text-gray-500">{item.state}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Medical Reg No *</label>
                <input type="text" required value={doctorForm.medical_reg_no} onChange={(e) => setDoctorForm({ ...doctorForm, medical_reg_no: e.target.value })} placeholder="MED-REG-88392" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Experience (Years) *</label>
                <input type="number" required value={doctorForm.experience_years} onChange={(e) => setDoctorForm({ ...doctorForm, experience_years: parseInt(e.target.value) })} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Upload License / Certificate (PDF/Image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCertificateFile(e.target.files[0])} className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm">
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-gray-500">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Login Here
          </Link>
        </div>

      </div>

      {/* REGISTRATION OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs relative">
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Email Verification Required</h3>
                <p className="text-[11px] text-gray-500">
                  Enter 6-digit OTP code dispatched to <span className="font-semibold text-gray-800">{pendingTargetEmail}</span>
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 font-medium leading-normal">
              📧 An email containing a 6-digit verification code has been dispatched to <b>{pendingTargetEmail}</b>. Please open your email inbox (or Spam folder), copy the 6-digit code, and enter it below.
            </div>

            <form onSubmit={handleFinalizeRegistration} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">6-Digit Registration OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP code"
                  value={registerOtp}
                  onChange={(e) => setRegisterOtp(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleRequestOtp(pendingTargetEmail, activeRole)}
                  className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs transition-colors"
                >
                  Resend OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                >
                  {otpLoading ? 'Verifying OTP & Registering...' : 'Verify OTP & Complete Registration'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RegisterPage;
