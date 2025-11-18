import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Project } from '../types';
import { useDoc } from '../hooks/useDoc';
// FIX: Se eliminó la importación de datos falsos no utilizada.
import UserSelector from '../components/ui/UserSelector';
import CustomSelect from '../components/ui/CustomSelect';
import Spinner from '../components/ui/Spinner';

const FormCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const EditProjectPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialProject, loading } = useDoc<Project>('projects', id || '');
    
    const [project, setProject] = useState<Partial<Project> | null>(null);

    useEffect(() => {
        if (initialProject) {
            setProject(initialProject);
        }
    }, [initialProject]);

    const handleFieldChange = (field: keyof Project, value: any) => {
        setProject(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (!project || !project.name?.trim()) {
            alert('El nombre del proyecto es requerido.');
            return;
        }
        console.log("Updating project:", project);
        alert(`Proyecto "${project.name}" actualizado (simulación).`);
        navigate(`/tasks/projects/${id}`);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!project) return <div className="text-center p-12">Proyecto no encontrado</div>;

    const statusOptions = [
        { value: 'Activo', name: 'Activo' },
        { value: 'En Pausa', name: 'En Pausa' },
        { value: 'Completado', name: 'Completado' },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Proyecto</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/tasks/projects/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>
            <div className="space-y-6">
                <FormCard title="Información del Proyecto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                        <input type="text" value={project.name || ''} onChange={e => handleFieldChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea value={project.description || ''} onChange={e => handleFieldChange('description', e.target.value)} rows={4} />
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <input
                            type="date"
                            value={project.dueDate?.split('T')[0] || ''}
                            onChange={e => handleFieldChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    </div>
                </FormCard>
            </div>
        </div>
    );
};

export default EditProjectPage;