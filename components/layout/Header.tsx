import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Notification } from '../../types';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import { api } from '../../api/firebaseApi';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_CONFIG: Record<UserStatus, { color: string; label: string }> = {
    online: { color: 'bg-green-500', label: 'En línea' },
    away: { color: 'bg-yellow-500', label: 'Ausente' },
    dnd: { color: 'bg-red-500', label: 'No molestar' },
    offline: { color: 'bg-gray-400', label: 'No conectado' },
};

const NOTIFICATION_ICONS: Record<Notification['type'], string> = {
    task: 'task_alt',
    message: 'chat',
    email: 'mail',
    system: 'settings_suggest',
};

const NotificationMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const { data: notifications } = useCollection<Notification>('notifications');

    const userNotifications = useMemo(() => {
        if (!notifications || !currentUser) return [];
        return notifications
            .filter(n => n.userId === currentUser.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [notifications, currentUser]);

    const unreadCount = useMemo(() => userNotifications.filter(n => !n.isRead).length, [userNotifications]);

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

    const markAllAsRead = async () => {
        const unreadIds = userNotifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;
        try {
            for (const id of unreadIds) {
                await api.updateDoc('notifications', id, { isRead: true });
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            try {
                await api.updateDoc('notifications', notification.id, { isRead: true });
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
        setIsOpen(false);
        navigate(notification.link);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800"></span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-sm">Notificaciones</h4>
                        <button onClick={markAllAsRead} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50" disabled={unreadCount === 0}>
                            Marcar como leídas
                        </button>
                    </div>
                    <ul className="py-1 max-h-80 overflow-y-auto">
                        {userNotifications.slice(0, 5).map(notif => (
                            <li key={notif.id}>
                                <button onClick={() => handleNotificationClick(notif)} className={`w-full text-left flex items-start p-3 hover:bg-slate-50 dark:hover:bg-slate-700 ${!notif.isRead ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
                                    <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400 mr-3 mt-1">{NOTIFICATION_ICONS[notif.type]}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{notif.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{notif.message}</p>
                                    </div>
                                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 ml-2 flex-shrink-0"></span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                     <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-center">
                        <Link to="/notifications" onClick={() => setIsOpen(false)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Ver todas
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserMenu: React.FC<{ user: User | null; onLogout: () => void; }> = ({ user, onLogout }) => {
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

    if (!user) {
        return null;
    }

    const userName = user.name || user.email || 'Usuario';
    const userRole = user.role || 'Miembro';

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                 <div className="relative">
                    <img className="h-8 w-8 rounded-full object-cover bg-slate-200" src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={userName} />
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[status].color} ring-2 ring-white dark:ring-slate-800`}></span>
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{userName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{userRole}</div>
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1">
                    <div className="px-4 py-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Estado</p>
                        <ul>
                            {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((key) => (
                                <li key={key}>
                                    <button onClick={() => handleSetStatus(key)} className="w-full text-left flex items-center px-2 py-1.5 text-sm rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[key].color} mr-3`}></span>
                                        {STATUS_CONFIG[key].label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="my-1 h-px bg-slate-200 dark:border-slate-700"></div>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined mr-3 text-base">person</span>
                        Mi Perfil
                    </Link>
                    <div className="my-1 h-px bg-slate-200 dark:border-slate-700"></div>
                    <button onClick={onLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <span className="material-symbols-outlined mr-3 text-base">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );
};


const Header: React.FC<{ user: User | null; onLogout: () => void; pageTitle?: string; }> = ({ user, onLogout, pageTitle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      showToast('info', `Buscando: "${searchQuery}" (funcionalidad en desarrollo)`);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0">
      {pageTitle && (
        <h1 className="text-2xl font-normal text-slate-800 dark:text-slate-200">{pageTitle}</h1>
      )}
      <div className="flex-1"></div> {/* Spacer */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center w-96 lg:w-[32rem] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-500">
          <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
            search
          </span>
          <input
            id="header-search"
            type="text"
            placeholder="Buscar prospectos, clientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none search-input-field"
          />
        </div>
        <NotificationMenu />
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
};

export default Header;