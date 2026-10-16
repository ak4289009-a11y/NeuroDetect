// NeuroDetect Clinical AI - Hero Section Component
// Hero section component with asymmetrical 2-column layout

import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';

const HeroSection = () => {
  return (
    <section id="home" className="bg-white border-b border-gray-200 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column (7 cols - Asymmetrical wider main content) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-block px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Activity className="w-3 h-3 inline-block mr-1" />
              <span>AI Powered</span> 
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight break-words">
              AI Based Brain Tumor Detection using DenseNet121
            </h1>

            <p className="text-sm text-gray-600 leading-relaxed">
              A computer-assisted diagnostic platform developed for classifying axial brain MRI scans into <b>Glioma</b>, <b>Meningioma</b>, <b>Pituitary</b>, and <b>Healthy</b> categories with <b>Grad-CAM visual heatmaps</b> for neurologist validation.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-2"
              >
                <span>Login to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#about"
                className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition-colors border border-gray-200"
              >
                Learn More
              </a>
            </div>

            {/* Quick Specs */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="font-bold text-gray-900">DenseNet121</p>
                <p className="text-gray-500">CNN Model</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">Grad-CAM</p>
                <p className="text-gray-500">Visual Heatmaps</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">96.4%</p>
                <p className="text-gray-500">Test Accuracy</p>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols - Sidebar Diagram Card) */}
          <div className="lg:col-span-5 bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-900 text-xs">MRI Analysis Diagram</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">
                Verified Engine
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-1">
                <p className="text-gray-500">Input Image Size</p>
                <p className="font-bold text-gray-800">224 x 224 px</p>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-1">
                <p className="text-gray-500">Classifications</p>
                <p className="font-bold text-blue-600">4 Categories</p>
              </div>
            </div>

            <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs space-y-2">
              <p className="font-bold text-gray-900">Target Tumor Classes:</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 font-medium">Glioma</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-medium">Meningioma</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium">Pituitary</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-medium">No Tumor</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 italic">
              * Developed for clinical evaluation under specialist supervision.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
