import React from 'react';
import { Activity, Stethoscope, ShieldCheck, FileText } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Platform Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">NeuroDetect</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Clinical-grade AI Brain Tumor Diagnostic Platform utilizing DenseNet-121 deep convolutional networks and Explainable Grad-CAM spatial localization.
            </p>
          </div>

          {/* Col 2: Clinical Solutions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-blue-400" />
              <span>Clinical Solutions</span>
            </h4>
            <p className="text-xs text-gray-400">4-Class Brain Tumor Detection</p>
            <p className="text-xs text-gray-400">Grad-CAM Spatial Explainability</p>
            <p className="text-xs text-gray-400">Specialist Clinical Verification</p>
            <p className="text-xs text-gray-400">Automated Diagnostic Reporting</p>
          </div>

          {/* Col 3: Standards & Security */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Standards & Security</span>
            </h4>
            <p className="text-xs text-gray-400">HIPAA Data Security Compliant</p>
            <p className="text-xs text-gray-400">256-Bit Encrypted Storage</p>
            <p className="text-xs text-gray-400">Role-Based Access Control</p>
            <p className="text-xs text-gray-400">Clinical Decision Support System</p>
          </div>

          {/* Col 4: Direct Academic Document Hyperlinks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Platform Documentation</h4>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li>
                <a
                  href="/api/v1/project-docs/view/densenet121"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 hover:underline flex items-center gap-1 text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>DenseNet121 Architecture</span>
                </a>
              </li>
              <li>
                <a
                  href="/api/v1/project-docs/view/gradcam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 hover:underline flex items-center gap-1 text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Grad-CAM Heatmap Visualization</span>
                </a>
              </li>
              <li>
                <a
                  href="/api/v1/project-docs/view/doctor-validation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 hover:underline flex items-center gap-1 text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Doctor Validation System</span>
                </a>
              </li>
              <li>
                <a
                  href="/api/v1/project-docs/view/report-engine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 hover:underline flex items-center gap-1 text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Report Generation Engine</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} NeuroDetect Clinical AI. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Empowering Radiologists with Explainable AI Decision Support</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
