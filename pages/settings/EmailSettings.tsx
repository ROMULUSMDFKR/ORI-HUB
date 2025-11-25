import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User } from '../../types';
import Spinner from '../../components/ui/Spinner';
import ManageUserEmailsDrawer from '../../components/settings/ManageUserEmailsDrawer';

const EmailSettings: React.FC = () => {
    const { data: users, loading } = useCollection<User>('users');
    const [managingUser, setManagingUser] = useState<User | null>(null);

    const uniqueUsers = React.useMemo(() => {
        if (!users) return [];
        const seen = new Set();
        return users.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, [users]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Cuentas de Correo y Firmas</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Conecta cuentas de correo para los usuarios y gestiona sus firmas de email.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {uniqueUsers.map(user => (
                            <li key={user.id} className="p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setManagingUser(user)}
                                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm text-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                                >
                                    Gestionar
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <ManageUserEmailsDrawer 
                user={managingUser}
                onClose={() => setManagingUser(null)}
            />
        </div>
    );
};

export default EmailSettings;
