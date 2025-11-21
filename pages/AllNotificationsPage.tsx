
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';
import { api } from '../api/firebaseApi';

const AllNotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const { data: notifications, loading } = useCollection<Notification>('notifications');
    const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (notifications) {
            setLocalNotifications(notifications);
        }
    }, [notifications]);

    const userNotifications = useMemo(() => {
        if (!localNotifications || !user) return [];
        return localNotifications
            .filter(n => n.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [localNotifications, user]);

    const unreadCount = useMemo(() => userNotifications.filter(n => !n.isRead).length, [userNotifications]);
    
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        userNotifications.forEach(n => {
            const nDate = new Date(n.createdAt);
            const nDay = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate());
            
            let groupKey = nDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

            if (nDay.getTime() === today.getTime()) {
                groupKey = 'Hoy';
            } else if (nDay.getTime() === yesterday.getTime()) {
                groupKey = 'Ayer';
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(n);
        });
        return groups;
    }, [userNotifications]);

    const notificationGroupTitles = Object.keys(groupedNotifications);

    const NOTIFICATION_ICONS: Record<Notification['type'], string> = {
        task: 'task_alt',
        message: 'chat',
        email: 'mail',
        system: 'settings_suggest',
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        setLocalNotifications(prev => prev.map(n => n.userId === user?.id ? { ...n, isRead: true } : n));
        
        // API Update
        const unread = userNotifications.filter(n => !n.isRead);
        try {
            await Promise.all(unread.map(n => api.updateDoc('notifications', n.id, { isRead: true })));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleMarkOneRead = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Optimistic update
        setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

        try {
            await api.updateDoc('notifications', id, { isRead: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Todas las Notificaciones</h1>
                {unreadCount > 0 && (
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Marcar todas como leídas
                    </button>
                )}
            </div>
            
            {notificationGroupTitles.length > 0 ? (
                <div className="space-y-8">
                    {notificationGroupTitles.map((groupTitle) => {
                        const groupNotifications = groupedNotifications[groupTitle];
                        return (
                            <div key={groupTitle}>
                                <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">{groupTitle}</h2>
                                <ul className="space-y-2">
                                    {groupNotifications.map(n => (
                                        <li key={n.id} className="relative group">
                                            <Link to={n.link} className={`block p-4 rounded-lg transition-colors ${n.isRead ? 'bg-white dark:bg-slate-800' : 'bg-indigo-50 dark:bg-indigo-900/50'} hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 pr-12`}>
                                                <div className="flex items-start gap-4">
                                                    <span className="material-symbols-outlined text-indigo-500 mt-1">{NOTIFICATION_ICONS[n.type]}</span>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">{n.message}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('es-ES')}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                            {!n.isRead && (
                                                <button 
                                                    onClick={(e) => handleMarkOneRead(e, n.id)}
                                                    className="absolute top-4 right-4 w-3 h-3 bg-indigo-500 rounded-full hover:ring-4 hover:ring-indigo-200 dark:hover:ring-indigo-900 transition-all shadow-sm"
                                                    title="Marcar como leída"
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-slate-400">notifications_off</span>
                    <p className="mt-4 font-semibold text-slate-700 dark:text-slate-300">No tienes notificaciones</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Las nuevas alertas aparecerán aquí.</p>
                </div>
            )}
        </div>
    );
};
export default AllNotificationsPage;
