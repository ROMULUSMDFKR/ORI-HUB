import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Task, User, Comment } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';

// --- Helper Components ---
const DetailInfoRow: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mr-3">
                <span className="material-symbols-outlined text-lg text-slate-400 dark:text-slate-500">{icon}</span>
            </div>
            <span className="font-medium">{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right">{children}</div>
    </div>
);

const PeopleRow: React.FC<{ user: User, label: string }> = ({ user, label }) => (
    <div className="flex items-center justify-between py-2">
         <div className="flex items-center gap-3">
            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
            <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
         </div>
    </div>
);


const TaskDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialTask, loading: taskLoading } = useDoc<Task>('tasks', id || '');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    
    const [task, setTask] = useState<Task | null>(null);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (initialTask) {
            setTask(initialTask);
        }
    }, [initialTask]);
    
    const usersMap = useMemo(() => {
        if (!users) return new Map<string, User>();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const { assignees, watchers, creator, completedSubtasks, totalSubtasks, progress } = useMemo(() => {
        if (!task) {
            return { assignees: [], watchers: [], creator: null, completedSubtasks: 0, totalSubtasks: 0, progress: 0 };
        }
        const assignees = (task.assignees || []).map(id => usersMap.get(id)).filter(Boolean) as User[];
        const watchers = (task.watchers || []).map(id => usersMap.get(id)).filter(Boolean) as User[];
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
    
    const getPriorityBadgeColor = (priority?: string) => {
        switch (priority) {
            case 'Alta': return 'red';
            case 'Media': return 'yellow';
            case 'Baja': return 'gray';
            default: return 'gray';
        }
    };

    const loading = taskLoading || usersLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!task) return <div className="text-center p-12">Tarea no encontrada</div>;

    return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{task.title}</h1>
                        <Badge text={task.status} color={task.status === 'Hecho' ? 'green' : 'blue'} />
                    </div>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">ID: {task.id}</p>
                </div>
                <Link 
                    to={`/tasks/${task.id}/edit`} 
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-xl flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2 text-base">edit</span>
                    Editar Tarea
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    
                     {/* Description Card */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">description</span>
                            Descripción
                        </h3>
                        {task.description ? (
                             <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">{task.description}</p>
                        ) : (
                            <p className="text-slate-400 italic text-sm">Sin descripción.</p>
                        )}
                    </div>

                    {/* Checklist Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                             <span className="material-symbols-outlined text-indigo-500">checklist</span>
                             Checklist
                        </h3>
                        
                        {totalSubtasks > 0 ? (
                            <>
                                <div className="flex justify-between mb-2 items-center">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{completedSubtasks} de {totalSubtasks} completadas</span>
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded-lg">{progress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-6 overflow-hidden">
                                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="space-y-3">
                                    {task.subtasks?.map(st => (
                                         <div key={st.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                             <Checkbox id={`subtask-detail-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="mt-0.5"/>
                                            <div>
                                                <span className={`text-sm font-medium ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{st.text}</span>
                                                {st.notes && <p className="text-xs text-slate-500 mt-1">{st.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                             <p className="text-slate-400 italic text-sm">No hay sub-tareas.</p>
                        )}
                    </div>
                    
                    {/* Comments Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                             <span className="material-symbols-outlined text-indigo-500">forum</span>
                             Comentarios
                        </h3>
                        
                        <div className="mb-6 relative">
                             <textarea
                                rows={3}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe una nota interna..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 pr-14 resize-none"
                            />
                            <button 
                                onClick={handleAddComment} 
                                disabled={!newComment.trim()}
                                className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined !text-lg">send</span>
                            </button>
                        </div>

                        <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                            {(task.comments && task.comments.length > 0) ? task.comments.map(comment => { 
                                const user = usersMap.get(comment.userId); 
                                return (
                                    <div key={comment.id} className="flex gap-4">
                                        <div className="flex-shrink-0">
                                            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name}`} alt={user?.name} className="w-10 h-10 rounded-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user?.name || 'Usuario'}</span>
                                                    <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Aún no hay comentarios.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Detalles</h3>
                        <div className="space-y-1">
                            <DetailInfoRow icon="priority_high" label="Prioridad"><Badge text={task.priority || 'N/A'} color={getPriorityBadgeColor(task.priority)} /></DetailInfoRow>
                            {task.dueAt && <DetailInfoRow icon="event" label="Vencimiento">{new Date(task.dueAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</DetailInfoRow>}
                            {task.startDate && <DetailInfoRow icon="play_circle" label="Inicio">{new Date(task.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</DetailInfoRow>}
                            {task.estimationHours && <DetailInfoRow icon="timer" label="Estimación">{task.estimationHours}h</DetailInfoRow>}
                            {task.tags && task.tags.length > 0 && (
                                <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-base">label</span> Etiquetas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map(tag => <Badge key={tag} text={tag} color="gray" />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Participantes</h3>
                        <div className="space-y-4">
                            {creator && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Creado por</p>
                                    <div className="flex items-center gap-2">
                                         <img src={creator.avatarUrl || `https://ui-avatars.com/api/?name=${creator.name}`} alt={creator.name} className="w-6 h-6 rounded-full" />
                                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{creator.name}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                 <p className="text-xs text-slate-400 mb-2">Asignados ({assignees.length})</p>
                                 <div className="space-y-1">
                                    {assignees.map(user => <PeopleRow key={user.id} user={user} label="Responsable" />)}
                                 </div>
                            </div>

                            {watchers.length > 0 && (
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 mb-2">Observadores ({watchers.length})</p>
                                    <div className="space-y-1">
                                        {watchers.map(user => <PeopleRow key={user.id} user={user} label="Watcher" />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailPage;