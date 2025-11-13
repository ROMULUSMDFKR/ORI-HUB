
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MOCK_USERS } from '../../data/mockData';
import Checkbox from './Checkbox';
import { User } from '../../types';

interface UserSelectorProps {
    label: string;
    selectedUserIds: string[];
    onToggleUser: (userId: string) => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ label, selectedUserIds, onToggleUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

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
        uniqueUsers.filter(u => selectedUserIds?.includes(u.id)),
        [selectedUserIds, uniqueUsers]
    );

    const filteredUsers = useMemo(() =>
        uniqueUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
        [search, uniqueUsers]
    );

    return (
        <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="mt-1 relative">
                <div 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="flex items-center gap-2 flex-wrap p-2 py-2 px-3 border border-border rounded-md bg-surface-inset cursor-pointer"
                    style={{ minHeight: '42px' }} // Same height as input
                >
                    {selectedUsers.length > 0 ? selectedUsers.map(user => (
                        <span key={user.id} className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            {user.name}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleUser(user.id); }} 
                                className="ml-1 text-gray-500 hover:text-gray-800"
                            >&times;</button>
                        </span>
                    )) : <span className="text-on-surface-secondary">Seleccionar...</span>}
                    <span className="material-symbols-outlined text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">unfold_more</span>
                </div>
                {isOpen && (
                    <div className="border bg-surface rounded-md shadow-lg mt-1 absolute z-10 w-full">
                        <div className="p-2 border-b border-border">
                            <input 
                                type="text" 
                                placeholder="Buscar usuario..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                className="w-full text-sm p-1.5 border border-border rounded-md focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <ul className="max-h-48 overflow-y-auto">
                            {filteredUsers.map(user => (
                                <li key={user.id}>
                                    <Checkbox
                                        id={`user-selector-${label.replace(/\s+/g, '-')}-${user.id}`}
                                        checked={selectedUserIds?.includes(user.id)}
                                        onChange={() => onToggleUser(user.id)}
                                        className="w-full p-2 hover:bg-background"
                                    >
                                      <div className="flex items-center gap-2">
                                        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full"/>
                                        <span className="text-sm">{user.name}</span>
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
