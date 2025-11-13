

import React, { useState, useEffect, useCallback } from 'react';
import UserManagement from './settings/UserManagement';
import TeamManagement from './settings/TeamManagement';
import IndustryManagement from './settings/IndustryManagement';
import PipelineManagement from './settings/PipelineManagement';
import AiAccessSettings from './settings/AiAccessSettings';
import SecuritySettings from './settings/SecuritySettings';

// --- Main Settings Page ---

const SETTINGS_NAV = [
    {
        group: 'Administración de la Plataforma',
        links: [
            { id: 'usuarios', name: 'Usuarios y Permisos', icon: 'manage_accounts' },
            { id: 'equipos', name: 'Equipos', icon: 'groups' },
            { id: 'seguridad', name: 'Seguridad', icon: 'security' },
            { id: 'industrias', name: 'Industrias', icon: 'factory' },
            { id: 'pipelines', name: 'Etapas de Venta', icon: 'mediation' },
            { id: 'integraciones', name: 'Integraciones', icon: 'integration_instructions' },
            { id: 'ai-access', name: 'Acceso de IA', icon: 'smart_toy' },
        ]
    }
];

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('usuarios');

    const renderContent = () => {
        switch (activeTab) {
            case 'usuarios':
                return <UserManagement />;
            case 'equipos':
                return <TeamManagement />;
            case 'seguridad':
                return <SecuritySettings />;
            case 'industrias':
                return <IndustryManagement />;
            case 'pipelines':
                return <PipelineManagement />;
            case 'integraciones':
                return <div><h2 className="text-2xl font-bold">Integraciones</h2><p className="text-slate-500 dark:text-slate-400 mt-4">Página de gestión de integraciones próximamente.</p></div>;
            case 'ai-access':
                return <AiAccessSettings />;
            default:
                return null;
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
                <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">Configuración</h1>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm h-fit">
                    <nav className="space-y-4">
                        {SETTINGS_NAV.map(group => (
                            <div key={group.group}>
                                <h2 className="px-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">{group.group}</h2>
                                <div className="space-y-1">
                                    {group.links.map(link => (
                                        <button 
                                            key={link.id}
                                            onClick={() => setActiveTab(link.id)} 
                                            className={`w-full flex items-center p-3 rounded-lg text-left font-medium transition-colors duration-200 ${activeTab === link.id ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                                        >
                                            <span className="material-symbols-outlined mr-3">{link.icon}</span>
                                            <span>{link.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
            </div>
            <div className="md:col-span-3">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsPage;