import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: number;
  message: string;
  type: ToastType;
  onClose: (id: number) => void;
}

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const COLORS: Record<ToastType, { bg: string; text: string; icon: string; border: string }> = {
  success: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', icon: 'text-green-500', border: 'border-green-500' },
  error: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', icon: 'text-red-500', border: 'border-red-500' },
  warning: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', icon: 'text-yellow-500', border: 'border-yellow-500' },
  info: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', icon: 'text-blue-500', border: 'border-blue-500' },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };
  
  const colors = COLORS[type];

  return (
    <div className={`w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border-l-4 ${colors.border} ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out transform ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
        <div className="p-4">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <span className={`material-symbols-outlined text-2xl ${colors.icon}`}>{ICONS[type]}</span>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className={`text-sm font-medium ${colors.text} break-words leading-5`}>{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={handleClose} className="inline-flex rounded-md text-slate-400 hover:text-slate-500 focus:outline-none">
                        <span className="sr-only">Close</span>
                        <span className="material-symbols-outlined !text-sm">close</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Toast;