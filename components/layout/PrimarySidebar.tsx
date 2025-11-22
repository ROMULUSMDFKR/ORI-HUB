





import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { User } from '../../types';

interface PrimarySidebarProps {
    user: User;
}

const PrimarySidebar: React.FC<PrimarySidebarProps> = ({ user }) => {
  const location = useLocation();

  const primaryNavLinks = NAV_LINKS.filter(link => !link.isSeparator);

  const getTargetPath = (link: (typeof NAV_LINKS)[number]) => {
    if (link.isSeparator) return '#';
    return link.path || (link.sublinks && link.sublinks[0].path) || '/';
  };

  const isLinkActive = (link: (typeof NAV_LINKS)[number]) => {
    const currentTopLevelPath = location.pathname.split('/')[1] || 'today';
    
    if (link.path === '/today') {
      return location.pathname === '/' || location.pathname === '/today';
    }
    
    if (link.sublinks && link.sublinks.length > 0) {
      const sublinkTopLevelPath = link.sublinks[0].path.split('/')[1];
      return sublinkTopLevelPath === currentTopLevelPath;
    }

    // For direct links
    if (link.path) {
      const linkTopLevelPath = link.path.split('/')[1];
      return currentTopLevelPath === linkTopLevelPath;
    }
    
    return false;
  };

  // Check if user has access to at least one sublink in a section
  const hasAccessToSection = (link: (typeof NAV_LINKS)[number]) => {
    // Always show 'Hoy' (Dashboard)
    if (link.path === '/today') return true;

    if (link.sublinks) {
        // Check if user has permission for ANY of the sublinks
        return link.sublinks.some(sublink => {
            // Default to true if user has no permissions object (legacy support)
            if (!user.permissions || !user.permissions.pages) return true;

             // Special case for Configuración
            if (link.name === 'Configuración') {
                 if (user.permissions.pages['Configuración']) {
                     const pagePerms = user.permissions.pages['Configuración'][sublink.name];
                     // If permission is undefined (new page), allow it. If defined, check 'view'.
                     return pagePerms === undefined ? true : pagePerms.includes('view');
                 }
                 // If Configuración block is missing entirely, allow (new module)
                 return true; 
            }

            if (user.permissions.pages[link.name]) {
                const pagePerms = user.permissions.pages[link.name][sublink.name];
                // If permission is undefined (new page), allow it. If defined, check 'view'.
                return pagePerms === undefined ? true : pagePerms.includes('view');
            }
            
            // If the entire module is missing from user permissions, allow it (new module)
            return true;
        });
    }
    
    return true;
  };

  return (
    <div className="w-20 bg-indigo-950 flex-shrink-0 flex flex-col items-center py-4 relative z-50">
      <Link to="/" className="mb-6 flex-shrink-0">
        <img src="https://firebasestorage.googleapis.com/v0/b/ori-405da.firebasestorage.app/o/Logo%2FIMG_1043.png?alt=media&token=28b3c9f6-ebbc-4681-b604-3eae6dfa6bbc" alt="ORI Logo" className="w-8 h-auto" />
      </Link>
      <nav className="flex-1 flex flex-col items-center space-y-2 w-full px-2">
        {primaryNavLinks.map((link) => {
          if (link.isSeparator) return null;
          
          // Check permissions
          if (!hasAccessToSection(link)) return null;

          const targetPath = getTargetPath(link);
          const isActive = isLinkActive(link);
          
          return (
            <div key={link.name} className="relative group w-full flex items-center justify-center">
              <NavLink
                to={targetPath}
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl outline-none transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-indigo-300 hover:text-white'
                }`}
              >
                <div className={`
                    absolute inset-0 rounded-xl transition-colors duration-200
                    ${isActive ? 'bg-indigo-700' : 'group-hover:bg-indigo-700'}
                `}></div>

                <span className="material-symbols-outlined relative z-10">{link.icon}</span>
              </NavLink>

              {/* Clean, rectangular tooltip */}
              <div className={`
                  absolute left-full ml-4
                  bg-indigo-700 text-white text-sm font-semibold
                  px-3 py-2 rounded-lg shadow-lg whitespace-nowrap
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transform transition-all duration-200
                  -translate-x-2 group-hover:translate-x-0
                  pointer-events-none
              `}>
                  {link.name}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default PrimarySidebar;