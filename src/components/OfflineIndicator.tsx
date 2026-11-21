import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 right-4 z-40 mx-auto max-w-md lg:bottom-5 lg:left-auto lg:right-5 lg:mx-0"
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
        <span>Offline mode — entries are saved directly on this device.</span>
      </div>
    </div>
  );
};
