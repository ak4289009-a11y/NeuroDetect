// NeuroDetect Clinical AI - Progress Bar Component
// Progress bar component for file upload and AI prediction status

import React from 'react';

const ProgressBar = ({ progressPercentage, statusLabel, progress, label }) => {
  const percentage = progressPercentage ?? progress ?? 0;
  const currentLabel = statusLabel || label || 'Processing...';

  return (
    <div className="w-full space-y-1 text-xs text-gray-600">
      <div className="flex justify-between items-center font-medium">
        <span>{currentLabel}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
