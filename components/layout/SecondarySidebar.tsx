import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SecondarySidebarProps {
  sublinks: { name: string; path: string; icon?: string }[];
  title: string;
}

const SecondarySidebar: React.FC<SecondarySidebarProps> = ({ sublinks, title }) => {
  const location = useLocation();

  return (
    <div className="w-64 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
      <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-normal text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {sublinks.map((sublink) => {
          const isSublinkActive = location.pathname + location.search === sublink.path;
          return (
            <NavLink
              key={sublink.path}
              to={sublink.path}
              className={`flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isSublinkActive
                  ? 'bg-slate-100 text-indigo-700 dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {sublink.icon && <span className="material-symbols-outlined mr-3 text-base">{sublink.icon}</span>}
              <span>{sublink.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default SecondarySidebar;