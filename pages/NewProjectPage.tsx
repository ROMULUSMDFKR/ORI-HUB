import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';
import UserSelector from '../components/ui/UserSelector';
import CustomSelect from '../components/ui/CustomSelect';

const FormCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const NewProjectPage: React.FC = () => {
    const navigate = useNavigate();
    const [project, setProject] = useState<Partial<Project>>({
        name: '',
        description: '',
        status: 'Activo',
        members: [],
        dueDate: ''
    });

    const [dueDateParts, setDueDateParts] = useState({
        day: '',
        month: '',
        year: ''
    });

    const handleFieldChange = (field: keyof Project, value: any) => {
        setProject(prev => ({ ...prev, [field]: value }));
    };

    const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ value: (i + 1).toString(), name: `${i + 1}` })), []);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), name: new Date(2000, i, 1).toLocaleString('es-MX', { month: 'long' }) })), []);
    const yearOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ value: (new Date().getFullYear() + i).toString(), name: `${new Date().getFullYear() + i}` })), []);

    useEffect(() => {
        const { day, month, year } = dueDateParts;
        if (day && month && year) {
            // JS months are 0-indexed, so subtract 1
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) {
                handleFieldChange('dueDate', date.toISOString());
            }
        }
    }, [dueDateParts]);


    const handleSave = () => {
        if (!project.name?.trim()) {
            alert('El nombre del proyecto es requerido.');
            return;
        }
        const finalProject: Project = {
            id: `proj-${Date.now()}`,
            ...project
        } as Project;
        console.log("Creating new project:", finalProject);
        alert(`Proyecto "${finalProject.name}" creado (simulación).`);
        navigate('/tasks/projects');
    };

    const statusOptions = [
        { value: 'Activo', name: 'Activo' },
        { value: 'En Pausa', name: 'En Pausa' },
        { value: 'Completado', name: 'Completado' },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nuevo Proyecto</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate(-1)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Proyecto</button>
                </div>
            </div>
            <div className="space-y-6">
                <FormCard title="Información del Proyecto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                        <input type="text" value={project.name} onChange={e => handleFieldChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                        <textarea value={project.description} onChange={e => handleFieldChange('description', e.target.value)} rows={4} />
                    </div>
                </FormCard>

                <FormCard title="Equipo y Plazos">
                    <UserSelector
                        label="Miembros del Proyecto"
                        selectedUserIds={project.members || []}
                        onToggleUser={(userId) => handleFieldChange('members', (project.members || []).includes(userId) ? (project.members || []).filter(id => id !== userId) : [...(project.members || []), userId])}
                    />
                     <CustomSelect
                        label="Estado"
                        options={statusOptions}
                        value={project.status || ''}
                        onChange={val => handleFieldChange('status', val as Project['status'])}
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Vencimiento</label>
                        <div className="grid grid-cols-3 gap-2">
                            <select
                                value={dueDateParts.day}
                                onChange={e => setDueDateParts(p => ({ ...p, day: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Día</option>
                                {dayOptions.map(d => <option key={d.value} value={d.value}>{d.name}</option>)}
                            </select>
                            <select
                                value={dueDateParts.month}
                                onChange={e => setDueDateParts(p => ({ ...p, month: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Mes</option>
                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>)}
                            </select>
                            <select
                                value={dueDateParts.year}
                                onChange={e => setDueDateParts(p => ({ ...p, year: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Año</option>
                                {yearOptions.map(y => <option key={y.value} value={y.value}>{y.name}</option>)}
                            </select>
                        </div>
                    </div>
                </FormCard>
            </div>
        </div>
    );
};

export default NewProjectPage;