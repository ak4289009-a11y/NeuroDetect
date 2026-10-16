import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Download, X } from 'lucide-react';

export default function PWAStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA installation prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  return (
    <>
      {/* 1. Offline Notification Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full">
            <WifiOff className="w-4 h-4 text-amber-200 animate-pulse flex-shrink-0" />
            <span>
              <strong>Offline Diagnostic Mode:</strong> Cellular/Wi-Fi connection lost. Operating from local cache &amp; IndexedDB.
            </span>
          </div>
        </div>
      )}

      {/* 2. Reconnection Toast */}
      {showReconnected && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full">
            <Wifi className="w-4 h-4 text-emerald-200 flex-shrink-0" />
            <span>
              <strong>Connection Restored:</strong> Online synchronization active.
            </span>
          </div>
        </div>
      )}

      {/* 3. Install App Prompt Banner */}
      {showInstallBanner && installPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 bg-slate-900 border border-blue-500/40 text-white p-4 rounded-xl shadow-2xl max-w-sm flex items-start space-x-3 backdrop-blur-md">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-semibold text-slate-100 text-sm">Install NeuroDetect App</p>
            <p className="text-slate-400 mt-0.5">
              Install to your desktop or mobile home screen for quick offline access.
            </p>
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                Install App
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-slate-400 hover:text-slate-200 px-2 py-1.5 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
