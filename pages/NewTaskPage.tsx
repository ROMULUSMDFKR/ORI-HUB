
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, Priority, Project, Subtask, User, Comment } from '../types';
import { MOCK_USERS, MOCK_PROJECTS } from '../data/mockData';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';

const UserSelector: React.FC<{
    label: string;
    selectedUserIds: string[];
    onToggleUser: (userId: string) => void;
}> = ({ label, selectedUserIds, onToggleUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedUsers = useMemo(() =>
        uniqueUsers.filter(u => selectedUserIds?.includes(u.id)),
        [selectedUserIds, uniqueUsers]
    );

    const filteredUsers = useMemo(() =>
        uniqueUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
        [search, uniqueUsers]
    );

    return (
        <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-on-surface-secondary">{label}</label>
            <div className="mt-1">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="bg-surface-inset border border-border mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary text-left flex items-center gap-2 flex-wrap min-h-[42px]">
                    {selectedUsers.length > 0 ? selectedUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-0.5 text-sm">
                            <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full"/>
                            {user.name}
                        </div>
                    )) : <span className="text-gray-400">Seleccionar...</span>}
                </button>
                {isOpen && (
                    <div className="border bg-surface rounded-md shadow-lg mt-1 absolute z-10 w-full">
                        <div className="p-2"><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full text-sm p-1 border-border rounded-md"/></div>
                        <ul className="max-h-48 overflow-y-auto">
                            {filteredUsers.map(user => (
                                <li key={user.id}>
                                    <Checkbox
                                        id={`new-task-user-${user.id}`}
                                        checked={selectedUserIds?.includes(user.id)}
                                        onChange={() => onToggleUser(user.id)}
                                        className="w-full p-2 hover:bg-background"
                                    >
                                      <div className="flex items-center gap-2">
                                        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full"/>
                                        <span className="text-sm">{user.name}</span>
                                      </div>
                                    </Checkbox>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}


const NewTaskPage: React.FC = () => {
    const navigate = useNavigate();
    const [task, setTask] = useState<Partial<Task>>({
        title: '',
        status: TaskStatus.PorHacer,
        priority: Priority.Media,
        assignees: [],
        watchers: [],
        comments: [],
        subtasks: [],
        tags: []
    });
    const [newTag, setNewTag] = useState('');
    const [newSubtask, setNewSubtask] = useState('');

    const handleFieldChange = (field: keyof Task, value: any) => {
        setTask(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!task.title?.trim()) {
            alert('El título es requerido.');
            return;
        }
        const finalTask: Task = {
            id: `task-${Date.now()}`,
            title: task.title,
            status: task.status || TaskStatus.PorHacer,
            assignees: task.assignees || [],
            watchers: task.watchers || [],
            ...task,
        };
        console.log("Creating new task:", finalTask);
        alert(`Tarea "${finalTask.title}" creada (simulación).`);
        navigate('/tasks');
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
        if (newSubtask.trim()) {
            const subtask: Subtask = { id: `sub-${Date.now()}`, text: newSubtask, isCompleted: false };
            handleFieldChange('subtasks', [...(task.subtasks || []), subtask]);
            setNewSubtask('');
        }
    };
    const handleToggleSubtask = (subtaskId: string) => {
        const newSubtasks = (task.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        handleFieldChange('subtasks', newSubtasks);
    };

    const sharedInputClass = "mt-1 block w-full border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-surface-inset text-on-surface";
    
    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-on-surface">Crear Nueva Tarea</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate(-1)} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm">Crear Tarea</button>
                </div>
            </div>
            <div className="bg-surface p-6 rounded-xl shadow-sm border border-border space-y-6">
                <input type="text" value={task.title || ''} onChange={e => handleFieldChange('title', e.target.value)} className="w-full text-xl font-semibold bg-transparent focus:outline-none border-b pb-2" placeholder="Título de la tarea..." />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-on-surface-secondary">Estado</label><select value={task.status || ''} onChange={e => handleFieldChange('status', e.target.value as TaskStatus)} className={sharedInputClass}>{Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-on-surface-secondary">Prioridad</label><select value={task.priority || ''} onChange={e => handleFieldChange('priority', e.target.value as Priority)} className={sharedInputClass}>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-on-surface-secondary">Fecha de Inicio</label><input type="date" value={task.startDate?.split('T')[0] || ''} onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={sharedInputClass}/></div>
                            <div><label className="block text-sm font-medium text-on-surface-secondary">Fecha de Vencimiento</label><input type="date" value={task.dueAt?.split('T')[0] || ''} onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={sharedInputClass}/></div>
                        </div>
                        <div><label className="block text-sm font-medium text-on-surface-secondary">Proyecto</label><select value={task.projectId || ''} onChange={e => handleFieldChange('projectId', e.target.value)} className={sharedInputClass}><option value="">Ninguno</option>{MOCK_PROJECTS.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-on-surface-secondary">Etiquetas</label><div className="flex flex-wrap gap-2 mt-1">{task.tags?.map(tag => <div key={tag} className="flex items-center gap-1 bg-gray-200 rounded-full pl-2 pr-1 text-sm"><Badge text={tag} /><button onClick={() => handleRemoveTag(tag)} className="text-gray-500 hover:text-gray-800">&times;</button></div>)}</div><input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={handleAddTag} placeholder="Añade una etiqueta y presiona Enter" className={`${sharedInputClass} mt-2`} /></div>
                    </div>
                     <div className="space-y-6">
                        <UserSelector label="Asignados" selectedUserIds={task.assignees || []} onToggleUser={(userId) => handleFieldChange('assignees', (task.assignees || []).includes(userId) ? (task.assignees || []).filter(id => id !== userId) : [...(task.assignees || []), userId])} />
                        <UserSelector label="Seguidores" selectedUserIds={task.watchers || []} onToggleUser={(userId) => handleFieldChange('watchers', (task.watchers || []).includes(userId) ? (task.watchers || []).filter(id => id !== userId) : [...(task.watchers || []), userId])} />
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold text-on-surface-secondary mb-2">Sub-tareas</h4>
                            <div className="space-y-2">{task.subtasks?.map(st => (
                                <div key={st.id}>
                                    <Checkbox id={`subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)}>
                                        <span className={`text-sm ${st.isCompleted ? 'line-through text-on-surface-secondary' : ''}`}>{st.text}</span>
                                    </Checkbox>
                                </div>
                            ))}</div>
                            <div className="mt-2 flex gap-2"><input type="text" placeholder="Añadir sub-tarea..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} className={`${sharedInputClass} flex-1`} /><button type="button" onClick={handleAddSubtask} className="bg-primary text-on-primary font-semibold px-3 rounded-lg shadow-sm">Añadir</button></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewTaskPage;
