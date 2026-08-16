// B.Tech / MCA Final Year CSE Project - NeuroDetect Landing Page
// Main landing page with Features, About, Doctors, Interactive FAQ, and Contact sections

import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import HeroSection from '../components/landing/HeroSection';
import Toast from '../components/common/Toast';
import {
  UploadCloud, Cpu, UserCheck, Download, Brain, ShieldCheck,
  FileText, Activity, ChevronDown, ChevronUp, Mail, Send, CheckCircle2,
  HelpCircle, Stethoscope, MapPin, Sparkles
} from 'lucide-react';
import { contentAPI } from '../services/api';

const LandingPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [contactForm, setContactForm] = useState({
    sender_name: '',
    sender_email: '',
    subject: '',
    message: ''
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchLandingFaqs();
  }, []);

  const fetchLandingFaqs = async () => {
    try {
      const res = await contentAPI.getFAQs();
      if (res.data && res.data.length > 0) {
        setFaqs(res.data);
      } else {
        setFaqs(defaultFaqs);
      }
    } catch (err) {
      setFaqs(defaultFaqs);
    }
  };

  const defaultFaqs = [
    {
      id: 1,
      question: "How accurate is the DenseNet-121 AI brain tumor detection model?",
      answer: "The DenseNet-121 deep neural network architecture achieves an evaluation precision of ~95.8% across Glioma, Meningioma, Pituitary, and Healthy MRI classifications. All AI outputs are reviewed by certified neurologists before report issuance.",
      category: "AI Technology"
    },
    {
      id: 2,
      question: "What is Grad-CAM and how does it explain the MRI analysis?",
      answer: "Grad-CAM (Gradient-weighted Class Activation Mapping) produces a colorized visual heatmap overlay highlighting the exact spatial regions and neural activations on the MRI scan that influenced the AI model's diagnosis.",
      category: "Explainability"
    },
    {
      id: 3,
      question: "How does the Two-Tier Doctor Verification workflow function?",
      answer: "When a patient uploads an axial MRI scan, the system runs AI inference and assigns the scan to the attending doctor queue. The specialist reviews the raw scan alongside the Grad-CAM heatmap, enters clinical notes and prescriptions, and approves the final medical report.",
      category: "Clinical Care"
    },
    {
      id: 4,
      question: "Can patients download an official verified PDF report?",
      answer: "Yes. Once reviewed and signed off by the attending neurologist, patients can instantly download an official vector PDF report containing patient details, diagnostic breakdown, side-by-side MRI and Grad-CAM scans, and doctor prescriptions.",
      category: "Reports"
    }
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.sender_name || !contactForm.sender_email || !contactForm.message) {
      setToast({ message: "Please fill in all required fields.", type: "error" });
      return;
    }

    setSendingMessage(true);
    try {
      await contentAPI.sendContactMessage({
        sender_name: contactForm.sender_name,
        sender_email: contactForm.sender_email,
        subject: contactForm.subject || "General Inquiry",
        message: contactForm.message
      });
      setToast({ message: "Thank you! Your message has been sent successfully.", type: "success" });
      setContactForm({ sender_name: '', sender_email: '', subject: '', message: '' });
    } catch (err) {
      setToast({ message: "Failed to send message. Please try again later.", type: "error" });
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans scroll-smooth">
      <Navbar />

      {/* Hero Section (id="home") */}
      <HeroSection />

      {/* FEATURES SECTION (id="features") */}
      <section id="features" className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
              System Architecture & Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">How NeuroDetect Works</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              A 4-step clinical pipeline bridging deep learning diagnostics with specialist medical verification.
            </p>
          </div>

          {/* 4 Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: 'Step 01',
                title: 'Upload Axial MRI Scan',
                desc: 'Upload standard axial T1/T2 MRI brain scan images (JPG, PNG, JPEG < 5MB).',
                icon: UploadCloud,
                color: 'blue'
              },
              {
                step: 'Step 02',
                title: 'DenseNet-121 Inference',
                desc: 'Deep feature extraction and 4-class classification (Glioma, Meningioma, Pituitary, No Tumor).',
                icon: Cpu,
                color: 'purple'
              },
              {
                step: 'Step 03',
                title: 'Doctor Clinical Validation',
                desc: 'Attending neurologist inspects Grad-CAM heatmap, verifies diagnosis & attaches Rx prescription.',
                icon: UserCheck,
                color: 'green'
              },
              {
                step: 'Step 04',
                title: 'Verified PDF Report',
                desc: 'Download tamper-proof ReportLab vector PDF with side-by-side MRI and Grad-CAM heatmaps.',
                icon: Download,
                color: 'amber'
              },
            ].map((cardItem, index) => {
              const IconComponent = cardItem.icon;
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                      {cardItem.step}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{cardItem.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{cardItem.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Key Feature Highlights Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-gray-900">Grad-CAM Visual Explainability</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Colorized visual heatmaps show the exact neural attention boundaries, allowing doctors to confirm the model focused on real tumor tissue.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-gray-900">Role-Based Access Control (RBAC)</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Segregated workflows for Patients, Doctors, and Administrators with JWT token authentication and mandatory admin verification for doctors.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-gray-900">Automated Vector PDF Generator</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Dynamic ReportLab Platypus PDF generation with cryptographic tracking numbers, digital timestamps, and attending physician credentials.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ABOUT SECTION (id="about") */}
      <section id="about" className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
              About The Project
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              NeuroDetect Research & Architecture
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              NeuroDetect was developed as a comprehensive Final Year Major Project in Computer Science & Engineering. It integrates modern transfer learning with computer vision to assist healthcare institutions in rapid axial brain MRI tumor detection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <h3>Project Objectives</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Provide automated 4-class brain tumor classification with high precision while generating spatial heatmaps for neurologist verification.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h3>Model Architecture</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                DenseNet-121 deep convolutional network fine-tuned on annotated axial brain MRI scans with Global Average Pooling (GAP) and Softmax classification.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Stethoscope className="w-4 h-4" />
                <h3>Clinical Workflow (HITL)</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Enforces a Human-in-the-Loop (HITL) model ensuring patient uploads are validated by licensed medical practitioners before treatment guidelines are issued.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* DOCTORS SECTION (id="doctors") */}
      <section id="doctors" className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
              Clinical Panel
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Attending Neurologists</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Certified medical specialists reviewing and approving AI scan outputs across various hospital locations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Dr. Rajesh Kumar',
                spec: 'Senior Neuro-Oncologist',
                hosp: 'AIIMS Medical Center',
                city: 'New Delhi, India',
                exp: '14 Yrs Experience',
                reg: 'MED-AIIMS-99201'
              },
              {
                name: 'Dr. Sunita Patel',
                spec: 'Chief Neuroradiologist',
                hosp: 'Apollo Health Care',
                city: 'Mumbai, India',
                exp: '16 Yrs Experience',
                reg: 'MED-APOLLO-77123'
              },
              {
                name: 'Dr. Vikram Rao',
                spec: 'Consultant Neurosurgeon',
                hosp: 'Manipal Hospital',
                city: 'Bangalore, India',
                exp: '12 Yrs Experience',
                reg: 'MED-MANIPAL-44321'
              },
            ].map((docItem, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {docItem.name.split(' ')[1]?.[0] || 'D'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{docItem.name}</h3>
                  <p className="text-xs font-semibold text-blue-600">{docItem.spec}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-700">{docItem.hosp}</p>
                  <p className="flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{docItem.city}</span>
                  </p>
                  <div className="flex justify-center gap-2 pt-1">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 font-semibold rounded text-[11px] border border-green-200">
                      {docItem.exp}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-600 font-mono rounded text-[11px] border border-gray-200">
                      {docItem.reg}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ SECTION (id="faq") */}
      <section id="faq" className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Got Questions? We Have Answers</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Everything you need to know about the AI detection engine, Grad-CAM visualization, and report issuance.
            </p>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.id || idx}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 hover:bg-gray-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="font-bold text-sm text-gray-900">{faq.question}</span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-200/60 bg-white">
                      <p className="pl-8">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CONTACT SECTION (id="contact") */}
      <section id="contact" className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
                  Contact Support
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Get In Touch With Our Team
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Have questions regarding MRI image processing, institutional deployment, or clinical reviews? Send our department an inquiry.
                </p>
              </div>

              
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h3 className="font-bold text-base text-gray-900 mb-1">Send Us a Direct Message</h3>
              <p className="text-xs text-gray-500 mb-6">Our academic evaluation & support desk will respond shortly.</p>

              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={contactForm.sender_name}
                      onChange={(e) => setContactForm({ ...contactForm, sender_name: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      value={contactForm.sender_email}
                      onChange={(e) => setContactForm({ ...contactForm, sender_email: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Question regarding MRI format compatibility"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Your Message *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your inquiry or feedback here..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMessage ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      </section>

      <Footer />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default LandingPage;
