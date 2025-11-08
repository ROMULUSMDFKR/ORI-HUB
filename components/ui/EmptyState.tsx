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
    <div className="text-center py-12 px-6 bg-white rounded-lg shadow-sm">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
        <span className="material-symbols-outlined text-3xl text-gray-400">{icon}</span>
      </div>
      <h3 className="mt-5 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <button
            onClick={onAction}
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
