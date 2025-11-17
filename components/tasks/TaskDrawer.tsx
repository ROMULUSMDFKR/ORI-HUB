

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Drawer from '../ui/Drawer';
import { Task, TaskStatus, Priority, User, Project, Comment, Subtask } from '../../types';
import { MOCK_USERS, MOCK_PROJECTS } from '../../data/mockData';
import Badge from '../ui/Badge';
import Checkbox from '../ui/Checkbox';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Partial<Task> | null;
  onSave: (task: Task) => void;
}

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
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{label}</label>
            <div className="mt-1">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 mt-1 block w-full rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-left flex items-center gap-2 flex-wrap min-h-[42px]">
                    {selectedUsers.length > 0 ? selectedUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-1 bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5 text-sm">
                            <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full"/>
                            {user.name}
                        </div>
                    )) : <span className="text-slate-400 dark:text-slate-500">Seleccionar...</span>}
                </button>
                {isOpen && (
                    <div className="border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 absolute z-10 w-full max-w-sm">
                        <div className="p-2"><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full text-sm p-1 border-slate-300 dark:border-slate-600 rounded-md"/></div>
                        <ul className="max-h-48 overflow-y-auto">
                            {filteredUsers.map(user => (
                                <li key={user.id}>
                                    <Checkbox
                                        id={`drawer-user-select-${user.id}`}
                                        checked={selectedUserIds?.includes(user.id)}
                                        onChange={() => onToggleUser(user.id)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 w-full"
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

const TaskDrawer: React.FC<TaskDrawerProps> = ({ isOpen, onClose, task, onSave }) => {
    const [editedTask, setEditedTask] = useState<Partial<Task>>({});
    const [newComment, setNewComment] = useState('');
    const [newTag, setNewTag] = useState('');
    const [newSubtask, setNewSubtask] = useState('');
    
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);
    const [userSuggestionQuery, setUserSuggestionQuery] = useState('');
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            setEditedTask(task || {
                title: '',
                status: TaskStatus.PorHacer,
                priority: Priority.Media,
                assignees: [],
                watchers: [],
                comments: [],
                subtasks: [],
                tags: []
            });
        }
    }, [task, isOpen]);
    
    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!editedTask.title?.trim()) {
            alert('El título es requerido.');
            return;
        }
        const finalTask: Task = {
            id: editedTask.id || `task-${Date.now()}`,
            title: editedTask.title,
            status: editedTask.status || TaskStatus.PorHacer,
            assignees: editedTask.assignees || [],
            watchers: editedTask.watchers || [],
            ...editedTask,
        };
        onSave(finalTask);
    };

    // --- Tags ---
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            const currentTags = editedTask.tags || [];
            if (!currentTags.includes(newTag.trim())) {
                handleFieldChange('tags', [...currentTags, newTag.trim()]);
            }
            setNewTag('');
        }
    };
    const handleRemoveTag = (tagToRemove: string) => {
        handleFieldChange('tags', (editedTask.tags || []).filter(tag => tag !== tagToRemove));
    };

    // --- Subtasks ---
    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            const subtask: Subtask = { id: `sub-${Date.now()}`, text: newSubtask, isCompleted: false };
            handleFieldChange('subtasks', [...(editedTask.subtasks || []), subtask]);
            setNewSubtask('');
        }
    };
    const handleToggleSubtask = (subtaskId: string) => {
        const newSubtasks = (editedTask.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        handleFieldChange('subtasks', newSubtasks);
    };

    // --- Comments & Mentions ---
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewComment(text);
        
        const mentionMatch = text.match(/@(\w*)$/);
        if (mentionMatch) {
            setShowUserSuggestions(true);
            setUserSuggestionQuery(mentionMatch[1]);
        } else {
            setShowUserSuggestions(false);
        }
    };
    
    const handleAddComment = () => {
        if (newComment.trim() === '') return;
        const comment: Comment = { id: `comment-${Date.now()}`, text: newComment, userId: 'user-1', createdAt: new Date().toISOString() };
        handleFieldChange('comments', [...(editedTask.comments || []), comment]);
        setNewComment('');
    };

    const handleMentionSelect = (userName: string) => {
        setNewComment(prev => prev.replace(/@\w*$/, `@${userName} `));
        setShowUserSuggestions(false);
        commentInputRef.current?.focus();
    };
    
    const userSuggestions = useMemo(() => {
        if (!userSuggestionQuery) return [];
        return Object.values(MOCK_USERS).filter(u => u.name.toLowerCase().startsWith(userSuggestionQuery.toLowerCase()));
    }, [userSuggestionQuery]);
    
    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={task?.id ? 'Editar Tarea' : 'Nueva Tarea'}>
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto pr-2 -mr-6 pl-1 -ml-6 py-1">
                    <div className="space-y-6 px-6">
                        <input type="text" value={editedTask.title || ''} onChange={e => handleFieldChange('title', e.target.value)} className="w-full text-lg font-semibold bg-transparent focus:outline-none" placeholder="Título de la tarea..." />
                        
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Estado</label><select value={editedTask.status || ''} onChange={e => handleFieldChange('status', e.target.value as TaskStatus)}>{Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Prioridad</label><select value={editedTask.priority || ''} onChange={e => handleFieldChange('priority', e.target.value as Priority)}>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select></div></div>
                        
                        <UserSelector label="Asignados" selectedUserIds={editedTask.assignees || []} onToggleUser={(userId) => handleFieldChange('assignees', (editedTask.assignees || []).includes(userId) ? (editedTask.assignees || []).filter(id => id !== userId) : [...(editedTask.assignees || []), userId])} />
                        <UserSelector label="Seguidores" selectedUserIds={editedTask.watchers || []} onToggleUser={(userId) => handleFieldChange('watchers', (editedTask.watchers || []).includes(userId) ? (editedTask.watchers || []).filter(id => id !== userId) : [...(editedTask.watchers || []), userId])} />

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Inicio</label><input type="date" value={editedTask.startDate?.split('T')[0] || ''} onChange={e => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}/></div>
                            <div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Vencimiento</label><input type="date" value={editedTask.dueAt?.split('T')[0] || ''} onChange={e => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}/></div>
                        </div>

                        <div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Proyecto</label><select value={editedTask.projectId || ''} onChange={e => handleFieldChange('projectId', e.target.value)}><option value="">Ninguno</option>{MOCK_PROJECTS.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        
                        <div><label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Etiquetas</label><div className="flex flex-wrap gap-2 mt-1">{editedTask.tags?.map(tag => <div key={tag} className="flex items-center gap-1 bg-gray-200 rounded-full pl-2 pr-1 text-sm"><Badge text={tag} /><button onClick={() => handleRemoveTag(tag)} className="text-gray-500 hover:text-gray-800">&times;</button></div>)}</div><input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={handleAddTag} placeholder="Añade una etiqueta y presiona Enter" className="mt-2" /></div>

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Sub-tareas</h4>
                            <div className="space-y-2">{editedTask.subtasks?.map(st => (
                                <div key={st.id}>
                                    <Checkbox id={`drawer-subtask-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)}>
                                        <span className={`text-sm ${st.isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>{st.text}</span>
                                    </Checkbox>
                                </div>
                            ))}</div>
                            <div className="mt-2 flex gap-2"><input type="text" placeholder="Añadir sub-tarea..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} className="flex-1" /><button onClick={handleAddSubtask} className="bg-indigo-600 text-white font-semibold px-3 rounded-lg shadow-sm">Añadir</button></div>
                        </div>

                        {task?.id && (
                            <div className="border-t pt-4 relative">
                                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Comentarios</h4>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">{editedTask.comments?.map(comment => { const user = Object.values(MOCK_USERS).find(u => u.id === comment.userId); return (<div key={comment.id} className="flex items-start gap-2"><img src={user?.avatarUrl} alt={user?.name} className="w-6 h-6 rounded-full mt-1" /><div className="flex-1 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg"><p className="text-xs font-semibold">{user?.name} <span className="font-normal text-slate-500 dark:text-slate-400 ml-2">{new Date(comment.createdAt).toLocaleString()}</span></p><p className="text-sm mt-1">{comment.text}</p></div></div>);})}</div>
                                {showUserSuggestions && userSuggestions.length > 0 && (<div className="absolute bottom-20 mb-2 w-full bg-white dark:bg-slate-800 border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto"><ul>{userSuggestions.map(user => (<li key={user.id} onClick={() => handleMentionSelect(user.name)} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" /><span className="text-sm">{user.name}</span></li>))}</ul></div>)}
                                <div className="mt-4 flex gap-2"><textarea ref={commentInputRef} placeholder="Añadir un comentario... (@ para mencionar)" value={newComment} onChange={handleCommentChange} rows={2} className="flex-1"/><button onClick={handleAddComment} className="bg-indigo-600 text-white font-semibold px-3 rounded-lg shadow-sm self-end h-10">Enviar</button></div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 -mx-6 -mb-6 mt-6"><button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button><button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">{task?.id ? 'Guardar Cambios' : 'Crear Tarea'}</button></div>
            </div>
        </Drawer>
    );
};

export default TaskDrawer;