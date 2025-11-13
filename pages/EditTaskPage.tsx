import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Task, TaskStatus, Priority, Project, Subtask, User, Team } from '../types';
import { MOCK_USERS, MOCK_PROJECTS } from '../../data/mockData';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';
import UserSelector from '../components/ui/UserSelector';
import CustomSelect from '../components/ui/CustomSelect';

const FormCard: React.FC<{ title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
        <h3 className="text-xl font-bold mb-6 text-on-surface">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);


const EditTaskPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialTask, loading } = useDoc<Task>('tasks', id || '');
    const { data: teams } = useCollection<Team>('teams');
    
    const [task, setTask] = useState<Partial<Task> | null>(null);
    const [newTag, setNewTag] = useState('');
    const [newSubtask, setNewSubtask] = useState({ text: '', notes: '' });
    
    const DESCRIPTION_MAX_LENGTH = 2000;

    useEffect(() => {
        if (initialTask) {
            setTask(initialTask);
        }
    }, [initialTask]);

    const handleFieldChange = (field: keyof Task, value: any) => {
        setTask(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (!task || !task.title?.trim()) {
            alert('El título es requerido.');
            return;
        }
        console.log("Updating task:", task);
        alert(`Tarea "${task.title}" actualizada (simulación).`);
        navigate(`/tasks/${id}`);
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            const currentTags = task?.tags || [];
            if (!currentTags.includes(newTag.trim())) {
                handleFieldChange('tags', [...currentTags, newTag.trim()]);
            }
            setNewTag('');
        }
    };
    const handleRemoveTag = (tagToRemove: string) => {
        handleFieldChange('tags', (task?.tags || []).filter(tag => tag !== tagToRemove));
    };

    const handleAddSubtask = () => {
        if (newSubtask.text.trim()) {
            const subtask: Subtask = { id: `sub-${Date.now()}`, text: newSubtask.text, notes: newSubtask.notes, isCompleted: false };
            handleFieldChange('subtasks', [...(task?.subtasks || []), subtask]);
            setNewSubtask({ text: '', notes: '' });
        }
    };
    const handleToggleSubtask = (subtaskId: string) => {
        const newSubtasks = (task?.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        handleFieldChange('subtasks', newSubtasks);
    };
    const handleRemoveSubtask = (subtaskId: string) => {
        const newSubtasks = (task?.subtasks || []).filter(st => st.id !== subtaskId);
        handleFieldChange('subtasks', newSubtasks);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!task) return <div className="text-center p-12">Tarea no encontrada</div>;

    const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    const statusOptions = Object.values(TaskStatus).map(s => ({ value: s, name: s }));
    const priorityOptions = Object.values(Priority).map(p => ({ value: p, name: p }));
    const teamOptions = [{ value: '', name: 'Ninguno' }, ...(teams || []).map(team => ({ value: team.id, name: team.name }))];

    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-on-surface">Editar Tarea</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/tasks/${id}`)} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
                </div>
            </div>
             <div className="space-y-6">
                <FormCard title="Información básica">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
                        <input type="text" value={task.title} onChange={e => handleFieldChange('title', e.target.value)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea value={task.description} onChange={e => handleFieldChange('description', e.target.value)} rows={4} maxLength={DESCRIPTION_MAX_LENGTH} />
                        <p className="text-xs text-right text-gray-500 mt-1">{task.description?.length || 0} / {DESCRIPTION_MAX_LENGTH}</p>
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
                            <label className="block text-sm font-medium text-gray-700">Etiquetas</label>
                            <div className="mt-1 flex flex-wrap gap-1 p-2 border border-border rounded-md bg-surface-inset" style={{ minHeight: '42px' }}>
                                {task.tags?.map(tag => (
                                    <span key={tag} className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full flex items-center h-6">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-gray-500 hover:text-gray-800">&times;</button>
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
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label><input type="date" value={task.startDate?.split('T')[0] || ''} onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}/></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label><input type="date" value={task.dueAt?.split('T')[0] || ''} onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}/></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimación (horas)</label>
                        <input type="number" value={task.estimationHours || ''} onChange={e => handleFieldChange('estimationHours', parseFloat(e.target.value) || 0)}/>
                    </div>
                </FormCard>
                
                <FormCard title="Checklist">
                    <div className="flex justify-between mb-1"><span className="text-xs font-medium text-gray-700">{completedSubtasks} de {totalSubtasks} completadas</span><span className="text-xs font-medium text-gray-700">{progress.toFixed(0)}%</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                    <div className="space-y-3 mt-4">
                        {task.subtasks?.map(st => (
                            <div key={st.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                                <Checkbox id={`subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="mt-1" />
                                <div className="flex-grow">
                                    <p className={`text-sm ${st.isCompleted ? 'line-through text-gray-500' : ''}`}>{st.text}</p>
                                    {st.notes && <p className="text-xs text-gray-500 whitespace-pre-wrap">{st.notes}</p>}
                                </div>
                                <button onClick={() => handleRemoveSubtask(st.id)} className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                            </div>
                        ))}
                    </div>
                     <div className="flex items-center gap-2 mt-4 p-2 border border-border rounded-lg bg-surface-inset">
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
                            className="bg-accent text-on-dark font-semibold py-1 px-3 rounded-md flex-shrink-0"
                        >
                            Añadir
                        </button>
                     </div>
                </FormCard>

                 <FormCard title="Vínculos a entidades">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-500">Sin vínculos. Conecta esta tarea con clientes, cotizaciones, etc.</p>
                        <button className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-1 px-3 rounded-md flex items-center gap-1"><span className="material-symbols-outlined text-base">link</span>Vincular</button>
                    </div>
                </FormCard>
                
                 <FormCard title="Adjuntos">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                        <p className="text-sm text-gray-500">Arrastra archivos aquí o haz clic para seleccionar.</p>
                        <button className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-2 px-4 rounded-md flex items-center gap-2 mt-4"><span className="material-symbols-outlined text-base">upload</span>Cargar archivo</button>
                    </div>
                </FormCard>
            </div>
        </div>
    );
};

export default EditTaskPage;