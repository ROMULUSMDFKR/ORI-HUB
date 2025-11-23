
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
import ToggleSwitch from '../components/ui/ToggleSwitch';

// --- Reusable Component Outside ---
const FormCard: React.FC<{ title: string, children: React.ReactNode, icon?: string, className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const NewTaskPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: teams } = useCollection<Team>('teams');
    const { data: allTasks } = useCollection<Task>('tasks');
    const { showToast } = useToast();
    
    // Ref to track if we have already auto-assigned the user
    const hasAssignedSelf = useRef(false);

    const [task, setTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        status: TaskStatus.PorHacer,
        priority: Priority.Media,
        impact: 'Medio',
        assignees: [],
        watchers: [],
        subtasks: [],
        tags: [],
        teamId: '',
        estimationHours: 0,
        actualHours: 0,
        completionPercentage: 0,
        attachments: [],
        links: {},
        isRecurring: false,
        recurrenceFrequency: 'Semanal',
    });
    
    // Dependency management
    const [blockingTaskId, setBlockingTaskId] = useState('');

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
                // Add dependency link if selected
                links: blockingTaskId ? { ...task.links, blockedBy: blockingTaskId } : task.links
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
    const checklistProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    const statusOptions = Object.values(TaskStatus).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));
    const impactOptions = [{ value: 'Alto', name: 'Alto' }, { value: 'Medio', name: 'Medio' }, { value: 'Bajo', name: 'Bajo' }];
    const teamOptions = [{ value: '', name: 'Ninguno' }, ...(teams || []).map(team => ({ value: team.id, name: team.name }))];
    const recurrenceOptions = [{ value: 'Diaria', name: 'Diaria' }, { value: 'Semanal', name: 'Semanal' }, { value: 'Mensual', name: 'Mensual' }];
    
    // Tasks for dependency selection (exclude self, though not created yet)
    const taskOptions = [{value: '', name: 'Ninguna'}, ...(allTasks || []).map(t => ({ value: t.id, name: t.title }))];

    const baseInputClasses = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500";


    return (
        <div className="pb-20">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nueva Tarea</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define el trabajo a realizar y asigna responsables.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/tasks')} disabled={isSaving} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                        {isSaving && <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>}
                        Guardar Tarea
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT COLUMN (8 cols) - Content */}
                <div className="lg:col-span-8 space-y-6">
                    <FormCard title="Información Básica" icon="description">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título <span className="text-red-500">*</span></label>
                            <input type="text" value={task.title} onChange={e => handleFieldChange('title', e.target.value)} className={`w-full text-lg font-medium ${baseInputClasses}`} placeholder="Ej. Revisar reporte mensual" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                            <textarea 
                                value={task.description} 
                                onChange={e => handleFieldChange('description', e.target.value)} 
                                rows={5} 
                                maxLength={DESCRIPTION_MAX_LENGTH} 
                                className={`w-full resize-none ${baseInputClasses}`} 
                                placeholder="Detalles, objetivos y notas..."
                            />
                            <p className="text-xs text-right text-slate-500 dark:text-slate-400 mt-1">{task.description?.length || 0} / {DESCRIPTION_MAX_LENGTH}</p>
                        </div>
                        
                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Etiquetas</label>
                            <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 min-h-[42px] items-center">
                                {task.tags?.map(tag => (
                                    <span key={tag} className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">&times;</button>
                                    </span>
                                ))}
                                <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)} 
                                    onKeyDown={handleAddTag} 
                                    placeholder="Escribe y presiona Enter..." 
                                    className="bg-transparent focus:outline-none flex-grow text-sm p-1"
                                />
                            </div>
                        </div>
                    </FormCard>

                    <FormCard title="Checklist y Ejecución" icon="checklist">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{completedSubtasks} de {totalSubtasks} completadas</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{checklistProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-4">
                            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${checklistProgress}%` }}></div>
                        </div>
                        <div className="space-y-2">
                            {task.subtasks?.map(st => (
                                <div key={st.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/30 rounded-md border border-slate-200 dark:border-slate-600">
                                    <Checkbox id={`subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="" />
                                    <span className={`flex-grow text-sm ${st.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{st.text}</span>
                                    <button onClick={() => handleRemoveSubtask(st.id)} className="text-slate-400 hover:text-red-500 p-1 rounded"><span className="material-symbols-outlined text-lg">close</span></button>
                                </div>
                            ))}
                        </div>
                         <div className="flex items-center gap-2 mt-3">
                            <input 
                                type="text" 
                                placeholder="Añadir elemento..." 
                                value={newSubtask.text} 
                                onChange={e => setNewSubtask(s => ({...s, text: e.target.value}))}
                                className={`flex-1 ${baseInputClasses}`}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                            />
                            <button onClick={handleAddSubtask} className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                Añadir
                            </button>
                         </div>
                    </FormCard>

                     <FormCard title="Dependencias y Vínculos" icon="link">
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Esta tarea está bloqueada por:</label>
                                 <CustomSelect 
                                     options={taskOptions} 
                                     value={blockingTaskId} 
                                     onChange={setBlockingTaskId} 
                                     placeholder="Seleccionar tarea bloqueante..."
                                 />
                             </div>
                             
                             <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
                                {linkedEntitiesCount > 0 ? (
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {linkedEntitiesCount} entidad(es) vinculada(s) (Cliente, Cotización, etc).
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Sin vínculos externos.
                                    </p>
                                )}
                                <button 
                                    type="button"
                                    onClick={() => setIsLinkDrawerOpen(true)}
                                    className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-base">edit_attributes</span>
                                    Gestinar Vínculos
                                </button>
                            </div>
                         </div>
                    </FormCard>
                </div>

                {/* RIGHT COLUMN (4 cols) - Metadata */}
                <div className="lg:col-span-4 space-y-6">
                    
                    <FormCard title="Clasificación" icon="tune">
                        <div className="space-y-4">
                            <CustomSelect label="Estado" options={statusOptions} value={task.status || ''} onChange={val => handleFieldChange('status', val as TaskStatus)} />
                            <div className="grid grid-cols-2 gap-3">
                                <CustomSelect label="Prioridad" options={priorityOptions} value={task.priority || ''} onChange={val => handleFieldChange('priority', val as Priority)} />
                                <CustomSelect label="Impacto" options={impactOptions} value={task.impact || 'Medio'} onChange={val => handleFieldChange('impact', val)} />
                            </div>
                        </div>
                    </FormCard>

                     <FormCard title="Tiempos y Fechas" icon="schedule">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Inicio</label>
                                    <input type="date" value={task.startDate?.split('T')[0] || ''} onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={baseInputClasses} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Vencimiento</label>
                                    <input type="date" value={task.dueAt?.split('T')[0] || ''} onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={baseInputClasses} />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Control de Tiempo (Horas)</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 mb-1">Estimado</label>
                                        <input type="number" value={task.estimationHours || ''} onChange={e => handleFieldChange('estimationHours', parseFloat(e.target.value) || 0)} className={baseInputClasses} placeholder="0" />
                                    </div>
                                     <div className="flex-1">
                                        <label className="block text-xs text-slate-500 mb-1">Real</label>
                                        <input type="number" value={task.actualHours || ''} onChange={e => handleFieldChange('actualHours', parseFloat(e.target.value) || 0)} className={baseInputClasses} placeholder="0" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Progreso Manual ({task.completionPercentage || 0}%)</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="5"
                                    value={task.completionPercentage || 0} 
                                    onChange={e => handleFieldChange('completionPercentage', parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
                                />
                            </div>
                        </div>
                    </FormCard>
                    
                    <FormCard title="Planificación" icon="update">
                         <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tarea Recurrente</span>
                            <ToggleSwitch enabled={task.isRecurring || false} onToggle={() => handleFieldChange('isRecurring', !task.isRecurring)} />
                        </div>
                        {task.isRecurring && (
                             <CustomSelect 
                                label="Frecuencia de Repetición" 
                                options={recurrenceOptions} 
                                value={task.recurrenceFrequency || 'Semanal'} 
                                onChange={val => handleFieldChange('recurrenceFrequency', val)} 
                             />
                        )}
                    </FormCard>

                    <FormCard title="Personas" icon="group">
                        <div className="space-y-4">
                            <UserSelector label="Asignados" selectedUserIds={task.assignees || []} onToggleUser={(userId) => handleFieldChange('assignees', (task.assignees || []).includes(userId) ? (task.assignees || []).filter(id => id !== userId) : [...(task.assignees || []), userId])} />
                            <UserSelector label="Seguidores (Watchers)" selectedUserIds={task.watchers || []} onToggleUser={(userId) => handleFieldChange('watchers', (task.watchers || []).includes(userId) ? (task.watchers || []).filter(id => id !== userId) : [...(task.watchers || []), userId])} />
                            <CustomSelect
                                label="Equipo"
                                options={teamOptions}
                                value={task.teamId || ''}
                                onChange={val => handleFieldChange('teamId', val)}
                            />
                        </div>
                    </FormCard>
                </div>
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
