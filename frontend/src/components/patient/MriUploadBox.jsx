// B.Tech Project - Patient MRI Upload Component
// Validates file format, size limit (<5MB), location/doctor selection, and runs DenseNet121 inference

import React, { useState, useEffect } from 'react';
import { UploadCloud, FileImage, AlertCircle, Brain, Download, MapPin, UserCheck } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import { scanAPI, reportAPI, doctorAPI } from '../../services/api';

const MriUploadBox = ({ onScanComplete, setToastMessage }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [predictionOutput, setPredictionOutput] = useState(null);

  // Doctor & Location Selection State
  const [doctorsList, setDoctorsList] = useState([]);
  const [registeredLocations, setRegisteredLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  useEffect(() => {
    fetchRegisteredLocations();
  }, []);

  useEffect(() => {
    fetchApprovedDoctors();
  }, [selectedCity]);

  const fetchRegisteredLocations = async () => {
    try {
      const res = await doctorAPI.getLocations();
      setRegisteredLocations(res.data?.locations || []);
    } catch (err) {
      console.error("Error fetching registered doctor locations:", err);
    }
  };

  const fetchApprovedDoctors = async () => {
    try {
      const res = await doctorAPI.getPublicDoctors(selectedCity);
      const docs = res.data || [];
      setDoctorsList(docs);
      if (docs.length > 0) {
        // Keep current selected doctor if valid, else pick first doctor
        if (!docs.some(d => String(d.id) === String(selectedDoctorId))) {
          setSelectedDoctorId(docs[0].id);
        }
      } else {
        setSelectedDoctorId('');
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setDoctorsList([]);
      setSelectedDoctorId('');
    }
  };

  // Filtered locations matching user search query
  const filteredLocations = registeredLocations.filter(loc => {
    const q = searchLocationQuery.toLowerCase().trim();
    if (!q) return true;
    return loc.city.toLowerCase().includes(q) || loc.location.toLowerCase().includes(q);
  });

  const selectedDoctorObj = doctorsList.find(d => String(d.id) === String(selectedDoctorId));

  // File selection & validation logic
  const handleFileSelection = (event) => {
    const uploadedFile = event.target.files[0];
    setErrorMessage('');
    setPredictionOutput(null);

    if (!uploadedFile) return;

    // Check file size (15MB limit matching backend)
    const MAX_SIZE_BYTES = 15 * 1024 * 1024;
    if (uploadedFile.size > MAX_SIZE_BYTES) {
      setErrorMessage('File size exceeds 15MB limit! Please upload a smaller MRI scan image.');
      setToastMessage({ message: 'File size exceeds 15MB limit!', type: 'error' });
      return;
    }

    // Check file extension
    const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      setErrorMessage('Invalid file format! Only JPG, JPEG, and PNG images are supported.');
      setToastMessage({ message: 'Invalid file format! Select JPG or PNG.', type: 'error' });
      return;
    }

    setSelectedFile(uploadedFile);
    setFilePreviewUrl(URL.createObjectURL(uploadedFile));
  };

  // Submit file for DenseNet121 AI inference
  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select an MRI image file before clicking Run AI Analysis.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (selectedDoctorId) {
        formData.append('preferred_doctor_id', selectedDoctorId);
      }

      setUploadProgress(65);
      const response = await scanAPI.uploadMRI(formData);
      setUploadProgress(100);

      setPredictionOutput(response.data);
      setToastMessage({ message: 'MRI scan analyzed successfully!', type: 'success' });
      if (onScanComplete) onScanComplete();
    } catch (err) {
      console.error('Upload Error:', err);
      const detailMsg = err.response?.data?.detail || 'Failed to analyze MRI image.';
      setErrorMessage(detailMsg);
      setToastMessage({ message: detailMsg, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 shadow-sm text-xs">
      
      {/* 1. India-Wide Doctor Location Selection Bar */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Select Attending Neurologist by Location (India-Wide)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Location Autocomplete / Select */}
          <div className="relative">
            <label className="block font-semibold mb-1 text-gray-700">Filter by City / Location</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search registered location (e.g. Kolkata, Delhi, Mumbai)..."
                value={searchLocationQuery || (selectedCity === 'All' ? '' : selectedCity)}
                onChange={(e) => {
                  setSearchLocationQuery(e.target.value);
                  setShowLocationDropdown(true);
                }}
                onFocus={() => setShowLocationDropdown(true)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none pr-8"
              />
              {selectedCity !== 'All' && (
                <button
                  onClick={() => {
                    setSelectedCity('All');
                    setSearchLocationQuery('');
                  }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 font-bold"
                  title="Clear location filter"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {showLocationDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                <div
                  onClick={() => {
                    setSelectedCity('All');
                    setSearchLocationQuery('');
                    setShowLocationDropdown(false);
                  }}
                  className={`p-2.5 text-xs font-semibold cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${selectedCity === 'All' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  All Locations & Cities (India-Wide)
                </div>

                {filteredLocations.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 italic text-center">
                    No registered locations match "{searchLocationQuery}"
                  </div>
                ) : (
                  filteredLocations.map((loc) => (
                    <div
                      key={loc.city}
                      onClick={() => {
                        setSelectedCity(loc.city);
                        setSearchLocationQuery(loc.city);
                        setShowLocationDropdown(false);
                      }}
                      className={`p-2.5 text-xs cursor-pointer border-b border-gray-50 hover:bg-blue-50 flex items-center justify-between ${selectedCity === loc.city ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-800'}`}
                    >
                      <span>{loc.city}</span>
                      <span className="text-[11px] text-gray-400 font-normal">{loc.location}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Doctor Dropdown or Empty Location Notice */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Choose Doctor for Review</label>
            {doctorsList.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>No doctors are currently available in this location.</span>
              </div>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} — {doc.specialization} ({doc.hospital}, {doc.city})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Selected Doctor Hospital Info Card (Requirement #6) */}
        {selectedDoctorObj && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-blue-950">
              <p className="font-bold text-sm text-blue-900">Dr. {selectedDoctorObj.name}</p>
              <p className="font-medium text-blue-800">{selectedDoctorObj.specialization} · {selectedDoctorObj.experience_years} Years Experience</p>
              <p className="text-gray-600 font-normal"><b>Hospital:</b> {selectedDoctorObj.hospital} · <b>Location:</b> {selectedDoctorObj.location || `${selectedDoctorObj.city}, India`}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Drag & Drop Image Upload Box */}
      <form onSubmit={handleUploadSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors bg-gray-50/50">
          <input
            type="file"
            id="mriFileInput"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileSelection}
            className="hidden"
          />

          {!filePreviewUrl ? (
            <label htmlFor="mriFileInput" className="cursor-pointer space-y-2 block">
              <UploadCloud className="w-10 h-10 text-blue-600 mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-sm">Upload Human Brain MRI</p>
                <p className="text-gray-500 font-medium">Only human brain MRI scans are supported (JPG, JPEG, PNG up to 15MB).</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <img
                src={filePreviewUrl}
                alt="Selected MRI Preview"
                className="w-36 h-36 object-cover mx-auto rounded-lg border border-gray-200 shadow-sm"
              />
              <div className="text-center space-y-1">
                <p className="font-bold text-gray-900">{selectedFile?.name}</p>
                <p className="text-gray-500 font-mono">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                <label htmlFor="mriFileInput" className="text-blue-600 hover:underline cursor-pointer font-semibold inline-block pt-1">
                  Change MRI Image
                </label>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isProcessing && <ProgressBar progress={uploadProgress} label="Running DenseNet121 Inference..." />}

        <button
          type="submit"
          disabled={!selectedFile || isProcessing}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Brain className="w-4 h-4" />
          <span>{isProcessing ? 'Processing Image...' : 'Run AI Analysis & Request Verification'}</span>
        </button>
      </form>

      {/* 3. Prediction Result Box */}
      {predictionOutput && (
        <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-blue-200 pb-2">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span>AI Preliminary Prediction Output</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-blue-600 text-white font-mono">
              Confidence: {predictionOutput.ai_report?.confidence}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-gray-600">Preliminary Classification:</p>
              <p className="font-bold text-base text-blue-700">{predictionOutput.ai_report?.tumor_type}</p>
            </div>
            <div>
              <p className="text-gray-600">Assigned Neurologist:</p>
              <p className="font-bold text-gray-900">
                {doctorsList.find(d => String(d.id) === String(selectedDoctorId))?.name || 'Dr. Rajesh Kumar'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => reportAPI.downloadPDF(predictionOutput.ai_report?.id)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download Preliminary PDF Report
            </button>
          </div>

          <p className="text-[11px] text-gray-500 italic pt-2 border-t border-blue-200/60">
            <b>Medical Notice:</b> AI-generated result for preliminary assistance only. It does not replace professional medical diagnosis or clinical judgment.
          </p>
        </div>
      )}

    </div>
  );
};

export default MriUploadBox;
