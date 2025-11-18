import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Project, Task, User, TaskStatus } from '../types';
// FIX: Se eliminaron las importaciones de datos falsos.
import Spinner from '../components/ui/Spinner';
import { useCollection } from '../hooks/useCollection';

const ProjectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: project, loading: pLoading } = useDoc<Project>('projects', id || '');
    // FIX: Se obtienen las tareas y usuarios de la base de datos.
    const { data: allTasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: allUsers, loading: uLoading } = useCollection<User>('users');

    const loading = pLoading || tLoading || uLoading;

    const { progress, tasks, members } = React.useMemo(() => {
        if (!project || !allTasks || !allUsers) return { progress: 0, tasks: [], members: [] };

        const projectTasks = allTasks.filter(t => t.projectId === project.id);
        const completedTasks = projectTasks.filter(t => t.status === TaskStatus.Hecho).length;
        const calculatedProgress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
        
        const projectMembers = project.members.map(userId => allUsers.find(u => u.id === userId)).filter(Boolean) as User[];

        return { progress: calculatedProgress, tasks: projectTasks, members: projectMembers };
    }, [project, allTasks, allUsers]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!project) return <div className="text-center p-12">Proyecto no encontrado</div>;

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">{project.name}</h1>
                    <p className="text-sm text-on-surface-secondary mt-1">Vence: {new Date(project.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/tasks/projects/${project.id}/edit`} className="bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm">Editar Proyecto</Link>
                    <Link to="/tasks/new" className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg shadow-sm">Añadir Tarea</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-2">Descripción</h3>
                        <p className="text-on-surface-secondary whitespace-pre-wrap">{project.description}</p>
                    </div>
                    <div className="bg-surface p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">Tareas ({tasks.length})</h3>
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <Link key={task.id} to={`/tasks/${task.id}`} className="block p-3 border rounded-lg hover:bg-background">
                                    <p className="font-semibold">{task.title}</p>
                                    <p className="text-sm text-on-surface-secondary">Estado: {task.status}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-2">Progreso</h3>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{progress.toFixed(0)}% Completado</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-accent h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-center mt-2 text-on-surface-secondary">{tasks.filter(t=>t.status === 'Hecho').length} de {tasks.length} tareas completadas</p>
                    </div>
                    <div className="bg-surface p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">Miembros del Equipo</h3>
                        <div className="space-y-3">
                            {members.map(user => (
                                <div key={user.id} className="flex items-center gap-3">
                                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="font-semibold text-sm">{user.name}</p>
                                        <p className="text-xs text-on-surface-secondary">{user.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;