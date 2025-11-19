import React from 'react';
import { useToast } from '../../hooks/useToast';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-full max-w-md px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;