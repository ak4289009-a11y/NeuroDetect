import React from 'react';
import { Activity } from 'lucide-react';

const Logo = ({ size = "normal", showText = true, className = "" }) => {
  const isSmall = size === "small";
  const isLarge = size === "large";

  const iconSizes = isSmall ? "w-5 h-5" : isLarge ? "w-8 h-8" : "w-6 h-6";
  const textSizes = isSmall ? "text-base" : isLarge ? "text-2xl" : "text-xl";

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Brand Icon Badge */}
      <div className="relative flex items-center justify-center p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
        <Activity className={iconSizes} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white"></span>
      </div>

      {/* Brand Name Text */}
      {showText && (
        <span className={`font-extrabold text-gray-900 ${textSizes}`}>
          Neuro<span className="text-blue-600">Detect</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
