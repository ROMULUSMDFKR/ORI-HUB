import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, TaskStatus, Priority, Project, User } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import { getOverdueStatus } from '../utils/time';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';

type TaskView = 'mine' | 'board' | 'all';

// --- Helper Functions ---
const KANBAN_COLUMNS: { stage: TaskStatus, title: string }[] = [
    { stage: TaskStatus.PorHacer, title: 'Por Hacer' },
    { stage: TaskStatus.EnProgreso, title: 'En Progreso' },
    { stage: TaskStatus.Hecho, title: 'Hecho' },
];

const getPriorityBadgeColor = (priority?: Priority): 'red' | 'yellow' | 'gray' => {
    switch (priority) {
        case Priority.Alta: return 'red';
        case Priority.Media: return 'yellow';
        case Priority.Baja: return 'gray';
        default: return 'gray';
    }
};

// --- Sub-components defined within the page file ---

const TaskCard: React.FC<{ task: Task; onClick: () => void; usersMap: Map<string, User> }> = ({ task, onClick, usersMap }) => {
  const assignees = task.assignees.map(id => usersMap.get(id)).filter(Boolean) as User[];
  const { isOverdue, overdueText } = getOverdueStatus(task.dueAt, task.status);
  
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 group transition-shadow hover:shadow-md"
    >
      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{task.title}</h4>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {task.priority && <Badge text={task.priority} color={getPriorityBadgeColor(task.priority)} />}
        {task.projectId && <Badge text="Proyecto" color="blue" />}
      </div>

      {totalSubtasks > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="material-symbols-outlined !text-base">check_box</span>
              <span>{completedSubtasks} de {totalSubtasks}</span>
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}></div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2">
        <div className="flex -space-x-2">
          {assignees.map(user => (
            user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800" /> : null
          ))}
        </div>
        {task.dueAt && (
            <span className={`text-xs font-medium flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="material-symbols-outlined !text-sm mr-1">event</span>
                {overdueText}
            </span>
        )}
      </div>
    </div>
  );
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

interface TaskBoardViewProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  usersMap: Map<string, User>;
}

const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, onTaskStatusChange, usersMap }) => {
  const navigate = useNavigate();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    if (target.classList.contains('kanban-column-droppable')) {
        target.classList.add('bg-slate-300/80', 'dark:bg-slate-700/80');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLDivElement;
    if (target.classList.contains('kanban-column-droppable')) {
        target.classList.remove('bg-slate-300/80', 'dark:bg-slate-700/80');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    if (target.classList.contains('kanban-column-droppable')) {
        target.classList.remove('bg-slate-300/80', 'dark:bg-slate-700/80');
    }
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskStatusChange(taskId, targetStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full bg-slate-100 dark:bg-slate-900/50 -m-6 p-6">
      {KANBAN_COLUMNS.map(col => {
        const tasksInColumn = tasks.filter(t => t.status === col.stage);
        return (
          <div
            key={col.stage}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
            className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/20 rounded-xl p-3 flex flex-col kanban-column-droppable transition-colors"
          >
            <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
              <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{col.title}</h3>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-300/80 dark:bg-slate-700 px-2 py-0.5 rounded-full">{tasksInColumn.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {tasksInColumn.map(task => (
                <div 
                  key={task.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, task.id)}
                >
                  <TaskCard
                    task={task}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    usersMap={usersMap}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- Main Page Component ---

const TasksPage: React.FC = () => {
    const { data: initialTasks, loading: tasksLoading, error } = useCollection<Task>('tasks');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [tasks, setTasks] = useState<Task[] | null>(null);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = (searchParams.get('view') as TaskView) || 'mine';
    const { user: currentUser } = useAuth();

    // Filters
    const [projectFilter, setProjectFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');

    useEffect(() => {
        if (initialTasks) {
            setTasks(initialTasks);
        }
    }, [initialTasks]);

    const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        // Optimistic update
        setTasks(prevTasks => {
            if (!prevTasks) return null;
            return prevTasks.map(t =>
                t.id === taskId ? { ...t, status: newStatus } : t
            );
        });

        // API Update
        try {
            await api.updateDoc('tasks', taskId, { status: newStatus });
        } catch (error) {
            console.error("Error updating task status:", error);
            alert("No se pudo actualizar el estado de la tarea.");
        }
    };
    
    // --- Data Memoization ---
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const filteredTasks = useMemo(() => {
        if (!tasks || !currentUser) return [];
        let result = [...tasks];

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
    }, [tasks, activeView, currentUser, projectFilter, priorityFilter, assigneeFilter]);
    
    const statusCounts = useMemo(() => {
        if (!filteredTasks) return { [TaskStatus.PorHacer]: 0, [TaskStatus.EnProgreso]: 0, [TaskStatus.Hecho]: 0 };
        return filteredTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<TaskStatus, number>);
    }, [filteredTasks]);

    const projectOptions = useMemo(() => (projects || []).map(p => ({ value: p.id, label: p.name })), [projects]);
    const priorityOptions = useMemo(() => Object.values(Priority).map(p => ({ value: p, label: p })), []);
    const assigneeOptions = useMemo(() => (users || []).map((u: User) => ({ value: u.id, label: u.name })), [users]);

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <Link to={`/tasks/${t.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{t.title}</Link> },
        { header: 'Estado', accessor: (t: Task) => <Badge text={t.status} color={t.status === TaskStatus.Hecho ? 'green' : 'blue'} /> },
        { header: 'Prioridad', accessor: (t: Task) => t.priority ? <Badge text={t.priority} color={getPriorityBadgeColor(t.priority)} /> : '-' },
        { 
            header: 'Vencimiento', 
            accessor: (t: Task) => {
                const { isOverdue, overdueText: text } = getOverdueStatus(t.dueAt, t.status);
                return <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{text || (t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '-')}</span>;
            }
        },
        { 
            header: 'Asignados', 
            accessor: (t: Task) => (
                <div className="flex -space-x-2">
                    {t.assignees.map(userId => {
                        const user = usersMap.get(userId);
                        return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800" /> : null;
                    })}
                </div>
            )
        },
    ], [usersMap]);

    const taskViews: ViewOption[] = [
        { id: 'mine', name: 'Mis Tareas', icon: 'person' },
        { id: 'board', name: 'Tablero', icon: 'view_kanban' },
        { id: 'all', name: 'Todas', icon: 'list' },
    ];
    
    // --- Render Logic ---
    const renderContent = () => {
        if (tasksLoading || projectsLoading || usersLoading || !tasks || !currentUser) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las tareas.</p>;

        if (activeView === 'board') {
            return <TaskBoardView tasks={filteredTasks} onTaskStatusChange={handleTaskStatusChange} usersMap={usersMap} />;
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
                <div className="flex-1">
                    {/* Title is now in the main header */}
                </div>
                <div className="flex items-center gap-4">
                    <ViewSwitcher 
                        views={taskViews}
                        activeView={activeView} 
                        onViewChange={(viewId) => setSearchParams({ view: viewId })} 
                    />
                    <Link 
                        to="/tasks/new"
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">add</span>
                        Nueva Tarea
                    </Link>
                </div>
            </div>
            
            <TaskSummary counts={statusCounts} />

            {activeView !== 'board' && (
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                    <FilterButton label="Proyecto" options={projectOptions} selectedValue={projectFilter} onSelect={setProjectFilter} />
                    <FilterButton label="Prioridad" options={priorityOptions} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
                    {activeView === 'all' && <FilterButton label="Asignado a" options={assigneeOptions} selectedValue={assigneeFilter} onSelect={setAssigneeFilter} />}
                </div>
            )}
           
            <div className="flex-1 min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;