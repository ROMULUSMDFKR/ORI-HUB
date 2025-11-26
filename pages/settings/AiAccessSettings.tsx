import React, { useState, useEffect } from 'react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { User } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';

const ROLES: User['role'][] = ['Admin', 'Ventas', 'Logística'];
const MODULES = ['Prospección', 'Ventas', 'Tareas', 'Inventario', 'Finanzas'];
const AI_ACTIONS = [
    { id: 'createTask', name: 'Crear Tareas', description: 'Permite a la IA crear nuevas tareas.' },
    { id: 'updateClientStatus', name: 'Modificar Estatus de Cliente', description: 'Permite a la IA cambiar la etapa de un cliente.' },
    { id: 'getSummary', name: 'Generar Resúmenes', description: 'Permite a la IA analizar y resumir datos.' },
];

type Permissions = Record<User['role'], Record<string, boolean>>;

const AiAccessSettings: React.FC = () => {
    const [dataPermissions, setDataPermissions] = useState<Permissions | null>(null);
    const [actionPermissions, setActionPermissions] = useState<Permissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const settings = await api.getDoc('settings', 'aiAccess');
            if (settings) {
                setDataPermissions(settings.dataPermissions);
                setActionPermissions(settings.actionPermissions);
            } else {
                // Set default state if no settings are found in DB
                setDataPermissions({
                    'Admin': { 'Prospección': true, 'Ventas': true, 'Tareas': true, 'Inventario': true, 'Finanzas': true },
                    'Ventas': { 'Prospección': true, 'Ventas': true, 'Tareas': true, 'Inventario': false, 'Finanzas': false },
                    'Logística': { 'Prospección': false, 'Ventas': false, 'Tareas': true, 'Inventario': true, 'Finanzas': false }
                });
                setActionPermissions({
                    'Admin': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
                    'Ventas': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
                    'Logística': { 'createTask': true, 'updateClientStatus': false, 'getSummary': true }
                });
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    const handleDataToggle = (role: User['role'], module: string) => {
        setDataPermissions(prev => (prev ? { ...prev, [role]: { ...prev[role], [module]: !prev[role][module] } } : null));
    };
    
    const handleActionToggle = (role: User['role'], actionId: string) => {
        setActionPermissions(prev => (prev ? { ...prev, [role]: { ...prev[role], [actionId]: !prev[role][actionId] } } : null));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.setDoc('settings', 'aiAccess', { dataPermissions, actionPermissions });
            alert('Permisos de IA guardados con éxito.');
        } catch (error) {
            console.error('Error saving AI settings:', error);
            alert('Error al guardar los permisos de IA.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !dataPermissions || !actionPermissions) {
        return <div className="flex justify-center py-12"><Spinner /></div>;
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Administra los permisos de acceso a datos y capacidades operativas del Asistente Studio AI.
                    </p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-xl">save</span>
                    )}
                    <span>Guardar Cambios</span>
                </button>
            </div>

            {/* Data Access Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        {/* App Icon Pattern */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <span className="material-symbols-outlined text-xl">database</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Acceso de Datos</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Controla qué módulos puede leer la IA para generar respuestas.</p>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Módulo</th>
                                {ROLES.map(role => ( 
                                    <th key={role} className="py-4 px-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {role}
                                    </th> 
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {MODULES.map((module, idx) => (
                                <tr key={module} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-800'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400 text-lg">folder</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{module}</span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => (
                                        <td key={`${role}-${module}`} className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center">
                                                <ToggleSwitch enabled={dataPermissions[role]?.[module] ?? false} onToggle={() => handleDataToggle(role, module)} />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Permissions Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        {/* App Icon Pattern */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <span className="material-symbols-outlined text-xl">bolt</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permisos de Ejecución</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Define qué acciones autónomas puede realizar el asistente.</p>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Acción</th>
                                {ROLES.map(role => ( 
                                    <th key={role} className="py-4 px-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {role}
                                    </th> 
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {AI_ACTIONS.map((action, idx) => (
                                <tr key={action.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-800'}`}>
                                    <td className="px-6 py-4 whitespace-normal">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{action.name}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{action.description}</span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => (
                                        <td key={`${role}-${action.id}`} className="px-6 py-4 whitespace-nowrap text-center align-middle">
                                            <div className="flex justify-center">
                                                <ToggleSwitch enabled={actionPermissions[role]?.[action.id] ?? false} onToggle={() => handleActionToggle(role, action.id)} />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AiAccessSettings;