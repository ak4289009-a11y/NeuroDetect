import React from 'react';

export const CardSkeleton = () => (
  <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-darkcard space-y-4">
    <div className="w-12 h-12 rounded-xl skeleton-shimmer"></div>
    <div className="h-4 w-1/2 rounded skeleton-shimmer"></div>
    <div className="h-8 w-3/4 rounded skeleton-shimmer"></div>
  </div>
);

export const TableSkeleton = () => (
  <div className="w-full space-y-3">
    <div className="h-10 w-full rounded-xl skeleton-shimmer"></div>
    <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
    <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
    <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
  </div>
);
