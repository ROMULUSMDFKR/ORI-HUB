

import React, { useState } from 'react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { User } from '../../types';

const ROLES: User['role'][] = ['Admin', 'Ventas', 'Logística'];
const MODULES = ['Prospección', 'Ventas', 'Tareas', 'Inventario', 'Finanzas'];
const AI_ACTIONS = [
    { id: 'createTask', name: 'Crear Tareas', description: 'Permite a la IA crear nuevas tareas.' },
    { id: 'updateClientStatus', name: 'Modificar Estatus de Cliente', description: 'Permite a la IA cambiar la etapa de un cliente.' },
    { id: 'getSummary', name: 'Generar Resúmenes', description: 'Permite a la IA analizar y resumir datos.' },
];

type Permissions = Record<User['role'], Record<string, boolean>>;

const AiAccessSettings: React.FC = () => {
    const [dataPermissions, setDataPermissions] = useState<Permissions>({
        'Admin': { 'Prospección': true, 'Ventas': true, 'Tareas': true, 'Inventario': true, 'Finanzas': true },
        'Ventas': { 'Prospección': true, 'Ventas': true, 'Tareas': true, 'Inventario': false, 'Finanzas': false },
        'Logística': { 'Prospección': false, 'Ventas': false, 'Tareas': true, 'Inventario': true, 'Finanzas': false }
    });
    
    const [actionPermissions, setActionPermissions] = useState<Permissions>({
        'Admin': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
        'Ventas': { 'createTask': true, 'updateClientStatus': true, 'getSummary': true },
        'Logística': { 'createTask': true, 'updateClientStatus': false, 'getSummary': true }
    });

    const handleDataToggle = (role: User['role'], module: string) => {
        setDataPermissions(prev => ({ ...prev, [role]: { ...prev[role], [module]: !prev[role][module] } }));
    };
    
    const handleActionToggle = (role: User['role'], actionId: string) => {
        setActionPermissions(prev => ({ ...prev, [role]: { ...prev[role], [actionId]: !prev[role][actionId] } }));
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Acceso de Datos para IA</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Controla a qué módulos de información puede acceder el Asistente de IA según el rol del usuario.
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Módulo de Datos</th>
                            {ROLES.map(role => ( <th key={role} className="py-3 px-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{role}</th> ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {MODULES.map(module => (
                            <tr key={module}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{module}</td>
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

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Acciones de IA Permitidas por Rol</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Controla qué acciones puede ejecutar el Asistente de IA en la plataforma.
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acción</th>
                            {ROLES.map(role => ( <th key={role} className="py-3 px-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{role}</th> ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {AI_ACTIONS.map(action => (
                            <tr key={action.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                    <p>{action.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                                </td>
                                {ROLES.map(role => (
                                    <td key={`${role}-${action.id}`} className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center">
                                            <ToggleSwitch enabled={actionPermissions[role]?.[action.id] ?? false} onToggle={() => handleActionToggle(role, action.id)} />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end">
                    <button onClick={() => alert('Permisos de IA guardados.')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiAccessSettings;