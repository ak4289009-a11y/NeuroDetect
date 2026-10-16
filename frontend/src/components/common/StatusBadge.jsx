import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  const val = (status || '').toString().trim().toUpperCase();

  let colorClasses = 'bg-gray-50 text-gray-700 border-gray-200';
  if (['APPROVED', 'COMPLETED', 'SCHEDULED', 'ACTIVE'].includes(val)) {
    colorClasses = 'bg-green-50 text-green-700 border-green-200';
  } else if (['PENDING', 'UNDER_REVIEW', 'AI_COMPLETED', 'NEW', 'UNREAD'].includes(val)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['REJECTED', 'CANCELLED', 'INACTIVE'].includes(val)) {
    colorClasses = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border inline-block ${colorClasses} ${className}`}>
      {status || 'UNKNOWN'}
    </span>
  );
};

export default StatusBadge;
