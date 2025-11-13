

import React, { useState } from 'react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

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
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Notificaciones</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona cómo y cuándo recibes alertas.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
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

export default NotificationSettings;