import React from 'react';
import { FileText, Download, X, BookOpen, ShieldCheck, Cpu, Layers } from 'lucide-react';

const DocModal = ({ docData, onClose }) => {
  if (!docData) return null;

  const handleDownloadDocText = () => {
    const textContent = `================================================================================
${docData.title.toUpperCase()}
${docData.subtitle}
Category: ${docData.category}
Author: ${docData.author} | Version: ${docData.version}
================================================================================

` + docData.sections.map(s => `${s.heading}\n--------------------------------------------------------------------------------\n${s.content}\n`).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title.toLowerCase().replace(/[^a-z0-0]/g, '_')}_spec.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 text-xs">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-start bg-gray-50 rounded-t-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                {docData.category}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-mono text-[11px]">{docData.version}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{docData.title}</h2>
            <p className="text-xs text-gray-600 font-medium">{docData.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Sections */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white leading-relaxed">
          {docData.sections?.map((sec, idx) => (
            <div key={idx} className="space-y-2 p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-sm text-blue-700">{sec.heading}</h3>
              <p className="text-gray-700 whitespace-pre-line text-xs">{sec.content}</p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-lg">
          <span className="text-[11px] text-gray-500 font-mono">Author: {docData.author}</span>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadDocText}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download Technical Document (.TXT)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocModal;
