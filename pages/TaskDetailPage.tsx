import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Task, User, Comment } from '../types';
// FIX: Removed MOCK_USERS import and will fetch users via a hook.
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';

// --- Helper Components ---
const DetailInfoRow: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-base w-6 mr-2">{icon}</span>
            <span>{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right">{children}</div>
    </div>
);

const PeopleRow: React.FC<{ user: User }> = ({ user }) => (
    <div className="flex items-center gap-2 py-1">
        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
        <span className="text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
    </div>
);


const TaskDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialTask, loading: taskLoading } = useDoc<Task>('tasks', id || '');
    // FIX: Fetch users from the collection to replace mock data.
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    
    const [task, setTask] = useState<Task | null>(null);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (initialTask) {
            setTask(initialTask);
        }
    }, [initialTask]);
    
    // FIX: Create a memoized map for efficient user lookups.
    const usersMap = useMemo(() => {
        if (!users) return new Map<string, User>();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const { assignees, watchers, creator, completedSubtasks, totalSubtasks, progress } = useMemo(() => {
        if (!task) {
            return { assignees: [], watchers: [], creator: null, completedSubtasks: 0, totalSubtasks: 0, progress: 0 };
        }
        // FIX: Use the usersMap to get full user objects. This fixes type errors.
        const assignees = task.assignees.map(id => usersMap.get(id)).filter(Boolean) as User[];
        const watchers = task.watchers.map(id => usersMap.get(id)).filter(Boolean) as User[];
        const creator = task.createdById ? usersMap.get(task.createdById) || null : null;
        
        const completed = task.subtasks?.filter(st => st.isCompleted).length || 0;
        const total = task.subtasks?.length || 0;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        return { assignees, watchers, creator, completedSubtasks: completed, totalSubtasks: total, progress };
    }, [task, usersMap]);


    const handleAddComment = () => {
        if (newComment.trim() === '' || !task) return;
        const comment: Comment = { id: `comment-${Date.now()}`, text: newComment, userId: 'user-1', createdAt: new Date().toISOString() };
        setTask(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
        setNewComment('');
    };
    
    const handleToggleSubtask = (subtaskId: string) => {
        if (task) {
            const newSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st);
            setTask(prev => prev ? { ...prev, subtasks: newSubtasks } : null);
        }
    };

    // FIX: Combine loading states.
    const loading = taskLoading || usersLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!task) return <div className="text-center p-12">Tarea no encontrada</div>;

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{task.title}</h1>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mt-1">ID: {task.id}</p>
                </div>
                <Link 
                    to={`/tasks/${task.id}/edit`} 
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2 text-base">edit</span>
                    Editar Tarea
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {task.description && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-2">Descripción</h3>
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {totalSubtasks > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-2">Checklist</h3>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{completedSubtasks} de {totalSubtasks} completadas</span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-4">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="space-y-2">
                                {task.subtasks?.map(st => (
                                     <Checkbox key={st.id} id={`subtask-detail-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)}>
                                        <span className={`text-sm ${st.isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{st.text}</span>
                                    </Checkbox>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Comentarios</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nuevo comentario</label>
                                <textarea
                                    rows={3}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escribe una nota interna..."
                                />
                                <div className="text-right mt-2">
                                    <button onClick={handleAddComment} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:opacity-90">
                                        Guardar nota
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                                {/* FIX: Use the typesafe usersMap to get the comment author. */}
                                {(task.comments && task.comments.length > 0) ? task.comments.map(comment => { 
                                    const user = usersMap.get(comment.userId); 
                                    return (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <img src={user?.avatarUrl} alt={user?.name} className="w-8 h-8 rounded-full mt-1" />
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                                                <p className="text-xs font-semibold">{user?.name} <span className="font-normal text-slate-500 dark:text-slate-400 ml-2">{new Date(comment.createdAt).toLocaleString()}</span></p>
                                                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                                            </div>
                                        </div>
                                    );
                                }) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Aún no hay comentarios para este registro.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-2">Detalles</h3>
                        <div className="space-y-1">
                            <DetailInfoRow icon="fiber_manual_record" label="Estado"><Badge text={task.status} color="blue" /></DetailInfoRow>
                            <DetailInfoRow icon="priority_high" label="Prioridad"><Badge text={task.priority || 'N/A'} color="yellow" /></DetailInfoRow>
                            {task.createdAt && <DetailInfoRow icon="calendar_add_on" label="Creada">{new Date(task.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</DetailInfoRow>}
                            {creator && <DetailInfoRow icon="person" label="Creado por">{creator.name}</DetailInfoRow>}
                            {task.dueAt && <DetailInfoRow icon="event" label="Vencimiento">{new Date(task.dueAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</DetailInfoRow>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Personas</h3>
                        <div>
                            <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Asignados</h4>
                            {assignees.map(user => <PeopleRow key={user.id} user={user} />)}
                        </div>
                         <div className="mt-4">
                            <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Observadores</h4>
                            {watchers.length > 0 ? watchers.map(user => <PeopleRow key={user.id} user={user} />) : <p className="text-sm text-slate-500 dark:text-slate-400">Nadie observando</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailPage;