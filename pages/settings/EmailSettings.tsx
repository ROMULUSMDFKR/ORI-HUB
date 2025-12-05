import React, { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User, ConnectedEmailAccount } from '../../types';
import Spinner from '../../components/ui/Spinner';
import ManageUserEmailsDrawer from '../../components/settings/ManageUserEmailsDrawer';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';

// KPI Card following "App Icon Pattern"
const EmailKpiCard: React.FC<{ title: string; value: number | string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const EmailSettings: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: accounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [filter, setFilter] = useState('');

    const loading = usersLoading || accountsLoading;

    const stats = useMemo(() => {
        if (!users || !accounts) return { totalUsers: 0, connectedUsers: 0, totalAccounts: 0 };
        const userIdsWithAccounts = new Set(accounts.map(a => a.userId));
        return {
            totalUsers: users.length,
            connectedUsers: userIdsWithAccounts.size,
            totalAccounts: accounts.length
        };
    }, [users, accounts]);

    const enrichedUsers = useMemo(() => {
        if (!users) return [];
        return users.map(user => {
            const userAccounts = accounts?.filter(acc => acc.userId === user.id) || [];
            return {
                ...user,
                accountCount: userAccounts.length,
                hasConnectionError: userAccounts.some(acc => acc.status === 'Error de autenticación')
            };
        }).filter(u => 
            u.name.toLowerCase().includes(filter.toLowerCase()) || 
            u.email.toLowerCase().includes(filter.toLowerCase())
        );
    }, [users, accounts, filter]);

    const columns = [
        {
            header: 'Usuario',
            accessor: (user: User & { accountCount: number }) => (
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 overflow-hidden">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-xs font-bold">{user.name.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Cuentas Conectadas',
            accessor: (user: User & { accountCount: number }) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{user.accountCount}</span>
                    {user.accountCount > 0 && (
                        <span className="text-xs text-slate-400">cuentas</span>
                    )}
                </div>
            )
        },
        {
            header: 'Estado',
            accessor: (user: User & { accountCount: number; hasConnectionError: boolean }) => {
                if (user.accountCount === 0) return <Badge text="Sin configurar" color="gray" />;
                if (user.hasConnectionError) return <Badge text="Error de conexión" color="red" />;
                return <Badge text="Conectado" color="green" />;
            }
        },
        {
            header: 'Acciones',
            accessor: (user: User) => (
                <div className="flex justify-end">
                    <button
                        onClick={() => setManagingUser(user)}
                        className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">settings</span>
                        <span className="text-sm font-medium">Gestionar</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Gestiona las conexiones IMAP/SMTP y firmas para los usuarios de la organización.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <EmailKpiCard title="Usuarios Totales" value={stats.totalUsers} icon="group" color="indigo" />
                <EmailKpiCard title="Usuarios Conectados" value={stats.connectedUsers} icon="mark_email_read" color="emerald" />
                <EmailKpiCard title="Total Cuentas" value={stats.totalAccounts} icon="mail" color="blue" />
            </div>

            {/* List */}
            <div className="space-y-4">
                {/* Input Safe Pattern for Search */}
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={enrichedUsers} />
                </div>
            </div>
            
            <ManageUserEmailsDrawer 
                user={managingUser}
                onClose={() => setManagingUser(null)}
            />
        </div>
    );
};

export default EmailSettings;