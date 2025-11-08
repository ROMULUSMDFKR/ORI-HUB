

import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';

interface NavItem {
  name: string;
  path?: string;
  icon: string;
  sublinks?: { name: string; path: string, icon?: string }[];
}

const NavItem: React.FC<{ item: NavItem }> = ({ item }) => {
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

  // Effect to open the menu if a sublink becomes active through navigation
  useEffect(() => {
    if (isParentActive) {
      setIsOpen(true);
    }
  }, [isParentActive]);


  const handleToggle = () => {
    if (hasSublinks) {
      setIsOpen(!isOpen);
    }
  };

  const commonClasses = "flex items-center p-2 text-on-surface-secondary rounded-lg hover:bg-background transition-colors duration-200";
  const activeLinkClasses = "bg-primary text-on-primary font-semibold";
  
  if (!hasSublinks && item.path) {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) => `${commonClasses} ${isActive ? activeLinkClasses : ''}`}
      >
        <span className="material-symbols-outlined w-5 h-5 mr-3">{item.icon}</span>
        {item.name}
      </NavLink>
    );
  }

  return (
    <>
      <button onClick={handleToggle} className={`w-full text-left ${commonClasses} ${isParentActive ? 'bg-background' : ''}`}>
        <span className="material-symbols-outlined w-5 h-5 mr-3">{item.icon}</span>
        <span className="flex-1">{item.name}</span>
        <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>chevron_right</span>
      </button>
      <div className={`pl-4 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="py-2 flex flex-col space-y-1">
          {item.sublinks?.map((sublink) => {
            const isSublinkActive = location.pathname + location.search === sublink.path;
            
            return (
              <NavLink
                key={sublink.name}
                to={sublink.path}
                className={`flex items-center p-2 text-sm text-on-surface-secondary hover:bg-background hover:text-on-surface rounded-lg transition-colors duration-200 ${isSublinkActive ? activeLinkClasses : ''}`}
              >
                {sublink.icon ? 
                  <span className="material-symbols-outlined text-sm mr-2 w-5 text-center flex-shrink-0 inline-flex items-center justify-center">{sublink.icon}</span> 
                  : <span className="w-5 mr-2 flex-shrink-0"></span>
                }
                {sublink.name}
              </NavLink>
            );
          })}
        </div>
      </div>
    </>
  );
};

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-surface text-on-surface flex-shrink-0 flex flex-col">
      <div className="h-16 flex items-center justify-center px-4 border-b border-border">
        <div className="flex items-center gap-2 text-on-surface">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" id="asterisk" className="h-8 w-8 text-on-surface">
              <path d="M16.58,12.51a1.5743,1.5743,0,0,1-2.31,1.77l-2.69-1.55v3.11a1.58,1.58,0,0,1-3.16,0V12.73L5.73,14.28a1.57,1.57,0,1,1-1.57-2.72L6.85,10,4.16,8.44a1.5608,1.5608,0,0,1-.58-2.15,1.58,1.58,0,0,1,2.15-.57L8.42,7.27V4.16a1.58,1.58,0,0,1,3.16,0V7.27l2.69-1.55a1.5743,1.5743,0,0,1,2.31,1.77,1.562,1.562,0,0,1-.74.95L13.15,10l2.69,1.56A1.562,1.562,0,0,1,16.58,12.51Z" fill="currentColor"></path>
            </svg>
          <h1 className="text-xl font-bold tracking-wider">CRM Studio</h1>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.name} item={link} />
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-xs text-on-surface-secondary">&copy; 2024 CRM Studio</p>
      </div>
    </div>
  );
};

export default Sidebar;