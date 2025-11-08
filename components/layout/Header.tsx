

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_USERS } from '../../data/mockData';

const UserMenu: React.FC = () => {
    const user = MOCK_USERS.natalia;
    const [isOpen, setIsOpen] = useState(false);
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-background">
                <img className="h-8 w-8 rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-on-surface">{user.name}</div>
                    <div className="text-xs text-on-surface-secondary">{user.role}</div>
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg z-20 border border-border py-1">
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
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-secondary">search</span>
          <input
            type="text"
            placeholder="Buscar prospectos, clientes..."
            className="w-full md:w-64 lg:w-96 pl-10 pr-4 py-2 text-sm bg-background text-on-surface placeholder-on-surface-secondary border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
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