import React, { useState, useMemo } from 'react';
import { MOCK_USERS, MOCK_AUDIT_LOGS } from '../data/mockData';
import { AuditLog } from '../types';

type ProfileTab = 'profile' | 'security' | 'emails' | 'notifications' | 'activity' | 'preferences';

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, disabled?: boolean }> = ({ label, value, onChange, type = 'text', required=false, disabled=false }) => (
    <div>
        <label className="block text-sm font-medium text-on-surface-secondary">{label}{required && <span className="text-red-500">*</span>}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            disabled={disabled}
            className="mt-1 block w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
        />
    </div>
);

const Toggle: React.FC<{ label: string; description: string; enabled: boolean; onToggle: (val: boolean) => void; }> = ({ label, description, enabled, onToggle }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
        <div>
            <p className="font-medium text-sm text-on-surface">{label}</p>
            <p className="text-xs text-on-surface-secondary">{description}</p>
        </div>
        <button type="button" onClick={() => onToggle(!enabled)} className={`${enabled ? 'bg-accent' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);


const ProfilePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
    const user = MOCK_USERS.natalia;

    const tabs: { id: ProfileTab; name: string; icon: string }[] = [
        { id: 'profile', name: 'Perfil', icon: 'person' },
        { id: 'activity', name: 'Actividad', icon: 'history' },
        { id: 'security', name: 'Seguridad', icon: 'lock' },
        { id: 'emails', name: 'Correos', icon: 'mail' },
        { id: 'notifications', name: 'Notificaciones', icon: 'notifications' },
        { id: 'preferences', name: 'Preferencias', icon: 'tune' },
    ];

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('es-MX', { month: 'long' }) })), []);
    const years = useMemo(() => Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i), []);
    const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);


    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                            <h3 className="text-lg font-semibold mb-4">Información General</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Nombre(s)" value="Natalia" onChange={() => {}} />
                                <Input label="Apellido(s)" value="V" onChange={() => {}} />
                                <Input label="Nombre a mostrar" value="Natalia" onChange={() => {}} />
                                <Input label="Puesto" value="Admin" onChange={() => {}} disabled />
                                <Input label="Correo electrónico" value={user.email} onChange={() => {}} disabled />
                                <Input label="Teléfono" value="+52 55 1234 5678" onChange={() => {}} />
                                <Input label="Empresa" value="CRM Studio" onChange={() => {}} disabled />
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-secondary">Fecha de Nacimiento</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                        <select className="w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                            <option>Día</option>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select className="w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                            <option>Mes</option>
                                            {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                        </select>
                                        <select className="w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                            <option>Año</option>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-on-surface-secondary">Biografía</label>
                                <textarea
                                    rows={4}
                                    placeholder="Escribe una breve descripción sobre ti..."
                                    className="mt-1 block w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'activity':
                 const userActivity = MOCK_AUDIT_LOGS.filter(log => log.by === user.id);
                return (
                     <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                        <h3 className="text-lg font-semibold mb-4">Registro de Actividad</h3>
                        <div className="flow-root">
                            <ul role="list" className="-mb-8 max-h-[600px] overflow-y-auto">
                                {userActivity.map((log, logIdx) => (
                                    <li key={log.id}>
                                        <div className="relative pb-8">
                                            {logIdx !== userActivity.length - 1 ? <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" /> : null}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                                        <span className="material-symbols-outlined text-gray-500 text-base">history</span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <p className="text-sm text-gray-500">
                                                        {log.action} en <span className="font-medium text-gray-900">{log.entity} ({log.entityId})</span>
                                                    </p>
                                                    <p className="whitespace-nowrap text-right text-sm text-gray-500">
                                                        <time dateTime={new Date(log.at).toISOString()}>{new Date(log.at).toLocaleDateString()}</time>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )
            case 'security':
                return (
                    <div className="space-y-6">
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                             <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
                             <div className="space-y-4">
                                <Input label="Contraseña Actual" value="" onChange={() => {}} type="password"/>
                                <Input label="Nueva Contraseña" value="" onChange={() => {}} type="password"/>
                                <Input label="Confirmar Nueva Contraseña" value="" onChange={() => {}} type="password"/>
                             </div>
                        </div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                            <h3 className="text-lg font-semibold mb-2">Autenticación de Dos Factores (2FA)</h3>
                            <Toggle label="Habilitar 2FA vía Email" description="Recibirás un código en tu correo para iniciar sesión." enabled={false} onToggle={() => {}} />
                        </div>
                         <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                            <h3 className="text-lg font-semibold mb-4">Sesiones Activas</h3>
                             <ul className="space-y-3">
                                <li className="flex items-center justify-between text-sm">
                                    <div>
                                        <p>Chrome en macOS - <span className="font-semibold text-green-600">Esta sesión</span></p>
                                        <p className="text-xs text-on-surface-secondary">Mexico City, MX - Hace 2 minutos</p>
                                    </div>
                                </li>
                                 <li className="flex items-center justify-between text-sm border-t pt-3 mt-3">
                                    <div>
                                        <p>App Móvil en iPhone 15 Pro</p>
                                        <p className="text-xs text-on-surface-secondary">Guadalajara, MX - Hace 3 horas</p>
                                    </div>
                                    <button className="text-xs font-semibold text-accent hover:underline">Cerrar Sesión</button>
                                </li>
                            </ul>
                             <div className="border-t mt-4 pt-4">
                                <button className="w-full text-center bg-gray-100 border border-gray-300 text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-200">
                                    Cerrar sesión en todos los demás dispositivos
                                </button>
                            </div>
                        </div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                             <h3 className="text-lg font-semibold mb-4">Política de Inicio de Sesión</h3>
                             <p className="text-sm text-on-surface-secondary mb-4">Estas son las políticas de seguridad para tu cuenta definidas por el administrador.</p>
                             <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold">5</p>
                                    <p className="text-xs text-on-surface-secondary">Intentos de inicio de sesión fallidos</p>
                                </div>
                                 <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold">15 min</p>
                                    <p className="text-xs text-on-surface-secondary">Tiempo de bloqueo de cuenta</p>
                                </div>
                             </div>
                        </div>
                    </div>
                );
            case 'emails':
                return (
                     <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Cuentas de Correo Conectadas</h3>
                                <p className="text-sm text-on-surface-secondary">Gestiona tus cuentas para enviar y recibir emails desde el CRM.</p>
                            </div>
                            <button className="bg-accent text-on-dark font-semibold py-2 px-3 rounded-lg flex items-center shadow-sm hover:opacity-90 text-sm">
                                <span className="material-symbols-outlined mr-1 text-base">add</span>
                                Añadir Cuenta
                            </button>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between text-sm p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold">{user.email}</p>
                                    <div className="flex items-center gap-2 text-xs text-green-700 mt-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Conectado
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-1 rounded-full text-on-surface-secondary hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button className="p-1 rounded-full text-on-surface-secondary hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </li>
                             <li className="flex items-center justify-between text-sm p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold">ventas@crmstudio.com</p>
                                    <div className="flex items-center gap-2 text-xs text-red-700 mt-1">
                                         <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        Error de autenticación
                                    </div>
                                </div>
                               <div className="flex gap-2">
                                    <button className="p-1 rounded-full text-on-surface-secondary hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button className="p-1 rounded-full text-on-surface-secondary hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </li>
                        </ul>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                        <h3 className="text-lg font-semibold mb-2">Preferencias de Notificación</h3>
                        <p className="text-sm text-on-surface-secondary mb-4">Elige cómo y cuándo quieres recibir notificaciones.</p>
                        <Toggle label="Notificaciones en la App" description="Recibir alertas dentro de la plataforma." enabled={true} onToggle={() => {}} />
                        <Toggle label="Notificaciones por Correo" description="Recibir un resumen de actividad por correo." enabled={true} onToggle={() => {}} />
                        <Toggle label="Nueva tarea asignada" description="Notificar cuando alguien te asigne una tarea." enabled={true} onToggle={() => {}} />
                        <Toggle label="Cambio en prospecto" description="Notificar cuando un prospecto que sigues cambie de etapa." enabled={false} onToggle={() => {}} />
                    </div>
                );
            case 'preferences':
                 return (
                     <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                        <h3 className="text-lg font-semibold mb-4">Preferencias de la Aplicación</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-on-surface-secondary">Idioma</label>
                                <select className="mt-1 block w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                    <option>Español (México)</option>
                                    <option>English (US)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-secondary">Zona Horaria</label>
                                <select className="mt-1 block w-full bg-white border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                    <option>(GMT-06:00) Central Time (US & Canada)</option>
                                    <option>(GMT-07:00) Mountain Time (US & Canada)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    }


    return (
        <div>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-on-surface">Mi Perfil</h1>
                <button className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2 text-base">save</span>
                    Guardar Cambios
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Navigation */}
                <div className="lg:col-span-1">
                    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border sticky top-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative group">
                                <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full object-cover" />
                                <button className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined">photo_camera</span>
                                </button>
                            </div>
                            <h2 className="font-bold text-lg mt-3">{user.name}</h2>
                            <p className="text-sm text-on-surface-secondary">{user.role}</p>
                        </div>
                        <nav className="mt-6 space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center p-3 rounded-lg text-left font-medium transition-colors duration-200 text-sm ${activeTab === tab.id ? 'bg-primary/20 text-accent' : 'hover:bg-background text-on-surface'}`}
                                >
                                    <span className="material-symbols-outlined mr-3 text-base">{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-3">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
