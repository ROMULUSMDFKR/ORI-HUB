import React, { useState, useEffect } from 'react';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';

// Helper for KPI Card
const SecurityKpiCard: React.FC<{ title: string; value: string; icon: string; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
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
                 {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );
};

const SecuritySettings = () => {
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [lockoutTime, setLockoutTime] = useState(15);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const settings = await api.getDoc('settings', 'securityConfig');
                if (settings) {
                    setMaxAttempts(settings.maxAttempts);
                    setLockoutTime(settings.lockoutTime);
                }
            } catch(e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.setDoc('settings', 'securityConfig', { maxAttempts, lockoutTime });
            alert('Política de seguridad guardada.');
        } catch (error) {
            console.error('Error saving security settings:', error);
            alert('Error al guardar la política de seguridad.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Spinner /></div>;
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Configura las políticas de acceso y protección de la plataforma.
                    </p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold disabled:opacity-50"
                >
                    {isSaving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
                    Guardar Cambios
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <SecurityKpiCard title="Intentos Permitidos" value={maxAttempts.toString()} icon="lock_open" color="indigo" subtext="Antes del bloqueo" />
                <SecurityKpiCard title="Tiempo de Bloqueo" value={`${lockoutTime} min`} icon="timer_off" color="rose" subtext="Duración de la penalización" />
                <SecurityKpiCard title="Estado del Sistema" value="Protegido" icon="verified_user" color="emerald" subtext="Configuración activa" />
            </div>

            {/* Config Form */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">admin_panel_settings</span>
                    Política de Inicio de Sesión
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Input Safe Pattern */}
                    <div>
                        <label htmlFor="max-attempts" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número máximo de intentos fallidos</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">password</span>
                            </div>
                            <input
                                type="number"
                                id="max-attempts"
                                value={maxAttempts}
                                onChange={e => setMaxAttempts(Number(e.target.value))}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            El número de veces que un usuario puede equivocarse de contraseña antes de que su cuenta sea bloqueada temporalmente.
                        </p>
                    </div>

                    {/* Input Safe Pattern */}
                    <div>
                        <label htmlFor="lockout-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiempo de bloqueo (minutos)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">hourglass_disabled</span>
                            </div>
                            <input
                                type="number"
                                id="lockout-time"
                                value={lockoutTime}
                                onChange={e => setLockoutTime(Number(e.target.value))}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                         <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            La duración en minutos que la cuenta permanecerá inaccesible después de exceder los intentos fallidos.
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Additional Info Box (Mock) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl flex items-start gap-4">
                 <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">info</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Recomendación de Seguridad</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        Se recomienda mantener un límite de intentos bajo (3-5) y un tiempo de bloqueo moderado (15-30 min) para prevenir ataques de fuerza bruta sin afectar demasiado a los usuarios legítimos que olvidan sus contraseñas.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;