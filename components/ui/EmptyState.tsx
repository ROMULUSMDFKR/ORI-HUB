import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionText, onAction }) => {
  return (
    <div className="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700">
        <span className="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <h3 className="mt-5 text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <button
            onClick={onAction}
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="material-symbols-outlined -ml-1 mr-2">add</span>
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;