import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Project, Task, User, TaskStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { useCollection } from '../hooks/useCollection';
import Badge from '../components/ui/Badge';

const ProjectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: project, loading: pLoading } = useDoc<Project>('projects', id || '');
    const { data: allTasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: allUsers, loading: uLoading } = useCollection<User>('users');

    const loading = pLoading || tLoading || uLoading;

    const { progress, tasks, members } = useMemo(() => {
        if (!project || !allTasks || !allUsers) return { progress: 0, tasks: [], members: [] };

        const projectTasks = allTasks.filter(t => t.projectId === project.id);
        const completedTasks = projectTasks.filter(t => t.status === TaskStatus.Hecho).length;
        const calculatedProgress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
        
        const projectMembers = project.members.map(userId => allUsers.find(u => u.id === userId)).filter(Boolean) as User[];

        return { progress: calculatedProgress, tasks: projectTasks, members: projectMembers };
    }, [project, allTasks, allUsers]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!project) return <div className="text-center p-12">Proyecto no encontrado</div>;

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Activo': return 'blue';
            case 'Completado': return 'green';
            case 'En Pausa': return 'yellow';
            default: return 'gray';
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{project.name}</h1>
                        <Badge text={project.status} color={getStatusColor(project.status)} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">event</span>
                        Vence: {new Date(project.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to={`/tasks/projects/${project.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">edit</span>
                        Editar
                    </Link>
                    <Link to="/tasks/new" className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">add_task</span>
                        Añadir Tarea
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                             <span className="material-symbols-outlined text-indigo-500">description</span>
                             Descripción
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                            {project.description || 'Sin descripción.'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">list_alt</span>
                                Tareas ({tasks.length})
                            </h3>
                            <Link to={`/tasks?project=${project.id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                Ver en Tablero
                            </Link>
                        </div>
                        
                        <div className="space-y-3">
                            {tasks.length > 0 ? tasks.map(task => (
                                <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group hover:border-indigo-200 dark:hover:border-indigo-800">
                                    <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${task.status === TaskStatus.Hecho ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                         <div>
                                             <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{task.title}</p>
                                             <div className="flex items-center gap-2 mt-0.5">
                                                 <Badge text={task.status} color="gray" />
                                                 {task.priority && <Badge text={task.priority} color="gray" />}
                                             </div>
                                         </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors">chevron_right</span>
                                </Link>
                            )) : (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-sm">No hay tareas asignadas a este proyecto.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Progress Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Progreso General</h3>
                        
                        <div className="relative pt-2">
                            <div className="flex justify-between mb-2 items-end">
                                <span className="text-3xl font-bold text-slate-800 dark:text-slate-200">{progress.toFixed(0)}%</span>
                                <span className="text-xs font-medium text-slate-500">{tasks.filter(t=>t.status === 'Hecho').length}/{tasks.length} Tareas</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Team Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Equipo del Proyecto</h3>
                        <div className="space-y-4">
                            {members.length > 0 ? members.map(user => (
                                <div key={user.id} className="flex items-center gap-3">
                                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400 italic">Sin miembros asignados.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;