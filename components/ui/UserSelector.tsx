import React, { useState, useMemo, useRef, useEffect } from 'react';
import Checkbox from './Checkbox';
import { User } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface UserSelectorProps {
    label: string;
    selectedUserIds: string[];
    onToggleUser: (userId: string) => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ label, selectedUserIds, onToggleUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: users } = useCollection<User>('users');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedUsers = useMemo(() =>
        (users || []).filter(u => selectedUserIds?.includes(u.id)),
        [selectedUserIds, users]
    );

    const filteredUsers = useMemo(() =>
        (users || []).filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
        [search, users]
    );

    return (
        <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <div className="mt-1 relative">
                <div 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="flex items-center gap-2 flex-wrap p-2 py-2 px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 cursor-pointer"
                    style={{ minHeight: '42px' }} // Same height as input
                >
                    {selectedUsers.length > 0 ? selectedUsers.map(user => (
                        <span key={user.id} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            {user.name}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleUser(user.id); }} 
                                className="ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >&times;</button>
                        </span>
                    )) : <span className="text-slate-500 dark:text-slate-400">Seleccionar...</span>}
                    <span className="material-symbols-outlined text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">unfold_more</span>
                </div>
                {isOpen && (
                    <div className="border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 absolute z-10 w-full">
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                            <input 
                                type="text" 
                                placeholder="Buscar usuario..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                className="w-full text-sm p-1.5 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700"
                            />
                        </div>
                        <ul className="max-h-48 overflow-y-auto">
                            {filteredUsers.map(user => (
                                <li key={user.id}>
                                    <Checkbox
                                        id={`user-selector-${label.replace(/\s+/g, '-')}-${user.id}`}
                                        checked={selectedUserIds?.includes(user.id)}
                                        onChange={() => onToggleUser(user.id)}
                                        className="w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                      <div className="flex items-center gap-2">
                                        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full"/>
                                        <span className="text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
                                      </div>
                                    </Checkbox>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserSelector;