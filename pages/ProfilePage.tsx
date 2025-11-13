
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_USERS, MOCK_AUDIT_LOGS } from '../data/mockData';
import { AuditLog, Commission, CommissionStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import ToggleSwitch from '../components/ui/ToggleSwitch';

type ProfileTab = 'overview' | 'edit-profile' | 'security' | 'emails' | 'notifications' | 'preferences' | 'my-commissions';

interface ConnectedEmail {
  id: string;
  email: string;
  status: 'Conectado' | 'Error de autenticación';
}

const BannerModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (style: React.CSSProperties) => void; }> = ({ isOpen, onClose, onSelect }) => {
    const gradients = [
        'linear-gradient(to right, #ec4899, #8b5cf6)',
        'linear-gradient(to right, #d946ef, #22d3ee)',
        'linear-gradient(to right, #f59e0b, #ef4444)',
        'linear-gradient(to right, #10b981, #3b82f6)',
        'linear-gradient(to right, #6366f1, #ec4899)',
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700"><h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Cambiar Fondo del Perfil</h3></div>
                <div className="p-6">
                    <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Elige un gradiente</h4>
                    <div className="grid grid-cols-5 gap-3">
                        {gradients.map(grad => (
                            <button key={grad} onClick={() => onSelect({ backgroundImage: grad })} className="h-16 w-full rounded-lg" style={{ background: grad }}></button>
                        ))}
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">O sube tu propia imagen</p>
                        <button onClick={() => alert('Simulando subida de imagen...')} className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600">
                            Subir Imagen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Reusable Components (for functionality within tabs)
const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, disabled?: boolean, placeholder?: string }> = ({ label, value, onChange, type = 'text', required=false, disabled=false, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{label}{required && <span className="text-red-500">*</span>}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            disabled={disabled}
            placeholder={placeholder}
            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
        />
    </div>
);

const MyCommissionsTab: React.FC<{ userId: string }> = ({ userId }) => {
    const { data: commissions, loading } = useCollection<Commission>('commissions');

    const { userCommissions, pendingTotal, paidLast30Days } = useMemo(() => {
        if (!commissions) return { userCommissions: [], pendingTotal: 0, paidLast30Days: 0 };
        
        const userComms = commissions.filter(c => c.salespersonId === userId);
        
        const pending = userComms
            .filter(c => c.status === CommissionStatus.Pendiente)
            .reduce((sum, c) => sum + c.amount, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const paid = userComms
            .filter(c => c.status === CommissionStatus.Pagada && c.paidAt && new Date(c.paidAt) > thirtyDaysAgo)
            .reduce((sum, c) => sum + c.amount, 0);

        return { userCommissions: userComms, pendingTotal: pending, paidLast30Days: paid };
    }, [commissions, userId]);

    const columns = [
        { header: 'Orden de Venta', accessor: (c: Commission) => c.salesOrderId },
        { header: 'Monto', accessor: (c: Commission) => `$${c.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-semibold' },
        { header: 'Fecha', accessor: (c: Commission) => new Date(c.createdAt).toLocaleDateString() },
        { header: 'Estado', accessor: (c: Commission) => <Badge text={c.status} color={c.status === CommissionStatus.Pagada ? 'green' : 'yellow'} /> },
    ];
    
    if (loading) return <div className="py-12 flex justify-center"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pendiente de Pago</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">${pendingTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pagado (Últimos 30 días)</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">${paidLast30Days.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
            </div>
            <Table columns={columns} data={userCommissions} />
        </div>
    );
};

const NotificationSettings = () => {
    const [settings, setSettings] = useState({
        newTasks: { app: true, email: true },
        mentions: { app: true, email: true },
        dailySummary: { app: false, email: true },
        weeklyReport: { app: false, email: false },
    });

    const handleToggle = (key: keyof typeof settings, type: 'app' | 'email') => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], [type]: !prev[key][type] }
        }));
    };

    const notificationItems = [
        { key: 'newTasks', title: 'Nuevas Tareas', description: 'Cuando alguien te asigna una nueva tarea.' },
        { key: 'mentions', title: 'Menciones', description: 'Cuando alguien te menciona en un comentario.' },
        { key: 'dailySummary', title: 'Resumen Diario', description: 'Un resumen de tus tareas y actividades del día.' },
        { key: 'weeklyReport', title: 'Reporte Semanal', description: 'Un reporte de actividad y rendimiento del equipo.' },
    ];

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4">
                    <div className="grid grid-cols-3">
                        <div className="col-span-1"></div>
                        <div className="text-center font-semibold text-sm text-slate-500 dark:text-slate-400">En la App</div>
                        <div className="text-center font-semibold text-sm text-slate-500 dark:text-slate-400">Por Correo</div>
                    </div>
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {notificationItems.map(item => (
                        <li key={item.key} className="p-6 grid grid-cols-3 items-center">
                            <div className="col-span-1">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch enabled={settings[item.key as keyof typeof settings].app} onToggle={() => handleToggle(item.key as keyof typeof settings, 'app')} />
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch enabled={settings[item.key as keyof typeof settings].email} onToggle={() => handleToggle(item.key as keyof typeof settings, 'email')} />
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 p-6 flex justify-end">
                    <button onClick={() => alert('Preferencias de notificación guardadas.')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Preferencias
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConnectedEmailsTab = () => {
    const [connectedEmails, setConnectedEmails] = useState<ConnectedEmail[]>([
        { id: '1', email: 'david.r@crmstudio.com', status: 'Conectado' }
    ]);
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cuentas de Correo Conectadas</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sincroniza tus correos para gestionarlos desde la plataforma.</p>
                </div>
                <button className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-base">add</span>Conectar Cuenta</button>
            </div>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {connectedEmails.map(acc => (
                    <li key={acc.id} className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{acc.email}</p>
                            <Badge text={acc.status} color={acc.status === 'Conectado' ? 'green' : 'red'} />
                        </div>
                        <button className="text-red-600 hover:text-red-800 p-2 rounded-full"><span className="material-symbols-outlined text-base">delete</span></button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

const ProfilePage: React.FC = () => {
    const user = MOCK_USERS.david; // Using David as he is a sales person
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const [bannerStyle, setBannerStyle] = useState<React.CSSProperties>({ backgroundImage: 'linear-gradient(to right, #6366f1, #ec4899)' });
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('crm-theme-mode') || 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('crm-theme-mode', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('crm-theme-mode', 'light');
        }
    }, [theme]);

    const userActivity = MOCK_AUDIT_LOGS.filter(log => log.by === user.id).slice(0, 5);

    const tabs: { id: ProfileTab; name: string; icon: string, condition?: () => boolean }[] = [
        { id: 'overview', name: 'Resumen', icon: 'person' },
        { id: 'edit-profile', name: 'Editar Perfil', icon: 'edit' },
        { id: 'my-commissions', name: 'Mis Comisiones', icon: 'paid', condition: () => user.role === 'Ventas' },
        { id: 'security', name: 'Seguridad', icon: 'lock' },
        { id: 'preferences', name: 'Preferencias', icon: 'tune' },
        { id: 'notifications', name: 'Notificaciones', icon: 'notifications' },
        { id: 'emails', name: 'Cuentas Conectadas', icon: 'link' },
    ];

    return (
        <div className="space-y-6">
            <div className="h-48 rounded-xl relative group" style={bannerStyle}>
                <button 
                    onClick={() => setIsBannerModalOpen(true)}
                    className="absolute top-4 right-4 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <span className="material-symbols-outlined">edit</span>
                </button>
                <div className="absolute -bottom-12 left-8">
                    <div className="w-28 h-28 rounded-full border-4 border-slate-50 dark:border-slate-900 bg-slate-200 overflow-hidden">
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover"/>
                    </div>
                </div>
            </div>

            <div className="pt-14 px-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{user.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{user.role}</p>
                </div>
                {/* Add action button if needed */}
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 px-8" aria-label="Tabs">
                    {tabs.filter(tab => tab.condition ? tab.condition() : true).map(tab => (
                         <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)} 
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                            <span className="material-symbols-outlined text-base">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-2 md:p-4">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Actividad Reciente</h3>
                            <ul className="space-y-3">
                                {userActivity.map(log => (
                                    <li key={log.id} className="text-sm text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{log.action}</span> en {log.entity}
                                        <p className="text-xs">{new Date(log.at).toLocaleString()}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Información</h3>
                             <div className="space-y-3 text-sm">
                                <p><strong className="text-slate-500 dark:text-slate-400">Email:</strong> {user.email}</p>
                                <p><strong className="text-slate-500 dark:text-slate-400">Equipo:</strong> {user.teamId}</p>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'edit-profile' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Input label="Nombre" value={user.name} onChange={() => {}} />
                           <Input label="Email" value={user.email} onChange={() => {}} disabled/>
                           <Input label="Título / Rol" value={user.role} onChange={() => {}} />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => alert('Guardando cambios... (simulación)')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                        </div>
                    </div>
                )}
                 {activeTab === 'my-commissions' && <MyCommissionsTab userId={user.id} />}
                 {activeTab === 'security' && (
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
                        <div className="space-y-4 max-w-sm">
                           <Input label="Contraseña Actual" type="password" value="" onChange={() => {}} />
                           <Input label="Nueva Contraseña" type="password" value="" onChange={() => {}} />
                           <Input label="Confirmar Nueva Contraseña" type="password" value="" onChange={() => {}} />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => alert('Actualizando contraseña... (simulación)')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Actualizar Contraseña</button>
                        </div>
                    </div>
                 )}
                {activeTab === 'preferences' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Tema de la Aplicación</h3>
                        <div className="flex items-center justify-between mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">Modo Oscuro</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Ideal para trabajar de noche.</p>
                            </div>
                            <ToggleSwitch enabled={theme === 'dark'} onToggle={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} />
                        </div>
                    </div>
                )}
                 {activeTab === 'notifications' && <NotificationSettings />}
                 {activeTab === 'emails' && <ConnectedEmailsTab />}
            </div>

            <BannerModal isOpen={isBannerModalOpen} onClose={() => setIsBannerModalOpen(false)} onSelect={setBannerStyle} />
        </div>
    );
};

export default ProfilePage;