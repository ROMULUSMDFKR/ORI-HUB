import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';

interface NavItemProps {
  name: string;
  path?: string;
  icon: string;
  sublinks?: { name: string; path: string, icon?: string }[];
  isSeparator?: boolean;
}

const NavItem: React.FC<{ item: NavItemProps; isCollapsed: boolean; }> = ({ item, isCollapsed }) => {
  const location = useLocation();
  const hasSublinks = item.sublinks && item.sublinks.length > 0;

  // Memoize the check for active parent to avoid re-calculation on every render
  const isParentActive = useMemo(() => 
    hasSublinks 
      ? item.sublinks.some(sublink => location.pathname + location.search === sublink.path) 
      : false,
    [item.sublinks, location, hasSublinks]
  );
  
  const [isOpen, setIsOpen] = useState(isParentActive);

  // Effect to open/close menu based on state
  useEffect(() => {
    if (isParentActive && !isCollapsed) {
      setIsOpen(true);
    }
    if (isCollapsed) {
      setIsOpen(false);
    }
  }, [isParentActive, isCollapsed]);


  const handleToggle = () => {
    if (hasSublinks && !isCollapsed) {
      setIsOpen(!isOpen);
    }
  };

  const commonClasses = "flex items-center p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-600 text-white font-semibold";
  
  if (!hasSublinks && item.path) {
    // For top-level links, NavLink's default `isActive` is usually sufficient
    // unless they also have query params that need exact matching.
    const isTopLevelActive = location.pathname + location.search === item.path;
    return (
      <NavLink
        to={item.path}
        className={`${commonClasses} ${isCollapsed ? 'justify-center' : ''} ${isTopLevelActive ? activeLinkClasses : 'hover:text-slate-800 dark:hover:text-slate-200'}`}
        title={isCollapsed ? item.name : undefined}
      >
        <span className={`material-symbols-outlined w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
        {!isCollapsed && item.name}
      </NavLink>
    );
  }

  return (
    <div title={isCollapsed ? item.name : undefined}>
      <button onClick={handleToggle} className={`w-full text-left ${commonClasses} ${isParentActive ? 'bg-slate-100 dark:bg-slate-700' : ''} ${isCollapsed ? 'justify-center' : ''}`}>
        <span className={`material-symbols-outlined w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
        {!isCollapsed && <span className="flex-1">{item.name}</span>}
        {!isCollapsed && <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>chevron_right</span>}
      </button>
      {!isCollapsed && (
        <div className={`pl-11 -ml-2 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            <div className="py-2 flex flex-col space-y-1">
            {item.sublinks?.map((sublink) => {
                // Strict check including search parameters for sublinks
                const isSublinkActive = location.pathname + location.search === sublink.path;
                
                return (
                <NavLink
                    key={sublink.name}
                    to={sublink.path}
                    className={`flex items-center p-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors duration-200 ${isSublinkActive ? activeLinkClasses : ''}`}
                >
                    {sublink.name}
                </NavLink>
                );
            })}
            </div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex-shrink-0 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`h-16 flex items-center justify-center px-4 border-b border-slate-200 dark:border-slate-700`}>
        <Link to="/" className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" id="asterisk" className="h-8 w-8 text-slate-800 dark:text-slate-200 flex-shrink-0">
              <path d="M16.58,12.51a1.5743,1.5743,0,0,1-2.31,1.77l-2.69-1.55v3.11a1.58,1.58,0,0,1-3.16,0V12.73L5.73,14.28a1.57,1.57,0,1,1-1.57-2.72L6.85,10,4.16,8.44a1.5608,1.5608,0,0,1-.58-2.15,1.58,1.58,0,0,1,2.15-.57L8.42,7.27V4.16a1.58,1.58,0,0,1,3.16,0V7.27l2.69-1.55a1.5743,1.5743,0,0,1,2.31,1.77,1.562,1.562,0,0,1-.74.95L13.15,10,2.69,1.56A1.562,1.562,0,0,1,16.58,12.51Z" fill="currentColor"></path>
            </svg>
          {!isCollapsed && <h1 className="text-xl font-bold tracking-wider truncate">CRM Studio</h1>}
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_LINKS.map((link, index) => {
          if (link.isSeparator) {
            return (
              <div key={`sep-${index}`} className="pt-4 pb-1 px-2">
                {!isCollapsed ? (
                    <h2 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{link.name}</h2>
                ) : (
                    <div className="h-px bg-slate-200 dark:border-slate-700 mx-2 my-2"></div>
                )}
              </div>
            );
          }
          return <NavItem key={link.name} item={link as NavItemProps} isCollapsed={isCollapsed} />;
        })}
      </nav>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button 
            onClick={onToggle} 
            className={`w-full flex items-center p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
              <span className={`material-symbols-outlined transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>keyboard_double_arrow_left</span>
              {!isCollapsed && <span className="ml-3 text-sm font-medium">Colapsar</span>}
          </button>
      </div>
    </div>
  );
};

export default Sidebar;