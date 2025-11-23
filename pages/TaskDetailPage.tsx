
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Task, User, Comment, TaskStatus, Priority } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

// --- Helper Components ---
const DetailInfoRow: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-base w-6 mr-2">{icon}</span>
            <span>{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right">{children}</div>
    </div>
);

const PeopleRow: React.FC<{ user: User }> = ({ user }) => (
    <div className="flex items-center gap-2 py-1">
        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
        <span className="text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
    </div>
);

const TaskDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialTask, loading: taskLoading } = useDoc<Task>('tasks', id || '');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    
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

    const { assignees, watchers, creator, completedSubtasks, totalSubtasks, checklistProgress } = useMemo(() => {
        if (!task) {
            return { assignees: [], watchers: [], creator: null, completedSubtasks: 0, totalSubtasks: 0, checklistProgress: 0 };
        }
        const assignees = (task.assignees || []).map(id => usersMap.get(id)).filter(Boolean) as User[];
        const watchers = (task.watchers || []).map(id => usersMap.get(id)).filter(Boolean) as User[];
        const creator = task.createdById ? usersMap.get(task.createdById) || null : null;
        
        const completed = task.subtasks?.filter(st => st.isCompleted).length || 0;
        const total = task.subtasks?.length || 0;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        return { assignees, watchers, creator, completedSubtasks: completed, totalSubtasks: total, checklistProgress: progress };
    }, [task, usersMap]);


    const handleAddComment = async () => {
        if (newComment.trim() === '' || !task || !currentUser) return;
        const comment: Comment = { id: `comment-${Date.now()}`, text: newComment, userId: currentUser.id, createdAt: new Date().toISOString() };
        
        try {
            const updatedComments = [...(task.comments || []), comment];
            await api.updateDoc('tasks', task.id, { comments: updatedComments });
            setTask({ ...task, comments: updatedComments });
            setNewComment('');
            showToast('success', 'Comentario agregado.');
        } catch (error) {
            console.error("Error adding comment", error);
            showToast('error', 'Error al agregar comentario.');
        }
    };
    
    const handleToggleSubtask = async (subtaskId: string) => {
        if (!task) return;
        const newSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st);
        
        // Optimistic Update
        setTask({ ...task, subtasks: newSubtasks });
        try {
            await api.updateDoc('tasks', task.id, { subtasks: newSubtasks });
        } catch (error) {
            console.error("Error toggling subtask", error);
            // Revert if needed
        }
    };

    const loading = taskLoading || usersLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!task) return <div className="text-center p-12">Tarea no encontrada</div>;

    // Determine color for priority
    const priorityColor = task.priority === 'Alta' ? 'red' : task.priority === 'Media' ? 'yellow' : 'gray';

    return (
        <div className="pb-10">
            {/* Header with Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{task.title}</h1>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
                             ID: {task.id}
                             <span className="mx-1">•</span>
                             <Badge text={task.status} color={task.status === TaskStatus.Hecho ? 'green' : task.status === TaskStatus.EnProgreso ? 'blue' : 'gray'} />
                        </div>
                    </div>
                    <Link 
                        to={`/tasks/${task.id}/edit`} 
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors"
                    >
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar Tarea
                    </Link>
                </div>
                
                {/* Main Progress Visual */}
                <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden relative group">
                     <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500" 
                        style={{ width: `${task.completionPercentage || 0}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.completionPercentage}% Completado
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Description, Checklist, Comments */}
                <div className="lg:col-span-2 space-y-6">
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">description</span> Descripción
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {task.description || <span className="italic text-slate-400">Sin descripción.</span>}
                        </p>
                        {task.tags && task.tags.length > 0 && (
                             <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                 {task.tags.map(tag => (
                                     <span key={tag} className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                                         #{tag}
                                     </span>
                                 ))}
                             </div>
                        )}
                    </div>

                    {/* Time Tracking Widget */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">timelapse</span> Seguimiento de Tiempo
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center border border-slate-100 dark:border-slate-600">
                                 <p className="text-xs text-slate-500 uppercase font-bold">Estimado</p>
                                 <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{task.estimationHours || 0}h</p>
                             </div>
                             <div className={`p-3 rounded-lg text-center border ${ (task.actualHours || 0) > (task.estimationHours || 0) ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' }`}>
                                 <p className={`text-xs uppercase font-bold ${ (task.actualHours || 0) > (task.estimationHours || 0) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400' }`}>Real</p>
                                 <p className={`text-2xl font-bold ${ (task.actualHours || 0) > (task.estimationHours || 0) ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300' }`}>{task.actualHours || 0}h</p>
                             </div>
                        </div>
                    </div>

                    {totalSubtasks > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">checklist</span> Checklist
                                </h3>
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{checklistProgress.toFixed(0)}%</span>
                            </div>
                            
                            <div className="space-y-2">
                                {task.subtasks?.map(st => (
                                     <div key={st.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-md transition-colors">
                                         <Checkbox id={`subtask-detail-${st.id}`} checked={st.isCompleted} onChange={() => handleToggleSubtask(st.id)} className="mt-0.5" />
                                         <div>
                                             <p className={`text-sm ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{st.text}</p>
                                             {st.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{st.notes}</p>}
                                         </div>
                                     </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">forum</span> Comentarios
                        </h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    rows={3}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escribe una nota interna o actualización..."
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-16 resize-none"
                                />
                                <button 
                                    onClick={handleAddComment} 
                                    className="absolute bottom-3 right-3 bg-indigo-600 text-white p-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                                    disabled={!newComment.trim()}
                                >
                                    <span className="material-symbols-outlined text-lg block">send</span>
                                </button>
                            </div>

                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 pt-2">
                                {(task.comments && task.comments.length > 0) ? task.comments.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(comment => { 
                                    const user = usersMap.get(comment.userId); 
                                    return (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <img src={user?.avatarUrl} alt={user?.name} className="w-8 h-8 rounded-full mt-1 object-cover" />
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{user?.name}</p>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                                            </div>
                                        </div>
                                    );
                                }) : <p className="text-sm text-center text-slate-400 py-4 italic">No hay comentarios aún.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Metadata */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Detalles Clave</h3>
                        <div className="space-y-1">
                            <DetailInfoRow icon="flag" label="Prioridad"><Badge text={task.priority || 'Media'} color={priorityColor} /></DetailInfoRow>
                            {task.impact && <DetailInfoRow icon="bolt" label="Impacto"><Badge text={task.impact} color="blue" /></DetailInfoRow>}
                            {task.isRecurring && <DetailInfoRow icon="update" label="Recurrencia"><Badge text={task.recurrenceFrequency || 'Semanal'} color="gray" /></DetailInfoRow>}
                            
                            <div className="my-2 border-t border-slate-100 dark:border-slate-700"></div>
                            
                            {task.createdAt && <DetailInfoRow icon="calendar_today" label="Creada">{new Date(task.createdAt).toLocaleDateString()}</DetailInfoRow>}
                            {task.startDate && <DetailInfoRow icon="play_arrow" label="Inicio">{new Date(task.startDate).toLocaleDateString()}</DetailInfoRow>}
                            {task.dueAt && <DetailInfoRow icon="event_busy" label="Vencimiento">
                                <span className={new Date(task.dueAt) < new Date() && task.status !== TaskStatus.Hecho ? "text-red-600 font-bold" : ""}>
                                    {new Date(task.dueAt).toLocaleDateString()}
                                </span>
                            </DetailInfoRow>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Equipo</h3>
                        
                        <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-400 mb-2">Responsables</h4>
                            {assignees.length > 0 ? assignees.map(user => <PeopleRow key={user.id} user={user} />) : <p className="text-xs text-slate-400 italic">Sin asignar</p>}
                        </div>
                         <div>
                            <h4 className="text-xs font-semibold text-slate-400 mb-2">Observadores</h4>
                            {watchers.length > 0 ? watchers.map(user => <PeopleRow key={user.id} user={user} />) : <p className="text-xs text-slate-400 italic">Nadie observando</p>}
                        </div>
                    </div>
                    
                    {task.links && Object.keys(task.links).length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Vínculos</h3>
                             <div className="space-y-2">
                                {Object.entries(task.links).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-600">
                                        <span className="material-symbols-outlined text-indigo-500 text-base">link</span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">{key.replace('Id', '')}:</span>
                                        <span className="text-slate-800 dark:text-slate-200 truncate">{value}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDetailPage;
