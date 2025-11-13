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
import FilterButton from '../components/ui/FilterButton';

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

const TaskSummary: React.FC<{ counts: Partial<Record<TaskStatus, number>> }> = ({ counts }) => {
    const summaryItems = [
        { label: 'No Iniciadas', status: TaskStatus.PorHacer, icon: 'radio_button_unchecked', color: 'text-slate-500 dark:text-slate-400' },
        { label: 'En Progreso', status: TaskStatus.EnProgreso, icon: 'hourglass_top', color: 'text-blue-500 dark:text-blue-400' },
        { label: 'Terminadas', status: TaskStatus.Hecho, icon: 'check_circle', color: 'text-green-500 dark:text-green-400' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryItems.map(item => (
                <div key={item.status} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center">
                    <span className={`material-symbols-outlined text-3xl mr-4 ${item.color}`}>{item.icon}</span>
                    <div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{counts[item.status] || 0}</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
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
    
    const statusCounts = useMemo(() => {
        if (!filteredTasks) return { [TaskStatus.PorHacer]: 0, [TaskStatus.EnProgreso]: 0, [TaskStatus.Hecho]: 0 };
        return filteredTasks.reduce((acc, task) => {
            if (!acc[task.status]) {
                acc[task.status] = 0;
            }
            acc[task.status]++;
            return acc;
        }, {} as Record<TaskStatus, number>);
    }, [filteredTasks]);

    const uniqueUsers = useMemo(() => {
        const allUsers = Object.values(MOCK_USERS);
        const seen = new Set();
        return allUsers.filter(user => {
            const duplicate = seen.has(user.id);
            seen.add(user.id);
            return !duplicate;
        });
    }, []);

    const projectOptions = useMemo(() => (projects || []).map(p => ({ value: p.id, label: p.name })), [projects]);
    const priorityOptions = useMemo(() => Object.values(Priority).map(p => ({ value: p, label: p })), []);
    const assigneeOptions = useMemo(() => uniqueUsers.map((u: User) => ({ value: u.id, label: u.name })), [uniqueUsers]);

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <Link to={`/tasks/${t.id}`} className="font-medium text-left hover:text-indigo-600 dark:hover:text-indigo-400">{t.title}</Link> },
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
                        <div key={col.stage} className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-800 rounded-xl p-3" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{col.title}</h3>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Tareas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organiza, colabora y completa el trabajo.</p>
                </div>
                <Link 
                    to="/tasks/new"
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Tarea
                </Link>
            </div>

            {(activeView === 'mine' || activeView === 'all') && <TaskSummary counts={statusCounts} />}

            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Proyecto" options={projectOptions} selectedValue={projectFilter} onSelect={setProjectFilter} allLabel="Todos" />
                <FilterButton label="Prioridad" options={priorityOptions} selectedValue={priorityFilter} onSelect={setPriorityFilter} allLabel="Todas" />
                <FilterButton label="Asignado a" options={assigneeOptions} selectedValue={assigneeFilter} onSelect={setAssigneeFilter} allLabel="Todos" />
            </div>

            <div className="flex-1">
              {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;
