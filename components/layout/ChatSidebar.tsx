
import React, { useState, useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, Group } from '../../types';
import ViewSwitcher, { ViewOption } from '../ui/ViewSwitcher';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useChatNotifications } from '../../contexts/ChatContext';
import UserAvatar from '../ui/UserAvatar';

const ChatSidebar: React.FC = () => {
    const { type, id } = useParams();
    const { data: usersData, loading: usersLoading } = useCollection<User>('users');
    const { data: groupsData, loading: groupsLoading } = useCollection<Group>('groups');
    const [view, setView] = useState<'dms' | 'groups'>('dms');
    
    const { user: currentUser } = useAuth();
    const { unreadChats } = useChatNotifications();

    const users = useMemo(() => {
        if (!usersData || !currentUser) return [];
        return usersData.filter(u => u.id !== currentUser.id);
    }, [usersData, currentUser]);
    
    const groups = useMemo(() => {
        if(!groupsData) return [];
        return groupsData;
    }, [groupsData]);

    const handleCreateGroup = () => {
        console.log("Create new group");
    };

    const chatViews: ViewOption[] = [
        { id: 'dms', name: 'Directos', icon: 'person' },
        { id: 'groups', name: 'Grupos', icon: 'groups' },
    ];

    if (usersLoading || groupsLoading) {
        return (
            <div className="w-80 bg-white dark:bg-slate-800 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    
    return (
        <div className="w-80 bg-slate-50 dark:bg-slate-900 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 h-full">
            {/* Header del Sidebar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mensajes</h2>
                    {view === 'groups' && (
                        <button onClick={handleCreateGroup} className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors" title="Crear nuevo grupo">
                            <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                    )}
                </div>
                <ViewSwitcher views={chatViews} activeView={view} onViewChange={(v) => setView(v as 'dms' | 'groups')} />
            </div>

            {/* Lista de Chats */}
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                {view === 'dms' ? (
                    users.map(user => (
                        <NavLink 
                            key={user.id} 
                            to={`/communication/chat/user/${user.id}`} 
                            className={({ isActive }) => 
                                `group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`
                            }
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative">
                                    <UserAvatar user={user} size="md" className="ring-2 ring-white dark:ring-slate-800" />
                                    {/* Simulación de estado Online (aleatorio para demo visual, idealmente real) */}
                                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${Math.random() > 0.5 ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {user.nickname || user.name}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            {unreadChats.has(user.id) && (
                                <span className="flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                </span>
                            )}
                        </NavLink>
                    ))
                ) : (
                    groups.map(group => (
                        <NavLink 
                            key={group.id} 
                            to={`/communication/chat/group/${group.id}`} 
                            className={({ isActive }) => 
                                `group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`
                            }
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                                    <span className="material-symbols-outlined">groups</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {group.name}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {group.members.length} miembros
                                    </span>
                                </div>
                            </div>
                            {unreadChats.has(group.id) && (
                                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm"></span>
                            )}
                        </NavLink>
                    ))
                )}
            </nav>
        </div>
    );
};

export default ChatSidebar;
