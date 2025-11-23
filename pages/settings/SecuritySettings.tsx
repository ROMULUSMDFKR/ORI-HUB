
import React, { useState, useEffect } from 'react';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

const SecurityCard: React.FC<{ title: string; children: React.ReactNode; icon: string; description?: string }> = ({ title, children, icon, description }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
                {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

const SecuritySettings = () => {
    const [settings, setSettings] = useState({
        maxAttempts: 5,
        lockoutTime: 15,
        require2FA: false,
        sessionTimeout: 60,
        passwordMinLength: 8,
        passwordRequireSpecial: true,
        passwordRequireNumber: true,
        ipWhitelist: '',
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const data = await api.getDoc('settings', 'securityConfig');
            if (data) {
                setSettings(prev => ({ ...prev, ...data }));
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    const handleChange = (field: string, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await api.setDoc('settings', 'securityConfig', settings);
            alert('Política de seguridad guardada.');
        } catch (error) {
            console.error('Error saving security settings:', error);
            alert('Error al guardar la política de seguridad.');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Spinner /></div>;
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Centro de Seguridad</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Define las políticas de acceso, contraseñas y protección de datos.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SecurityCard title="Control de Acceso" icon="shield" description="Reglas para el inicio de sesión y bloqueos.">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <div>
                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Intentos Máximos</p>
                            <p className="text-xs text-slate-500">Antes de bloquear la cuenta</p>
                        </div>
                        <input
                            type="number"
                            value={settings.maxAttempts}
                            onChange={e => handleChange('maxAttempts', Number(e.target.value))}
                            className="w-20 p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm"
                        />
                    </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <div>
                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Tiempo de Bloqueo</p>
                            <p className="text-xs text-slate-500">Minutos de espera tras bloqueo</p>
                        </div>
                        <input
                            type="number"
                            value={settings.lockoutTime}
                            onChange={e => handleChange('lockoutTime', Number(e.target.value))}
                            className="w-20 p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm"
                        />
                    </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <div>
                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Expiración de Sesión</p>
                            <p className="text-xs text-slate-500">Minutos de inactividad</p>
                        </div>
                        <input
                            type="number"
                            value={settings.sessionTimeout}
                            onChange={e => handleChange('sessionTimeout', Number(e.target.value))}
                            className="w-20 p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm"
                        />
                    </div>
                </SecurityCard>

                 <SecurityCard title="Autenticación" icon="lock" description="Requisitos de contraseñas y 2FA.">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Forzar 2FA para todos</span>
                        <ToggleSwitch enabled={settings.require2FA} onToggle={() => handleChange('require2FA', !settings.require2FA)} />
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-3">Política de Contraseñas</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={settings.passwordRequireSpecial} onChange={e => handleChange('passwordRequireSpecial', e.target.checked)} className="rounded text-indigo-600" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">Símbolos (!@#)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={settings.passwordRequireNumber} onChange={e => handleChange('passwordRequireNumber', e.target.checked)} className="rounded text-indigo-600" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">Números</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Longitud mínima:</span>
                                <input type="number" value={settings.passwordMinLength} onChange={e => handleChange('passwordMinLength', Number(e.target.value))} className="w-16 p-1 text-center border border-slate-300 dark:border-slate-600 rounded text-xs" />
                            </div>
                        </div>
                    </div>
                </SecurityCard>

                <SecurityCard title="Restricciones de Red" icon="lan" description="Limita el acceso a direcciones IP específicas.">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lista Blanca de IPs (Separadas por coma)</label>
                        <textarea 
                            rows={4} 
                            value={settings.ipWhitelist} 
                            onChange={e => handleChange('ipWhitelist', e.target.value)}
                            placeholder="Ej: 192.168.1.1, 10.0.0.0/24"
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined !text-sm text-amber-500">warning</span>
                            Si dejas esto vacío, se permitirá el acceso desde cualquier IP.
                        </p>
                    </div>
                </SecurityCard>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleSave} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">save_as</span>
                    Guardar Políticas de Seguridad
                </button>
            </div>
        </div>
    );
};

export default SecuritySettings;
