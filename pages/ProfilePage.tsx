import React, { useState, useMemo } from 'react';
import { MOCK_USERS, MOCK_AUDIT_LOGS } from '../data/mockData';
import { AuditLog } from '../types';

type ProfileTab = 'overview' | 'edit-profile' | 'security' | 'emails' | 'notifications' | 'preferences';

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
            <div className="bg-surface rounded-xl shadow-2xl m-4 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h3 className="text-xl font-bold">Cambiar Fondo del Perfil</h3></div>
                <div className="p-6">
                    <h4 className="font-semibold mb-3">Elige un gradiente</h4>
                    <div className="grid grid-cols-5 gap-3">
                        {gradients.map(grad => (
                            <button key={grad} onClick={() => onSelect({ backgroundImage: grad })} className="h-16 w-full rounded-lg" style={{ background: grad }}></button>
                        ))}
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-sm text-on-surface-secondary mb-2">O sube tu propia imagen</p>
                        <button onClick={() => alert('Simulando subida de imagen...')} className="bg-surface-inset border border-border font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-200">
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
        <label className="block text-sm font-medium text-on-surface-secondary">{label}{required && <span className="text-red-500">*</span>}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            disabled={disabled}
            placeholder={placeholder}
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

const EmailConnectionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (email: string) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [account, setAccount] = useState({
        email: '', password: '', imapServer: '', imapPort: '993', imapSsl: true,
        smtpServer: '', smtpPort: '465', smtpSsl: true
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleFieldChange = (field: string, value: string | boolean) => {
        setAccount(prev => ({ ...prev, [field]: value }));
        setTestStatus('idle');
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (account.email.includes('@') && account.password) setTestStatus('success'); else setTestStatus('error');
        setIsTesting(false);
    };

    const handleSave = () => { if (testStatus === 'success') { onSave(account.email); onClose(); } };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" onClick={onClose}>
            <div className="bg-surface rounded-xl shadow-2xl m-4 w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border"><h3 className="text-xl font-bold">Añadir Cuenta de Correo</h3><p className="text-sm text-on-surface-secondary mt-1">Configura tu cuenta IMAP/SMTP.</p></div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Dirección de Correo" value={account.email} onChange={v => handleFieldChange('email', v)} placeholder="tu@email.com"/><Input label="Contraseña" value={account.password} onChange={v => handleFieldChange('password', v)} type="password" /></div>
                    <div className="border-t border-border pt-4 space-y-4"><h4 className="font-semibold">Configuración IMAP (Entrada)</h4><div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Input label="Servidor IMAP" value={account.imapServer} onChange={v => handleFieldChange('imapServer', v)} placeholder="imap.servidor.com" /></div><Input label="Puerto" value={account.imapPort} onChange={v => handleFieldChange('imapPort', v)} /></div><Toggle label="Usar SSL/TLS" description="" enabled={account.imapSsl} onToggle={v => handleFieldChange('imapSsl', v)} /></div>
                    <div className="border-t border-border pt-4 space-y-4"><h4 className="font-semibold">Configuración SMTP (Salida)</h4><div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Input label="Servidor SMTP" value={account.smtpServer} onChange={v => handleFieldChange('smtpServer', v)} placeholder="smtp.servidor.com" /></div><Input label="Puerto" value={account.smtpPort} onChange={v => handleFieldChange('smtpPort', v)} /></div><Toggle label="Usar SSL/TLS" description="" enabled={account.smtpSsl} onToggle={v => handleFieldChange('smtpSsl', v)} /></div>
                </div>
                <div className="p-6 bg-background border-t border-border flex justify-between items-center">
                    <div>{testStatus === 'success' && <p className="text-sm font-semibold text-green-600">¡Conexión exitosa!</p>}{testStatus === 'error' && <p className="text-sm font-semibold text-red-600">Error de conexión.</p>}</div>
                    <div className="flex gap-2"><button onClick={onClose} className="bg-surface border border-border font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button><button onClick={handleTestConnection} disabled={isTesting} className="bg-surface border border-border font-semibold py-2 px-4 rounded-lg shadow-sm w-40 disabled:opacity-50">{isTesting ? 'Probando...' : 'Probar Conexión'}</button><button onClick={handleSave} disabled={testStatus !== 'success'} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm disabled:bg-gray-400">Guardar Cuenta</button></div>
                </div>
            </div>
        </div>
    );
};

// New Design Components
const ProfileHeader: React.FC<{
    user: typeof MOCK_USERS.natalia;
    bannerStyle: React.CSSProperties;
    onBannerClick: () => void;
    onAvatarClick: () => void;
}> = ({ user, bannerStyle, onBannerClick, onAvatarClick }) => (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="group relative h-40 animate-gradient" style={bannerStyle}>
             <button onClick={onBannerClick} className="absolute top-3 right-3 bg-black/30 text-white text-xs font-semibold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-sm">image</span>
                Cambiar fondo
            </button>
        </div>
        <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12">
                 <div className="relative group">
                    <img
                        className="h-32 w-32 rounded-lg object-cover border-4 border-surface shadow-md"
                        src={user.avatarUrl}
                        alt={user.name}
                    />
                    <button onClick={onAvatarClick} className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                         <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </button>
                </div>
                <div className="ml-0 sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left sm:pb-4">
                    <h1 className="text-2xl font-bold text-on-surface">{user.name}</h1>
                    <p className="text-sm text-on-surface-secondary flex items-center justify-center sm:justify-start flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">work</span> {user.role}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">location_on</span> Vatican City</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">calendar_today</span> Se unió en Abril 2021</span>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const AboutCard: React.FC<{ user: typeof MOCK_USERS.natalia }> = ({ user }) => (
  <div className="bg-surface rounded-xl shadow-sm border border-border p-6 h-full">
    <h3 className="text-lg font-bold text-on-surface mb-4">Acerca de</h3>
    <ul className="space-y-3 text-sm">
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">badge</span><span className="font-semibold text-on-surface-secondary">Nombre Completo:</span><span className="ml-auto text-right font-medium text-on-surface">{user.name}</span></li>
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">toggle_on</span><span className="font-semibold text-on-surface-secondary">Estado:</span><span className="ml-auto text-right text-green-600 font-semibold">Activo</span></li>
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">work</span><span className="font-semibold text-on-surface-secondary">Rol:</span><span className="ml-auto text-right font-medium text-on-surface">{user.role}</span></li>
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">public</span><span className="font-semibold text-on-surface-secondary">País:</span><span className="ml-auto text-right font-medium text-on-surface">USA</span></li>
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">translate</span><span className="font-semibold text-on-surface-secondary">Idiomas:</span><span className="ml-auto text-right font-medium text-on-surface">English</span></li>
    </ul>
    <h4 className="text-md font-bold text-on-surface mt-6 pt-4 border-t border-border">Contacto</h4>
    <ul className="space-y-3 text-sm mt-4">
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">phone</span><span className="font-semibold text-on-surface-secondary">Teléfono:</span><span className="ml-auto text-right font-medium text-on-surface">(123) 456-7890</span></li>
      <li className="flex items-center"><span className="material-symbols-outlined text-lg w-8 text-on-surface-secondary">mail</span><span className="font-semibold text-on-surface-secondary">Email:</span><span className="ml-auto text-right font-medium text-on-surface">{user.email}</span></li>
    </ul>
  </div>
);

const ActivityTimeline: React.FC<{ logs: AuditLog[] }> = ({ logs }) => (
  <div className="bg-surface rounded-xl shadow-sm border border-border p-6 h-full">
    <h3 className="text-lg font-bold text-on-surface mb-6">Historial de Actividad</h3>
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {logs.map((log, logIdx) => (
          <li key={log.id}>
            <div className="relative pb-8">
              {logIdx !== logs.length - 1 ? <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border" /> : null}
              <div className="relative flex space-x-4">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-surface ${logIdx % 2 === 0 ? 'bg-primary/20' : 'bg-accent/20'}`}>
                    <span className={`material-symbols-outlined text-base ${logIdx % 2 === 0 ? 'text-accent' : 'text-primary'}`}>history</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <p className="text-sm text-on-surface-secondary">
                    {log.action} en <span className="font-medium text-on-surface">{log.entity} ({log.entityId})</span>
                  </p>
                  <p className="text-xs text-on-surface-secondary mt-1">
                    <time dateTime={new Date(log.at).toISOString()}>{new Date(log.at).toLocaleString()}</time>
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const ProfilePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const user = MOCK_USERS.natalia;
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [bannerStyle, setBannerStyle] = useState<React.CSSProperties>({ backgroundImage: 'linear-gradient(to right, #ec4899, #8b5cf6, #ec4899)' });
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const [connectedEmails, setConnectedEmails] = useState<ConnectedEmail[]>([
        { id: 'email-1', email: user.email, status: 'Conectado' },
        { id: 'email-2', email: 'ventas@crmstudio.com', status: 'Error de autenticación' }
    ]);

    const handleAvatarChangeClick = () => {
        avatarInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            alert(`Archivo seleccionado: ${file.name}. En una aplicación real, se subiría y actualizaría la imagen.`);
        }
    };

    const handleAddEmail = (email: string) => {
        if (email) setConnectedEmails(prev => [...prev, { id: `email-${Date.now()}`, email: email, status: 'Conectado' }]);
    };

    const handleLogoutAll = () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar sesión en todos los demás dispositivos?')) {
            alert('Sesiones cerradas.');
        }
    };

    const tabs: { id: ProfileTab; name: string; icon: string }[] = [
        { id: 'overview', name: 'Perfil', icon: 'person' },
        { id: 'edit-profile', name: 'Editar', icon: 'edit' },
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
            case 'overview':
                 const userActivity = MOCK_AUDIT_LOGS.filter(log => log.by === user.id);
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1"><AboutCard user={user} /></div>
                        <div className="lg:col-span-2"><ActivityTimeline logs={userActivity} /></div>
                    </div>
                );
            case 'edit-profile':
                return (
                    <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
                        <h3 className="text-lg font-bold mb-6">Información General</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Nombre(s)" value="Natalia" onChange={() => {}} />
                            <Input label="Apellido(s)" value="V" onChange={() => {}} />
                            <Input label="Nombre a mostrar" value="Natalia" onChange={() => {}} />
                            <Input label="Puesto" value="Admin" onChange={() => {}} disabled />
                            <Input label="Correo electrónico" value={user.email} onChange={() => {}} disabled />
                            <Input label="Teléfono" value="(123) 456-7890" onChange={() => {}} />
                            <Input label="Empresa" value="CRM Studio" onChange={() => {}} disabled />
                            <div>
                                <label className="block text-sm font-medium text-on-surface-secondary">Fecha de Nacimiento</label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    <select className="w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"><option>Día</option>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                    <select className="w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"><option>Mes</option>{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                    <select className="w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"><option>Año</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6"><label className="block text-sm font-medium text-on-surface-secondary">Biografía</label><textarea rows={4} placeholder="Escribe algo sobre ti..." className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"/></div>
                        <div className="border-t mt-6 pt-4 flex justify-end"><button className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">Guardar Cambios</button></div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-6">Cambiar Contraseña</h3><div className="space-y-4"><Input label="Contraseña Actual" value="" onChange={() => {}} type="password"/><Input label="Nueva Contraseña" value="" onChange={() => {}} type="password"/><Input label="Confirmar Nueva Contraseña" value="" onChange={() => {}} type="password"/></div><div className="border-t mt-6 pt-4 flex justify-end"><button className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">Actualizar Contraseña</button></div></div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-2">Autenticación de Dos Factores (2FA)</h3><Toggle label="Habilitar 2FA vía Email" description="Recibirás un código en tu correo para mayor seguridad al iniciar sesión." enabled={is2faEnabled} onToggle={setIs2faEnabled} /></div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-4">Sesiones Activas</h3><ul className="space-y-3"><li className="flex items-center justify-between text-sm"><div className="flex items-center gap-3"><span className="material-symbols-outlined">desktop_windows</span><div><p className="font-semibold">Chrome en macOS</p><p className="text-xs text-on-surface-secondary">Sesión actual</p></div></div><span className="text-xs text-green-600 font-semibold">Activa ahora</span></li><li className="flex items-center justify-between text-sm"><div className="flex items-center gap-3"><span className="material-symbols-outlined">smartphone</span><div><p>iPhone 15 Pro</p><p className="text-xs text-on-surface-secondary">Hace 2 horas</p></div></div><button className="text-xs font-semibold text-accent hover:underline">Cerrar sesión</button></li></ul><div className="border-t mt-4 pt-4"><button onClick={handleLogoutAll} className="w-full text-center bg-surface-inset border border-border font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-200">Cerrar sesión en todos los demás dispositivos</button></div></div>
                        <div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-4">Política de Inicio de Sesión</h3><p className="text-sm text-on-surface-secondary mb-4">Estas son las políticas de seguridad definidas por el administrador de la plataforma.</p><div className="grid grid-cols-2 gap-4 text-center"><div className="bg-surface-inset p-4 rounded-lg"><p className="text-2xl font-bold text-on-surface">5</p><p className="text-xs text-on-surface-secondary">Intentos fallidos permitidos</p></div><div className="bg-surface-inset p-4 rounded-lg"><p className="text-2xl font-bold text-on-surface">15 min</p><p className="text-xs text-on-surface-secondary">Tiempo de bloqueo</p></div></div></div>
                    </div>
                );
            case 'emails':
                return (
                    <div className="bg-surface p-6 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-bold">Cuentas de Correo Conectadas</h3><p className="text-sm text-on-surface-secondary">Gestiona las cuentas de correo electrónico vinculadas a tu perfil.</p></div><button onClick={() => setIsEmailModalOpen(true)} className="bg-accent text-on-dark font-semibold py-2 px-3 rounded-lg flex items-center shadow-sm text-sm hover:opacity-90"><span className="material-symbols-outlined mr-1 text-base">add</span>Añadir Cuenta</button></div>
                        <ul className="space-y-3">{connectedEmails.map(account => (<li key={account.id} className="flex items-center justify-between text-sm p-3 border rounded-lg bg-surface-inset"><div><p className="font-semibold">{account.email}</p><div className={`flex items-center gap-2 text-xs mt-1 ${account.status === 'Conectado' ? 'text-green-700' : 'text-red-700'}`}><span className={`w-2 h-2 rounded-full ${account.status === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></span>{account.status}</div></div><div className="flex gap-2"><button className="p-1 rounded-full text-on-surface-secondary hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button><button className="p-1 rounded-full text-on-surface-secondary hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button></div></li>))}</ul>
                    </div>
                );
            case 'notifications':
                return (<div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-2">Preferencias de Notificación</h3><Toggle label="Alertas en la App" description="Recibir alertas y menciones dentro de la plataforma." enabled={true} onToggle={() => {}} /><Toggle label="Resumen diario por Correo" description="Recibir un resumen diario de tu actividad y tareas pendientes." enabled={true} onToggle={() => {}} /><Toggle label="Noticias y Actualizaciones" description="Recibir correos sobre nuevas funcionalidades y noticias del producto." enabled={false} onToggle={() => {}} /></div>);
            case 'preferences':
                 return (<div className="bg-surface p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-bold mb-4">Preferencias de la Aplicación</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-on-surface-secondary">Idioma</label><select className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"><option>Español (México)</option><option>English (United States)</option></select></div><div><label className="block text-sm font-medium text-on-surface-secondary">Zona Horaria</label><select className="mt-1 block w-full bg-surface-inset border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary"><option>(GMT-06:00) Central Time - Ciudad de México</option></select></div></div></div>);
            default: return null;
        }
    }

    return (
        <div className="space-y-6">
            <input type="file" ref={avatarInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <ProfileHeader 
                user={user} 
                bannerStyle={bannerStyle}
                onBannerClick={() => setIsBannerModalOpen(true)}
                onAvatarClick={handleAvatarChangeClick}
            />
            <div className="bg-surface rounded-xl shadow-sm border border-border">
                <nav className="flex justify-between p-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-primary text-on-primary' : 'hover:bg-background text-on-surface-secondary'}`}
                        >
                             <span className="material-symbols-outlined text-base">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {renderTabContent()}
            </div>
            <EmailConnectionModal 
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSave={handleAddEmail}
            />
            <BannerModal 
                isOpen={isBannerModalOpen}
                onClose={() => setIsBannerModalOpen(false)}
                onSelect={(style) => {
                    setBannerStyle(style);
                    setIsBannerModalOpen(false);
                }}
            />
        </div>
    );
};

export default ProfilePage;