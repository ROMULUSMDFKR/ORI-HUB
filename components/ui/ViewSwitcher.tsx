import React from 'react';

export interface ViewOption {
  id: string;
  name: string;
  icon: string;
}

interface ViewSwitcherProps {
  views: ViewOption[];
  activeView: string;
  onViewChange: (view: string) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ views, activeView, onViewChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${
            activeView === view.id
              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined !text-base">{view.icon}</span>
          {view.name}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
