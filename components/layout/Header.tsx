

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_USERS } from '../../data/mockData';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_CONFIG: Record<UserStatus, { color: string; label: string }> = {
    online: { color: 'bg-green-500', label: 'En línea' },
    away: { color: 'bg-yellow-500', label: 'Ausente' },
    dnd: { color: 'bg-red-500', label: 'No molestar' },
    offline: { color: 'bg-gray-400', label: 'No conectado' },
};


const UserMenu: React.FC = () => {
    const user = MOCK_USERS.natalia;
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<UserStatus>('online');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSetStatus = (newStatus: UserStatus) => {
        setStatus(newStatus);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-background">
                 <div className="relative">
                    <img className="h-8 w-8 rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[status].color} ring-2 ring-surface`}></span>
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-on-surface">{user.name}</div>
                    <div className="text-xs text-on-surface-secondary">{user.role}</div>
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg z-20 border border-border py-1">
                    <div className="px-4 py-2">
                        <p className="text-xs text-on-surface-secondary">Estado</p>
                        <ul>
                            {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((key) => (
                                <li key={key}>
                                    <button onClick={() => handleSetStatus(key)} className="w-full text-left flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-background">
                                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[key].color} mr-3`}></span>
                                        {STATUS_CONFIG[key].label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="my-1 h-px bg-border"></div>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-on-surface-secondary hover:bg-background">
                        <span className="material-symbols-outlined mr-3 text-base">person</span>
                        Mi Perfil
                    </Link>
                    <div className="my-1 h-px bg-border"></div>
                    <button onClick={() => setIsOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <span className="material-symbols-outlined mr-3 text-base">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );
};


const Header: React.FC = () => {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-secondary pointer-events-none">
            search
          </span>
          <input
            id="header-search"
            type="text"
            placeholder="Buscar prospectos, clientes..."
            className="w-80 lg:w-96 pl-10 pr-4 py-2 text-sm bg-background text-on-surface placeholder-on-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-background">
            <span className="material-symbols-outlined text-on-surface-secondary">notifications</span>
        </button>
         <Link to="/settings" className="p-2 rounded-full hover:bg-background">
            <span className="material-symbols-outlined text-on-surface-secondary">settings</span>
        </Link>
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;