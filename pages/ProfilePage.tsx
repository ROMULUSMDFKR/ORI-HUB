import React, { useState } from 'react';
import { MOCK_USERS } from '../data/mockData';

type ProfileTab = 'profile' | 'security' | 'emails' | 'notifications' | 'preferences';

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, required?: boolean, disabled?: boolean }> = ({ label, value, onChange, type = 'text', required=false, disabled=false }) => (
    <div>
        <label className="block text-sm font-medium text-on-surface-secondary">{label}{required && <span className="text-red-500">*</span>}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            disabled={disabled}
            className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
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
        { id: 'security', name: 'Seguridad', icon: 'lock' },
        { id: 'emails', name: 'Correos', icon: 'mail' },
        { id: 'notifications', name: 'Notificaciones', icon: 'notifications' },
        { id: 'preferences', name: 'Preferencias', icon: 'tune' },
    ];

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
                                <Input label="Puesto" value="Admin" onChange={() => {}} />
                                <Input label="Correo electrónico" value={user.email} onChange={() => {}} disabled />
                                <Input label="Teléfono" value="+52 55 1234 5678" onChange={() => {}} />
                                <Input label="Empresa" value="CRM Studio" onChange={() => {}} disabled />
                                <Input label="Fecha de Nacimiento" value="1990-01-01" onChange={() => {}} type="date"/>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                             <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Contraseña Actual" value="" onChange={() => {}} type="password"/>
                                <Input label="Nueva Contraseña" value="" onChange={() => {}} type="password"/>
                             </div>
                        </div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                            <h3 className="text-lg font-semibold mb-2">Autenticación de Dos Factores (2FA)</h3>
                            <Toggle label="Habilitar 2FA" description="Añade una capa extra de seguridad a tu cuenta." enabled={false} onToggle={() => {}} />
                        </div>
                         <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                            <h3 className="text-lg font-semibold mb-4">Sesiones Activas</h3>
                             <ul className="space-y-3">
                                <li className="flex items-center justify-between text-sm">
                                    <div>
                                        <p>Chrome en macOS - <span className="font-semibold text-green-600">Esta sesión</span></p>
                                        <p className="text-xs text-on-surface-secondary">Mexico City, MX - Hace 2 minutos</p>
                                    </div>
                                    <button className="text-xs font-semibold text-accent hover:underline">Cerrar Sesión</button>
                                </li>
                                 <li className="flex items-center justify-between text-sm">
                                    <div>
                                        <p>App Móvil en iPhone</p>
                                        <p className="text-xs text-on-surface-secondary">Guadalajara, MX - Hace 3 horas</p>
                                    </div>
                                    <button className="text-xs font-semibold text-accent hover:underline">Cerrar Sesión</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                );
            case 'emails':
                return (
                     <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
                        <h3 className="text-lg font-semibold mb-4">Configuración de Correo Electrónico</h3>
                        <p className="text-sm text-on-surface-secondary mb-4">Conecta tu cuenta de correo para enviar y recibir emails directamente desde el CRM.</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Servidor IMAP" value="imap.servidor.com" onChange={() => {}} />
                            <Input label="Puerto IMAP" value="993" onChange={() => {}} />
                            <Input label="Servidor SMTP" value="smtp.servidor.com" onChange={() => {}} />
                            <Input label="Puerto SMTP" value="465" onChange={() => {}} />
                            <Input label="Usuario" value={user.email} onChange={() => {}} />
                            <Input label="Contraseña" value="" onChange={() => {}} type="password"/>
                        </div>
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
                                <select className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                    <option>Español (México)</option>
                                    <option>English (US)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-secondary">Zona Horaria</label>
                                <select className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
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
                    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border">
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
