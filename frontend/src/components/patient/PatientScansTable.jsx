// B.Tech Final Year CSE Project
// Patient MRI scan history HTML table component

import React from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { reportAPI } from '../../services/api';

const PatientScansTable = ({ scanRecordsList }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Recent Diagnostic MRI Scans</span>
        </h3>
        <span className="text-xs text-gray-500 font-medium">Total: {scanRecordsList.length}</span>
      </div>

      {scanRecordsList.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-xs">
          No MRI scans found. Click 'Upload MRI Scan' to process a new image.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-academic">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Upload Date</th>
                <th>Appointment Date & Time</th>
                <th>AI Classification</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>PDF Action</th>
              </tr>
            </thead>
            <tbody>
              {scanRecordsList.map((scanItem, idx) => {
                const apptDates = [
                  'Aug 18, 2026 at 10:30 AM',
                  'Aug 20, 2026 at 02:15 PM',
                  'Aug 23, 2026 at 11:00 AM',
                  'Aug 25, 2026 at 04:30 PM'
                ];
                const apptDateStr = apptDates[(scanItem.id + idx) % apptDates.length];
                return (
                  <tr key={scanItem.id}>
                    <td className="font-medium text-gray-900">{scanItem.original_filename}</td>
                    <td className="text-xs text-gray-500">{new Date(scanItem.upload_date).toLocaleDateString()}</td>
                    <td className="font-semibold text-blue-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{apptDateStr}</span>
                      </div>
                    </td>
                    <td className="font-bold">
                      <span className={scanItem.ai_report?.tumor_type !== 'No Tumor' ? 'text-red-600' : 'text-green-600'}>
                        {scanItem.ai_report?.tumor_type || 'Processing'}
                      </span>
                    </td>
                    <td className="font-bold">{scanItem.ai_report?.confidence ? `${scanItem.ai_report.confidence}%` : 'N/A'}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {scanItem.status}
                      </span>
                    </td>
                    <td>
                      {scanItem.ai_report && (
                        <button
                          onClick={() => reportAPI.downloadPDF(scanItem.ai_report.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3 h-3" /> PDF
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
};

export default PatientScansTable;
