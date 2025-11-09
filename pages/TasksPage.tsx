
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, TaskStatus, Priority, Project, User } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import TaskCard from '../components/tasks/TaskCard';
import { MOCK_USERS } from '../data/mockData';
import { getOverdueStatus } from '../utils/time';

type TaskView = 'mine' | 'board' | 'all';
const KANBAN_COLUMNS: { stage: TaskStatus, title: string }[] = [
    { stage: TaskStatus.PorHacer, title: 'Por Hacer' },
    { stage: TaskStatus.EnProgreso, title: 'En Progreso' },
    { stage: TaskStatus.Hecho, title: 'Hecho' },
];

const getPriorityBadgeColor = (priority?: Priority) => {
    switch (priority) {
        case Priority.Alta: return 'red';
        case Priority.Media: return 'yellow';
        case Priority.Baja: return 'gray';
        default: return 'gray';
    }
};

const TasksPage: React.FC = () => {
    const { data: initialTasks, loading: tasksLoading, error } = useCollection<Task>('tasks');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const [tasks, setTasks] = useState<Task[] | null>(null);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = (searchParams.get('view') as TaskView) || 'mine';
    const currentUser = MOCK_USERS.natalia; 

    // Filters
    const [projectFilter, setProjectFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');

    useEffect(() => {
        if (initialTasks) {
            setTasks(initialTasks);
        }
    }, [initialTasks]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId && tasks) {
            setTasks(prevTasks =>
                prevTasks!.map(t =>
                  t.id === taskId ? { ...t, status: targetStatus } : t
                )
            );
        }
    };

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        let result = tasks;

        if (activeView === 'mine') {
            result = result.filter(t => t.assignees.includes(currentUser.id));
        }
        if (projectFilter !== 'all') {
            result = result.filter(t => t.projectId === projectFilter);
        }
        if (priorityFilter !== 'all') {
            result = result.filter(t => t.priority === priorityFilter);
        }
        if (assigneeFilter !== 'all') {
            result = result.filter(t => t.assignees.includes(assigneeFilter));
        }

        return result;
    }, [tasks, activeView, currentUser.id, projectFilter, priorityFilter, assigneeFilter]);
    
    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <Link to={`/tasks/${t.id}`} className="font-medium text-left hover:text-accent">{t.title}</Link> },
        { header: 'Estado', accessor: (t: Task) => <Badge text={t.status} color={t.status === TaskStatus.Hecho ? 'green' : 'blue'} /> },
        { header: 'Prioridad', accessor: (t: Task) => t.priority ? <Badge text={t.priority} color={getPriorityBadgeColor(t.priority)} /> : '-' },
        { 
            header: 'Vencimiento', 
            accessor: (t: Task) => {
                const { isOverdue, overdueText } = getOverdueStatus(t.dueAt, t.status);
                if (isOverdue) {
                    return <span className="text-red-600 font-semibold">{overdueText}</span>;
                }
                return t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '-';
            }
        },
        { 
            header: 'Asignados', 
            accessor: (t: Task) => (
                <div className="flex -space-x-2">
                    {t.assignees.map(userId => {
                        const user = MOCK_USERS[userId];
                        return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-7 h-7 rounded-full border-2 border-white" /> : null;
                    })}
                </div>
            )
        },
    ], []);

    const renderContent = () => {
        if (tasksLoading || projectsLoading || !tasks) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las tareas.</p>;

        if (activeView === 'board') {
            return (
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                    {KANBAN_COLUMNS.map(col => (
                        <div key={col.stage} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-3" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="font-semibold text-md text-text-main">{col.title}</h3>
                                <span className="text-sm font-medium text-text-secondary bg-gray-200 px-2 py-0.5 rounded-full">
                                    {filteredTasks.filter(t => t.status === col.stage).length}
                                </span>
                            </div>
                            <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 350px)'}}>
                                {filteredTasks.filter(t => t.status === col.stage).map(task => (
                                    <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={() => navigate(`/tasks/${task.id}`)} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        
        if (filteredTasks.length === 0) {
            return (
                 <EmptyState
                    icon="task_alt"
                    title={activeView === 'mine' ? "No tienes tareas asignadas" : "No hay tareas que coincidan"}
                    message={activeView === 'mine' ? "¡Buen trabajo! Estás al día." : "Ajusta los filtros o crea una nueva tarea."}
                    actionText="Crear Tarea"
                    onAction={() => navigate('/tasks/new')}
                />
            );
        }

        return <Table columns={columns} data={filteredTasks} />;
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Tareas</h2>
                    <p className="text-sm text-text-secondary mt-1">Organiza, colabora y completa el trabajo.</p>
                </div>
                <Link 
                    to="/tasks/new"
                    className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Tarea
                </Link>
            </div>

            <div className="bg-surface p-3 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-border">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-on-surface-secondary">Proyecto:</label>
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm py-1 px-2"><option value="all">Todos</option>{(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-on-surface-secondary">Prioridad:</label>
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm py-1 px-2"><option value="all">Todas</option>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-on-surface-secondary">Asignado a:</label>
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="bg-surface text-on-surface text-sm border-border rounded-md shadow-sm py-1 px-2"><option value="all">Todos</option>{uniqueUsers.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                </div>
            </div>

            <div className="flex-1">
              {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;
