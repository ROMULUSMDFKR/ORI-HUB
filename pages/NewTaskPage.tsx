
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, Priority, Project, Subtask, User, Team } from '../types';
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
const FormCard: React.FC<{ title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200">{title}</h3>
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

    const baseInputClasses = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500";


    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nueva Tarea</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate(-1)} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Tarea
                    </button>
                </div>
            </div>
            <div className="space-y-6">
                <FormCard title="Información básica">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título <span className="text-red-500">*</span></label>
                        <input type="text" value={task.title} onChange={e => handleFieldChange('title', e.target.value)} className={`w-full ${baseInputClasses}`} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                        <textarea value={task.description} onChange={e => handleFieldChange('description', e.target.value)} rows={4} maxLength={DESCRIPTION_MAX_LENGTH} className={`w-full ${baseInputClasses}`} />
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Etiquetas</label>
                            <div className="mt-1 flex flex-wrap gap-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700" style={{ minHeight: '42px' }}>
                                {task.tags?.map(tag => (
                                    <span key={tag} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium px-2 py-1 rounded-full flex items-center h-6">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">&times;</button>
                                    </span>
                                ))}
                                <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)} 
                                    onKeyDown={handleAddTag} 
                                    placeholder="Añade etiquetas..." 
                                    className="bg-transparent focus:outline-none flex-grow text-sm p-1"
                                />
                            </div>
                        </div>
                    </div>
                </FormCard>
                
                 <FormCard title="Asignación y equipos">
                    <UserSelector label="Asignados" selectedUserIds={task.assignees || []} onToggleUser={(userId) => handleFieldChange('assignees', (task.assignees || []).includes(userId) ? (task.assignees || []).filter(id => id !== userId) : [...(task.assignees || []), userId])} />
                    <UserSelector label="Watchers / Seguidores" selectedUserIds={task.watchers || []} onToggleUser={(userId) => handleFieldChange('watchers', (task.watchers || []).includes(userId) ? (task.watchers || []).filter(id => id !== userId) : [...(task.watchers || []), userId])} />
                     <CustomSelect
                        label="Equipo"
                        options={teamOptions}
                        value={task.teamId || ''}
                        onChange={val => handleFieldChange('teamId', val)}
                    />
                </FormCard>

                <FormCard title="Fechas y estimación">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label><input type="date" value={task.startDate?.split('T')[0] || ''} onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={`w-full ${baseInputClasses}`} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Límite</label><input type="date" value={task.dueAt?.split('T')[0] || ''} onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={`w-full ${baseInputClasses}`} /></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estimación (horas)</label>
                        <input type="number" value={task.estimationHours || ''} onChange={e => handleFieldChange('estimationHours', parseFloat(e.target.value) || 0)} className={`w-full ${baseInputClasses}`} />
                    </div>
                </FormCard>
                
                <FormCard title="Checklist">
                    <div className="flex justify-between mb-1"><span className="text-xs font-medium text-slate-700 dark:text-slate-300">{completedSubtasks} de {totalSubtasks} completadas</span><span className="text-xs font-medium text-slate-700 dark:text-slate-300">{progress.toFixed(0)}%</span></div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                    <div className="space-y-3 mt-4">
                        {task.subtasks?.map(st => (
                            <div key={st.id} className="flex items-start gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <Checkbox id={`subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="mt-1" />
                                <div className="flex-grow">
                                    <p className={`text-sm ${st.isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{st.text}</p>
                                    {st.notes && <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{st.notes}</p>}
                                </div>
                                <button onClick={() => handleRemoveSubtask(st.id)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                            </div>
                        ))}
                    </div>
                     <div className="flex items-center gap-2 mt-4 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <input 
                            type="text" 
                            placeholder="Añadir elemento..." 
                            value={newSubtask.text} 
                            onChange={e => setNewSubtask(s => ({...s, text: e.target.value}))}
                            className="flex-1 bg-transparent focus:outline-none"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                        />
                        <button 
                            onClick={handleAddSubtask} 
                            className="bg-indigo-600 text-white font-semibold py-1 px-3 rounded-md flex-shrink-0"
                        >
                            Añadir
                        </button>
                     </div>
                </FormCard>

                 <FormCard title="Vínculos a entidades">
                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                        {linkedEntitiesCount > 0 ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                {linkedEntitiesCount} entidad(es) vinculada(s).
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Sin vínculos. Conecta esta tarea con clientes, cotizaciones, etc.
                            </p>
                        )}
                        <button 
                            type="button"
                            onClick={() => setIsLinkDrawerOpen(true)}
                            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold py-1 px-3 rounded-md flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            <span className="material-symbols-outlined text-base">link</span>
                            {linkedEntitiesCount > 0 ? 'Editar Vínculos' : 'Vincular'}
                        </button>
                    </div>
                </FormCard>
                
                 <FormCard title="Adjuntos">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">cloud_upload</span>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                            Arrastra y suelta un archivo <span className="font-semibold">.JSON</span> o <span className="font-semibold">.CSV</span> aquí, o haz clic para seleccionarlo.
                        </p>
                        <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-semibold py-2 px-4 rounded-md flex items-center gap-2 mt-4 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <span className="material-symbols-outlined text-base">upload_file</span>
                            Seleccionar Archivo
                        </button>
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
