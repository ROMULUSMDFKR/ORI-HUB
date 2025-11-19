import React, { useState, useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, Group } from '../../types';
import ViewSwitcher, { ViewOption } from '../ui/ViewSwitcher';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';

const ChatSidebar: React.FC = () => {
    const { type, id } = useParams();
    const { data: usersData, loading: usersLoading } = useCollection<User>('users');
    const { data: groupsData, loading: groupsLoading } = useCollection<Group>('groups');
    const [view, setView] = useState<'dms' | 'groups'>('dms');
    
    const { user: currentUser } = useAuth();

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
        return <div className="w-64 bg-white dark:bg-slate-800 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center"><Spinner /></div>;
    }
    
    return (
        <div className="w-64 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
            <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
                <ViewSwitcher views={chatViews} activeView={view} onViewChange={(v) => setView(v as 'dms' | 'groups')} />
                {view === 'groups' && (
                    <button onClick={handleCreateGroup} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ml-2" title="Crear nuevo grupo">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">group_add</span>
                    </button>
                )}
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
                {view === 'dms' ? (
                    <ul>
                        {users.map(user => (
                            <li key={user.id}>
                                <NavLink to={`/communication/chat/user/${user.id}`} className={({ isActive }) => `flex items-center px-4 py-2 gap-3 transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul>
                        {groups.map(group => (
                            <li key={group.id}>
                                <NavLink to={`/communication/chat/group/${group.id}`} className={({ isActive }) => `flex items-center px-4 py-2 gap-3 transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-500">groups</span>
                                    </div>
                                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{group.name}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                )}
            </nav>
        </div>
    );
};

export default ChatSidebar;