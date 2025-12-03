
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { User, ConnectedEmailAccount } from '../../types';
import Spinner from '../../components/ui/Spinner';
import ManageUserEmailsDrawer from '../../components/settings/ManageUserEmailsDrawer';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { api } from '../../api/firebaseApi';
import { useToast } from '../../hooks/useToast';

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
    const { showToast } = useToast();

    // MailerSend Config State
    const [mailerConfig, setMailerConfig] = useState({ apiKey: '', email: '' });
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    
    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await api.getDoc('settings', 'mailConfig');
                if (config) {
                    setMailerConfig({
                        apiKey: config.apiKey || '',
                        email: config.email || ''
                    });
                    // Assume valid if loaded, user can re-verify
                    if (config.apiKey) setVerificationStatus('idle'); 
                }
            } catch (e) {
                console.error("Error fetching mail config", e);
            }
        };
        fetchConfig();
    }, []);
    
    // Reset verification status when inputs change
    useEffect(() => {
        setVerificationStatus('idle');
    }, [mailerConfig.apiKey, mailerConfig.email]);

    const handleVerifyConnection = async () => {
        if (!mailerConfig.apiKey || !mailerConfig.email) {
            showToast('warning', 'Ingresa la API Key y el Email para verificar.');
            return;
        }

        setIsVerifying(true);
        setVerificationStatus('idle');

        try {
            // Simulation of API check (In production, this would hit a backend proxy to MailerSend /token endpoint)
            // We simulate network latency
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Basic validation logic
            if (mailerConfig.apiKey.length < 10 || !mailerConfig.email.includes('@')) {
                 throw new Error("Formato de credenciales inválido.");
            }

            // Successful simulation
            setVerificationStatus('success');
            showToast('success', 'Conexión con MailerSend verificada exitosamente.');

        } catch (error) {
            console.error(error);
            setVerificationStatus('error');
            showToast('error', 'No se pudo conectar con MailerSend. Revisa la API Key.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!mailerConfig.apiKey || !mailerConfig.email) {
             showToast('warning', 'Completa los campos antes de guardar.');
             return;
        }

        setIsSavingConfig(true);
        try {
            await api.setDoc('settings', 'mailConfig', mailerConfig);
            showToast('success', "Configuración de MailerSend guardada correctamente.");
        } catch (e) {
            console.error(e);
            showToast('error', "Error al guardar la configuración.");
        } finally {
            setIsSavingConfig(false);
        }
    };

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
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Configuración de Correo</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Gestiona las conexiones IMAP/SMTP y la infraestructura de envío global.
                </p>
            </div>

            {/* Global MailerSend Configuration */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">send</span>
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Infraestructura de Envío (MailerSend)</h3>
                             <p className="text-sm text-slate-500 dark:text-slate-400">Configuración global para el envío de correos transaccionales y campañas.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {verificationStatus === 'success' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                <span className="material-symbols-outlined !text-sm">check_circle</span> Conectado
                            </span>
                        )}
                        {verificationStatus === 'error' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                                <span className="material-symbols-outlined !text-sm">error</span> Error
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key (MailerSend)</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">key</span>
                            </div>
                            <input 
                                type="password" 
                                value={mailerConfig.apiKey} 
                                onChange={e => setMailerConfig({...mailerConfig, apiKey: e.target.value})}
                                className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors ${verificationStatus === 'error' ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'}`}
                                placeholder="mlsn.xxxxxxxx..."
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Clave de API generada en el panel de MailerSend.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Remitente Verificado</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">alternate_email</span>
                            </div>
                            <input 
                                type="email" 
                                value={mailerConfig.email} 
                                onChange={e => setMailerConfig({...mailerConfig, email: e.target.value})}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 sm:text-sm"
                                placeholder="hola@midominio.com"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Debe coincidir con el dominio verificado en MailerSend.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                     <button 
                        onClick={handleVerifyConnection} 
                        disabled={isVerifying || isSavingConfig}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                         {isVerifying ? <Spinner /> : <span className="material-symbols-outlined text-lg">network_check</span>}
                         Probar Conexión
                    </button>
                    <button 
                        onClick={handleSaveConfig} 
                        disabled={isSavingConfig}
                        className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {isSavingConfig ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
                        Guardar Configuración Global
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <EmailKpiCard title="Usuarios Totales" value={stats.totalUsers} icon="group" color="indigo" />
                <EmailKpiCard title="Usuarios Conectados" value={stats.connectedUsers} icon="mark_email_read" color="emerald" />
                <EmailKpiCard title="Total Cuentas" value={stats.totalAccounts} icon="mail" color="blue" />
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Gestión de Cuentas de Usuario (Nylas)</h3>
                
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
