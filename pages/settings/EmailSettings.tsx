
import React from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { User, ConnectedEmailAccount } from '../../types';
import Spinner from '../../components/ui/Spinner';

const EmailSettings: React.FC = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: accounts, loading: accountsLoading } = useCollection<ConnectedEmailAccount>('connectedAccounts');

    const loading = usersLoading || accountsLoading;

    const uniqueUsers = React.useMemo(() => {
        if (!users) return [];
        const seen = new Set();
        return users.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, [users]);

    const getAccountCount = (userId: string) => {
        return accounts?.filter(a => a.userId === userId).length || 0;
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Spinner /></div>;
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Cuentas de Correo</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                        Administra la conectividad y firmas de correo para cada miembro de tu organización.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uniqueUsers.map(user => {
                    const accountCount = getAccountCount(user.id);
                    return (
                        <Link 
                            key={user.id} 
                            to={`/settings/email-accounts/${user.id}`}
                            className="group block bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <img 
                                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                                    alt={user.name} 
                                    className="w-16 h-16 rounded-full object-cover border-4 border-slate-50 dark:border-slate-700 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 transition-colors" 
                                />
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {user.role}
                                </span>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {user.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-4">
                                    {user.email}
                                </p>
                                
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                    {accountCount > 0 ? (
                                        <span className="flex h-3 w-3 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                    ) : (
                                        <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    )}
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {accountCount} {accountCount === 1 ? 'cuenta conectada' : 'cuentas conectadas'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default EmailSettings;
