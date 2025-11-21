


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuditLog, Commission, CommissionStatus, ConnectedEmailAccount, User } from '../types';
import { useCollection } from '../hooks/useCollection';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { api } from '../api/firebaseApi';
import CustomSelect from '../components/ui/CustomSelect';
import { COUNTRIES } from '../constants';
import ImageCropperModal from '../components/ui/ImageCropperModal';
import { useToast } from '../hooks/useToast';

interface ProfilePageProps {
  user: User;
  refreshUser: () => void;
}

type ProfileTab = 'overview' | 'edit-profile' | 'my-commissions' | 'security' | 'preferences' | 'notifications' | 'connected-accounts';

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
            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-200/50 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed" 
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

const ConnectedAccountsTab: React.FC<{ userId: string }> = ({ userId }) => {
    const { data: allAccounts, loading } = useCollection<ConnectedEmailAccount>('connectedAccounts');
    const { showToast } = useToast();
    
    const userAccounts = useMemo(() => {
        if (!allAccounts) return [];
        return allAccounts.filter(acc => acc.userId === userId);
    }, [allAccounts, userId]);

    const handleCheckStatus = async (accountId: string) => {
        showToast('info', 'Verificando conexión...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate checking
        try {
            // Simulate varying success
            const isSuccess = Math.random() > 0.2; 
            const newStatus = isSuccess ? 'Conectado' : 'Error de autenticación';
            
            await api.updateDoc('connectedAccounts', accountId, { status: newStatus });
            
            if (isSuccess) {
                showToast('success', 'Conexión verificada exitosamente.');
            } else {
                showToast('error', 'Error de autenticación. Revisa tus credenciales.');
            }
        } catch (e) {
            showToast('error', 'Error al verificar el estado de la cuenta.');
        }
    };

    const getStatusColor = (status: ConnectedEmailAccount['status']) => {
        switch(status) {
            case 'Conectado': return 'green';
            case 'Error de autenticación': return 'red';
            case 'Desconectado': return 'gray';
            default: return 'gray';
        }
    }

    if(loading) return <div className="py-12 flex justify-center"><Spinner /></div>

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cuentas de Correo Conectadas</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Estas cuentas son gestionadas por un administrador.</p>
            </div>
            {userAccounts.length > 0 ? (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {userAccounts.map(acc => (
                        <li key={acc.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{acc.email}</p>
                                <Badge text={acc.status} color={getStatusColor(acc.status)} />
                            </div>
                            <button 
                                onClick={() => handleCheckStatus(acc.id)}
                                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Revisar Estado
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-6">No tienes cuentas de correo conectadas.</p>
            )}
        </div>
    )
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, refreshUser }) => {
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const [bannerStyle, setBannerStyle] = useState<React.CSSProperties>({ backgroundImage: 'linear-gradient(to right, #6366f1, #ec4899)' });
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const { data: auditLogs } = useCollection<AuditLog>('auditLogs');
    const [editedUser, setEditedUser] = useState<Partial<User>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);


    useEffect(() => {
        if (user) {
            setEditedUser({
                fullName: user.fullName || user.name || '',
                nickname: user.nickname || '',
                phone: user.phone || '',
                birthday: user.birthday || '',
                interests: user.interests || '',
                country: user.country || '',
            });
        }
    }, [user]);

    const handleFieldChange = (field: keyof typeof editedUser, value: string) => {
        setEditedUser(prev => ({...prev, [field]: value }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await api.updateDoc('users', user.id, editedUser);
            refreshUser();
            alert('Perfil actualizado con éxito.');
        } catch (error) {
            alert('Error al guardar los cambios.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob | null) => {
        setIsCropperOpen(false);
        if (!croppedBlob || !user) return;

        const file = new File([croppedBlob], "avatar.png", { type: "image/png" });
        setIsUploadingAvatar(true);
        try {
            const downloadURL = await api.uploadFile(file, `avatars/${user.id}`);
            await api.updateDoc('users', user.id, { avatarUrl: downloadURL });
            refreshUser();
            alert('Foto de perfil actualizada.');
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("No se pudo actualizar la foto de perfil.");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // Initialize theme state from user profile, local storage, or default
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (user.theme) return user.theme;
        const localTheme = localStorage.getItem('crm-theme-mode');
        return (localTheme === 'dark' || localTheme === 'light') ? localTheme : 'light';
    });

    // When user prop updates (e.g., initial load), sync local state
    useEffect(() => {
        if (user.theme) {
            setTheme(user.theme);
        }
    }, [user.theme]);

    const handleThemeToggle = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme); // Optimistic update

        // Apply visual change immediately (though App.tsx useEffect handles this too, this ensures instant feedback)
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('crm-theme-mode', newTheme);

        // Persist to DB
        try {
            await api.updateDoc('users', user.id, { theme: newTheme });
            refreshUser(); // Notify global app state
        } catch (error) {
            console.error("Failed to save theme preference", error);
            // Revert logic could be added here if critical
        }
    };


    const userActivity = useMemo(() => {
        if (!user || !auditLogs) return [];
        return auditLogs.filter(log => log.by === user.id).slice(0, 5);
    }, [user, auditLogs]);

    const tabs: { id: ProfileTab; name: string; icon: string, condition?: () => boolean }[] = [
        { id: 'overview', name: 'Resumen', icon: 'person' },
        { id: 'edit-profile', name: 'Editar Perfil', icon: 'edit' },
        { id: 'my-commissions', name: 'Mis Comisiones', icon: 'paid', condition: () => user?.role === 'Ventas' },
        { id: 'security', name: 'Seguridad', icon: 'lock' },
        { id: 'preferences', name: 'Preferencias', icon: 'tune' },
        { id: 'notifications', name: 'Notificaciones', icon: 'notifications' },
        { id: 'connected-accounts', name: 'Cuentas Conectadas', icon: 'link' },
    ];

    if (!user) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="h-48 rounded-xl relative group" style={bannerStyle}>
                    <button 
                        onClick={() => setIsBannerModalOpen(true)}
                        className="absolute top-4 right-4 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <div className="absolute -bottom-12 left-8">
                        <input
                            type="file"
                            accept="image/png, image/jpeg"
                            ref={avatarInputRef}
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <div 
                            className="w-28 h-28 rounded-full border-4 border-slate-50 dark:border-slate-900 bg-slate-200 overflow-hidden relative group/avatar cursor-pointer"
                            onClick={handleAvatarClick}
                            title="Cambiar foto de perfil"
                        >
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                {isUploadingAvatar ? (
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-white">edit</span>
                                )}
                            </div>
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
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}
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
                                            <p className="text-xs">{new Date(log.at.toDate()).toLocaleString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Información</h3>
                                <div className="space-y-3 text-sm">
                                    <p><strong className="text-slate-500 dark:text-slate-400">Email:</strong> {user.email}</p>
                                    <p><strong className="text-slate-500 dark:text-slate-400">Teléfono:</strong> {user.phone || 'No especificado'}</p>
                                    <p><strong className="text-slate-500 dark:text-slate-400">Equipo:</strong> {user.teamId}</p>
                                    <p><strong className="text-slate-500 dark:text-slate-400">Apodo:</strong> {user.nickname || 'N/A'}</p>
                                    <p><strong className="text-slate-500 dark:text-slate-400">Cumpleaños:</strong> {user.birthday ? new Date(user.birthday + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                                    <p><strong className="text-slate-500 dark:text-slate-400">Intereses:</strong> {user.interests || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'edit-profile' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Nombre Completo" value={editedUser.fullName || ''} onChange={(val) => handleFieldChange('fullName', val)} placeholder="Tu nombre legal" />
                            <Input label="Apodo" value={editedUser.nickname || ''} onChange={(val) => handleFieldChange('nickname', val)} placeholder="Como te gusta que te digan" />
                            <Input label="Email" value={user.email} onChange={() => {}} disabled/>
                            <Input label="Teléfono" value={editedUser.phone || ''} onChange={(val) => handleFieldChange('phone', val)} />
                            <Input label="Título / Rol" value={user.role} onChange={() => {}} disabled />
                            <Input label="Fecha de Cumpleaños" type="date" value={editedUser.birthday || ''} onChange={(val) => handleFieldChange('birthday', val)} />
                            <CustomSelect label="País" options={COUNTRIES} value={editedUser.country || ''} onChange={(val) => handleFieldChange('country', val)} placeholder="Selecciona tu país..." />
                            </div>
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Intereses</label>
                                <textarea rows={3} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-lg p-2 text-sm" value={editedUser.interests || ''} onChange={(e) => handleFieldChange('interests', e.target.value)}/>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button 
                                    onClick={handleSaveChanges} 
                                    disabled={isSaving}
                                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center disabled:opacity-50"
                                >
                                    {isSaving && <span className="material-symbols-outlined animate-spin mr-2 !text-base">progress_activity</span>}
                                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
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
                                <ToggleSwitch enabled={theme === 'dark'} onToggle={handleThemeToggle} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'notifications' && <NotificationSettings />}
                    {activeTab === 'connected-accounts' && <ConnectedAccountsTab userId={user.id} />}
                </div>

                <BannerModal isOpen={isBannerModalOpen} onClose={() => setIsBannerModalOpen(false)} onSelect={setBannerStyle} />
            </div>
            {imageToCrop && (
                <ImageCropperModal
                    isOpen={isCropperOpen}
                    onClose={() => setIsCropperOpen(false)}
                    imageSrc={imageToCrop}
                    onCrop={handleCropComplete}
                />
            )}
        </>
    );
};

export default ProfilePage;