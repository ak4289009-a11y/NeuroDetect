import React from 'react';

const EmptyState = ({ message, icon: Icon, actionLabel, onAction, className = '' }) => {
  return (
    <div className={`p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm space-y-2 ${className}`}>
      {Icon && <Icon className="w-8 h-8 text-gray-400 mx-auto mb-1" />}
      <p className="text-xs text-gray-500 font-medium">{message || 'No records found.'}</p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors shadow-sm"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
