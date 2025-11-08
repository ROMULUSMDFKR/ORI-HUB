import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, TaskStatus, Priority } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import TaskCard from '../components/tasks/TaskCard';
import { MOCK_USERS } from '../data/mockData';

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
    const { data: initialTasks, loading, error } = useCollection<Task>('tasks');
    const [tasks, setTasks] = useState<Task[] | null>(null);

    useEffect(() => {
        if (initialTasks) {
            setTasks(initialTasks);
        }
    }, [initialTasks]);
    
    const [searchParams] = useSearchParams();
    const activeView = (searchParams.get('view') as TaskView) || 'mine';
    const currentUser = MOCK_USERS.natalia; // Assuming Natalia is the logged-in user

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

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <span className="font-medium">{t.title}</span> },
        { header: 'Estado', accessor: (t: Task) => <Badge text={t.status} color={t.status === TaskStatus.Hecho ? 'green' : 'blue'} /> },
        { header: 'Prioridad', accessor: (t: Task) => t.priority ? <Badge text={t.priority} color={getPriorityBadgeColor(t.priority)} /> : '-' },
        { header: 'Vencimiento', accessor: (t: Task) => t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '-' },
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
        if (loading || !tasks) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las tareas.</p>;

        if (activeView === 'board') {
            return (
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                    {KANBAN_COLUMNS.map(col => (
                        <div key={col.stage} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-3" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="font-semibold text-md text-text-main">{col.title}</h3>
                                <span className="text-sm font-medium text-text-secondary bg-gray-200 px-2 py-0.5 rounded-full">
                                    {tasks.filter(t => t.status === col.stage).length}
                                </span>
                            </div>
                            <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 300px)'}}>
                                {tasks.filter(t => t.status === col.stage).map(task => (
                                    <TaskCard key={task.id} task={task} onDragStart={handleDragStart} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        const dataForTable = activeView === 'mine' 
            ? tasks.filter(t => t.assignees.includes(currentUser.id)) 
            : tasks;
        
        if (dataForTable.length === 0) {
            return (
                 <EmptyState
                    icon="task_alt"
                    title={activeView === 'mine' ? "No tienes tareas asignadas" : "No hay tareas"}
                    message={activeView === 'mine' ? "¡Buen trabajo! Estás al día." : "Crea una nueva tarea para empezar."}
                    actionText="Crear Tarea"
                    onAction={() => alert('Abrir modal para nueva tarea')}
                />
            );
        }

        return <Table columns={columns} data={dataForTable} />;
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Tareas</h2>
                    <p className="text-sm text-text-secondary mt-1">Organiza, colabora y completa el trabajo.</p>
                </div>
                <button 
                    onClick={() => alert('Abrir modal para nueva tarea')}
                    className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Tarea
                </button>
            </div>
            <div className="flex-1">
              {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;