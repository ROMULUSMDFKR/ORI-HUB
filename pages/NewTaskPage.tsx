import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, Priority, Subtask, Team } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';
import UserSelector from '../components/ui/UserSelector';
import CustomSelect from '../components/ui/CustomSelect';
import LinkEntityDrawer from '../components/tasks/LinkEntityDrawer';
import { useToast } from '../hooks/useToast';

// --- Reusable Component Outside ---
const FormCard: React.FC<{ title: string, children: React.ReactNode, icon?: string }> = ({ title, children, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const NewTaskPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: teams } = useCollection<Team>('teams');
    const { showToast } = useToast();
    
    // Ref to track if we have already auto-assigned the user
    const hasAssignedSelf = useRef(false);

    const [task, setTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        status: TaskStatus.PorHacer,
        priority: Priority.Media,
        assignees: [],
        watchers: [],
        subtasks: [],
        tags: [],
        teamId: '',
        estimationHours: 0,
        attachments: [],
        links: {},
    });
    const [newTag, setNewTag] = useState('');
    const [newSubtask, setNewSubtask] = useState({ text: '', notes: '' });
    const [isLinkDrawerOpen, setIsLinkDrawerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const DESCRIPTION_MAX_LENGTH = 2000;

    // Auto-assign current user on mount
    useEffect(() => {
        if (user && !hasAssignedSelf.current) {
            setTask(prev => ({ ...prev, assignees: [user.id] }));
            hasAssignedSelf.current = true;
        }
    }, [user]);

    const handleFieldChange = useCallback((field: keyof Task, value: any) => {
        setTask(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleLinkEntities = (links: any) => {
        handleFieldChange('links', links);
    };

    const linkedEntitiesCount = useMemo(() => {
        if (!task.links) return 0;
        return Object.keys(task.links).length;
    }, [task.links]);

    const handleSave = async () => {
        if (!task.title?.trim()) {
            showToast('warning', 'El título es requerido.');
            return;
        }

        setIsSaving(true);
        try {
            const finalTask: Partial<Task> = {
                ...task,
                createdAt: new Date().toISOString(),
                createdById: user?.id,
                assignees: task.assignees || [],
                watchers: task.watchers || [],
                subtasks: task.subtasks || [],
                tags: task.tags || [],
            };
            
            const addedTask = await api.addDoc('tasks', finalTask);

            // Create notifications for assignees
            if (addedTask.assignees) {
                for (const assigneeId of addedTask.assignees) {
                    if (assigneeId === user?.id) continue; // Don't notify self

                    const notification = {
                        userId: assigneeId,
                        title: 'Nueva tarea asignada',
                        message: `Se te ha asignado la tarea: "${addedTask.title}"`,
                        type: 'task' as 'task',
                        link: `/tasks/${addedTask.id}`,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    };
                    await api.addDoc('notifications', notification);
                }
            }

            showToast('success', 'Tarea creada con éxito.');
            navigate('/tasks');
        } catch (error) {
            console.error("Error creating task:", error);
            showToast('error', 'Hubo un error al guardar la tarea.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            const currentTags = task.tags || [];
            if (!currentTags.includes(newTag.trim())) {
                handleFieldChange('tags', [...currentTags, newTag.trim()]);
            }
            setNewTag('');
        }
    };
    const handleRemoveTag = (tagToRemove: string) => {
        handleFieldChange('tags', (task.tags || []).filter(tag => tag !== tagToRemove));
    };

    const handleAddSubtask = () => {
        if (newSubtask.text.trim()) {
            const subtask: Subtask = { id: `sub-${Date.now()}`, text: newSubtask.text, notes: newSubtask.notes, isCompleted: false };
            handleFieldChange('subtasks', [...(task.subtasks || []), subtask]);
            setNewSubtask({ text: '', notes: '' });
        }
    };
    const handleToggleSubtask = (subtaskId: string) => {
        const newSubtasks = (task.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        handleFieldChange('subtasks', newSubtasks);
    };
    const handleRemoveSubtask = (subtaskId: string) => {
        const newSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
        handleFieldChange('subtasks', newSubtasks);
    };

    const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    const statusOptions = Object.values(TaskStatus).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));
    const teamOptions = [{ value: '', name: 'Ninguno' }, ...(teams || []).map(team => ({ value: team.id, name: team.name }))];

    // Input Safe Pattern classes
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400";

    return (
        <div className="max-w-4xl mx-auto pb-20">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nueva Tarea</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define los detalles de la actividad a realizar.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate(-1)} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Tarea
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <FormCard title="Información básica" icon="info">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título <span className="text-red-500">*</span></label>
                        <div className={inputWrapperClass}>
                            <div className={inputIconClass}>
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">title</span>
                            </div>
                            <input 
                                type="text" 
                                value={task.title} 
                                onChange={e => handleFieldChange('title', e.target.value)} 
                                className={inputFieldClass} 
                                placeholder="Ej. Revisar reporte mensual"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                         <div className={inputWrapperClass}>
                            <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">description</span>
                            </div>
                            <textarea 
                                value={task.description} 
                                onChange={e => handleFieldChange('description', e.target.value)} 
                                rows={4} 
                                maxLength={DESCRIPTION_MAX_LENGTH} 
                                className={`${inputFieldClass} resize-y min-h-[100px]`} 
                                placeholder="Detalles adicionales..."
                            />
                        </div>
                        <p className="text-xs text-right text-slate-500 dark:text-slate-400 mt-1">{task.description?.length || 0} / {DESCRIPTION_MAX_LENGTH}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <CustomSelect
                            label="Estado"
                            options={statusOptions}
                            value={task.status || ''}
                            onChange={val => handleFieldChange('status', val as TaskStatus)}
                        />
                        <CustomSelect
                            label="Prioridad"
                            options={priorityOptions}
                            value={task.priority || ''}
                            onChange={val => handleFieldChange('priority', val as Priority)}
                        />
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Etiquetas</label>
                            <div className="relative bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all" style={{ minHeight: '42px' }}>
                                <div className="flex flex-wrap gap-2 mb-1">
                                    {task.tags?.map(tag => (
                                        <span key={tag} className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2 py-1 rounded-full flex items-center border border-indigo-100 dark:border-indigo-800">
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 flex items-center">
                                                <span className="material-symbols-outlined !text-sm">close</span>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)} 
                                    onKeyDown={handleAddTag} 
                                    placeholder="Escribe y presiona Enter..." 
                                    className="bg-transparent focus:outline-none text-sm w-full text-slate-800 dark:text-slate-200 placeholder-slate-400"
                                />
                            </div>
                        </div>
                    </div>
                </FormCard>
                
                 <FormCard title="Asignación y Equipos" icon="group">
                    <UserSelector label="Asignados" selectedUserIds={task.assignees || []} onToggleUser={(userId) => handleFieldChange('assignees', (task.assignees || []).includes(userId) ? (task.assignees || []).filter(id => id !== userId) : [...(task.assignees || []), userId])} />
                    <UserSelector label="Watchers / Seguidores" selectedUserIds={task.watchers || []} onToggleUser={(userId) => handleFieldChange('watchers', (task.watchers || []).includes(userId) ? (task.watchers || []).filter(id => id !== userId) : [...(task.watchers || []), userId])} />
                     <CustomSelect
                        label="Equipo Responsable"
                        options={teamOptions}
                        value={task.teamId || ''}
                        onChange={val => handleFieldChange('teamId', val)}
                    />
                </FormCard>

                <FormCard title="Planificación" icon="calendar_month">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label>
                            <div className={inputWrapperClass}>
                                <div className={inputIconClass}>
                                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">event</span>
                                </div>
                                <input 
                                    type="date" 
                                    value={task.startDate?.split('T')[0] || ''} 
                                    onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} 
                                    className={inputFieldClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Límite</label>
                            <div className={inputWrapperClass}>
                                <div className={inputIconClass}>
                                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">event_busy</span>
                                </div>
                                <input 
                                    type="date" 
                                    value={task.dueAt?.split('T')[0] || ''} 
                                    onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} 
                                    className={inputFieldClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estimación (horas)</label>
                            <div className={inputWrapperClass}>
                                <div className={inputIconClass}>
                                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">schedule</span>
                                </div>
                                <input 
                                    type="number" 
                                    value={task.estimationHours || ''} 
                                    onChange={e => handleFieldChange('estimationHours', parseFloat(e.target.value) || 0)} 
                                    className={inputFieldClass}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </FormCard>
                
                <FormCard title="Checklist" icon="checklist">
                    <div className="flex justify-between mb-2 items-center">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{completedSubtasks} de {totalSubtasks} completadas</span>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded-lg">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-4">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    <div className="space-y-3">
                        {task.subtasks?.map(st => (
                            <div key={st.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                <Checkbox id={`subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="mt-0.5" />
                                <div className="flex-grow">
                                    <p className={`text-sm font-medium ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{st.text}</p>
                                    {st.notes && <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap mt-1">{st.notes}</p>}
                                </div>
                                <button onClick={() => handleRemoveSubtask(st.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                    
                     <div className="flex items-center gap-2 mt-4 p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                        <input 
                            type="text" 
                            placeholder="Añadir elemento a la lista..." 
                            value={newSubtask.text} 
                            onChange={e => setNewSubtask(s => ({...s, text: e.target.value}))}
                            className="flex-1 bg-transparent focus:outline-none px-3 text-sm py-2"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                        />
                        <button 
                            onClick={handleAddSubtask} 
                            className="bg-indigo-600 text-white font-bold py-1.5 px-3 rounded-lg flex-shrink-0 hover:bg-indigo-700 transition-colors shadow-sm mr-1"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                     </div>
                </FormCard>

                 <FormCard title="Vínculos" icon="link">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                        <div>
                             <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Conexiones de la Tarea</p>
                             {linkedEntitiesCount > 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {linkedEntitiesCount} entidad(es) vinculada(s).
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Conecta esta tarea con clientes, cotizaciones, etc.
                                </p>
                            )}
                        </div>
                        <button 
                            type="button"
                            onClick={() => setIsLinkDrawerOpen(true)}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">link</span>
                            {linkedEntitiesCount > 0 ? 'Gestionar Vínculos' : 'Vincular Entidad'}
                        </button>
                    </div>
                </FormCard>
                
                 <FormCard title="Adjuntos" icon="attach_file">
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <span className="material-symbols-outlined text-3xl text-indigo-500">cloud_upload</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Haz clic o arrastra archivos aquí
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Soporta imágenes, PDF y documentos (Máx 10MB)
                        </p>
                    </div>
                </FormCard>
            </div>
            <LinkEntityDrawer 
                isOpen={isLinkDrawerOpen}
                onClose={() => setIsLinkDrawerOpen(false)}
                onLink={handleLinkEntities}
                linkedEntities={task.links || {}}
            />
        </div>
    );
};

export default NewTaskPage;