import React, {useState} from 'react';
import {Download, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'inline' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({variant = 'inline'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!isInstallable && !isIOS) {
    if (variant === 'card') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Use Like a Phone App
              </h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Open your browser menu and tap <strong>Add to Home Screen</strong> or{' '}
                <strong>Install App</strong> to launch Sada Khata fullscreen offline without any browser bar.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {variant === 'card' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Install Sada Khata on This Device
                </h3>
                <p className="mt-0.5 text-sm text-slate-600">
                  Works 100% offline from your home screen with zero ads.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              {isIOS ? 'Install on iPhone' : 'Install App'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>{isIOS ? 'Add to Home' : 'Install App'}</span>
        </button>
      )}

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 id="ios-install-title" className="font-display text-lg font-bold text-slate-900">
                Install on iPhone or iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close instructions"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-2.5 text-sm text-slate-700 list-decimal pl-5 leading-relaxed">
              <li>
                Tap the <strong>Share</strong> icon in Safari&apos;s bottom toolbar.
              </li>
              <li>
                Scroll down and choose <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> to open Sada Khata offline anytime.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
