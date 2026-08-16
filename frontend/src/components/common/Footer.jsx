import React from 'react';
import { Activity, GraduationCap, Award, FileText } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Project Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">NeuroDetect</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              AI-Based Brain Tumor Detection & Classification System using DenseNet-121 Architecture and Grad-CAM visual heatmaps.
            </p>
          </div>

          {/* Col 2: Academic & Department Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Academic Details</span>
            </h4>
            <p className="text-xs text-gray-300"><b>Department:</b> Master of Computer Applications</p>
            <p className="text-xs text-gray-300"><b>College:</b> Indira Gandhi Open University</p>
            <p className="text-xs text-gray-300"><b>Degree:</b>  MCA Final Year Project</p>
          </div>

          {/* Col 3: Supervision */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-400" />
              <span>Project Supervision</span>
            </h4>
            <p className="text-xs text-gray-300"><b>Project Guide:</b> Dr. A. K. Sharma</p>
            <p className="text-xs text-gray-400">Professor & Head of Department (CSE)</p>
            <p className="text-xs text-gray-300"><b>Academic Year:</b> 2025 – 2026</p>
          </div>

          {/* Col 4: Direct Academic Document Hyperlinks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Project Documentation</h4>
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
          <p>© {new Date().getFullYear()} NeuroDetect Project Team. Developed for Academic Evaluation.</p>
          <p className="mt-2 sm:mt-0">Built with React, FastAPI, TensorFlow & SQLite</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
