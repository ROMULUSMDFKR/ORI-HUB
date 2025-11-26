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
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-3 group transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500"
    >
      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h4>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {task.priority && <Badge text={task.priority} color={getPriorityBadgeColor(task.priority)} />}
        {task.projectId && <Badge text="Proyecto" color="blue" />}
      </div>

      {totalSubtasks > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
              <span className="material-symbols-outlined !text-base">check_box</span>
              <span>{completedSubtasks} de {totalSubtasks}</span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}></div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-3">
        <div className="flex -space-x-2">
          {assignees.map(user => (
            user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover" /> : null
          ))}
        </div>
        {task.dueAt && (
            <span className={`text-xs font-medium flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="material-symbols-outlined !text-sm mr-1">event</span>
                {overdueText || new Date(task.dueAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </span>
        )}
      </div>
    </div>
  );
};

const TaskSummary: React.FC<{ counts: Partial<Record<TaskStatus, number>> }> = ({ counts }) => {
    const summaryItems = [
        { label: 'No Iniciadas', status: TaskStatus.PorHacer, icon: 'radio_button_unchecked', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
        { label: 'En Progreso', status: TaskStatus.EnProgreso, icon: 'hourglass_top', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
        { label: 'Terminadas', status: TaskStatus.Hecho, icon: 'check_circle', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summaryItems.map(item => (
                <div key={item.status} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    {/* App Icon Pattern */}
                    <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${item.color}`}>
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                        <h4 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{counts[item.status] || 0}</h4>
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
        target.classList.add('bg-slate-100', 'dark:bg-slate-800');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLDivElement;
    if (target.classList.contains('kanban-column-droppable')) {
        target.classList.remove('bg-slate-100', 'dark:bg-slate-800');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    if (target.classList.contains('kanban-column-droppable')) {
        target.classList.remove('bg-slate-100', 'dark:bg-slate-800');
    }
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskStatusChange(taskId, targetStatus);
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      {KANBAN_COLUMNS.map(col => {
        const tasksInColumn = tasks.filter(t => t.status === col.stage);
        return (
          <div
            key={col.stage}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
            className="flex-shrink-0 w-80 flex flex-col h-full kanban-column-droppable rounded-xl transition-colors duration-200"
          >
            <div className="flex justify-between items-center mb-4 px-1 flex-shrink-0">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {col.title}
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{tasksInColumn.length}</span>
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar space-y-3">
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
              {tasksInColumn.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl h-32 flex items-center justify-center">
                      <p className="text-xs text-slate-400 font-medium">Sin tareas</p>
                  </div>
              )}
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
    const [searchTerm, setSearchTerm] = useState('');
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
        
        if (searchTerm) {
            result = result.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return result;
    }, [tasks, activeView, currentUser, projectFilter, priorityFilter, assigneeFilter, searchTerm]);
    
    const statusCounts = useMemo(() => {
        if (!tasks) return { [TaskStatus.PorHacer]: 0, [TaskStatus.EnProgreso]: 0, [TaskStatus.Hecho]: 0 };
        // Count based on ALL tasks (or filtered by user depending on pref, here global context for dashboard)
        const baseTasks = activeView === 'mine' ? tasks.filter(t => t.assignees.includes(currentUser?.id || '')) : tasks;
        
        return baseTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<TaskStatus, number>);
    }, [tasks, activeView, currentUser]);

    const projectOptions = useMemo(() => (projects || []).map(p => ({ value: p.id, label: p.name })), [projects]);
    const priorityOptions = useMemo(() => Object.values(Priority).map(p => ({ value: p, label: p })), []);
    const assigneeOptions = useMemo(() => (users || []).map((u: User) => ({ value: u.id, label: u.name })), [users]);

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <Link to={`/tasks/${t.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{t.title}</Link> },
        { header: 'Estado', accessor: (t: Task) => <Badge text={t.status} color={t.status === TaskStatus.Hecho ? 'green' : (t.status === TaskStatus.EnProgreso ? 'blue' : 'gray')} /> },
        { header: 'Prioridad', accessor: (t: Task) => t.priority ? <Badge text={t.priority} color={getPriorityBadgeColor(t.priority)} /> : '-' },
        { 
            header: 'Vencimiento', 
            accessor: (t: Task) => {
                const { isOverdue, overdueText: text } = getOverdueStatus(t.dueAt, t.status);
                return <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600 dark:text-slate-400'}>{text || (t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '-')}</span>;
            }
        },
        { 
            header: 'Asignados', 
            accessor: (t: Task) => (
                <div className="flex -space-x-2 overflow-hidden">
                    {t.assignees.slice(0, 3).map(userId => {
                        const user = usersMap.get(userId);
                        return user ? <img key={user.id} src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} title={user.name} className="inline-block w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover" /> : null;
                    })}
                    {t.assignees.length > 3 && (
                         <span className="inline-flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-500">+{t.assignees.length - 3}</span>
                    )}
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
        return <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><Table columns={columns} data={filteredTasks} /></div>;
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 flex-shrink-0">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gestión de Tareas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organiza, prioriza y completa el trabajo del equipo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewSwitcher 
                        views={taskViews}
                        activeView={activeView} 
                        onViewChange={(viewId) => setSearchParams({ view: viewId })} 
                    />
                    <Link 
                        to="/tasks/new"
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        <span className="material-symbols-outlined mr-2">add</span>
                        Nueva Tarea
                    </Link>
                </div>
            </div>
            
            <TaskSummary counts={statusCounts} />

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between flex-shrink-0">
                {/* Input Safe Pattern: Search */}
                 <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar tarea..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <FilterButton label="Proyecto" options={projectOptions} selectedValue={projectFilter} onSelect={setProjectFilter} />
                    <FilterButton label="Prioridad" options={priorityOptions} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
                    {activeView === 'all' && <FilterButton label="Asignado a" options={assigneeOptions} selectedValue={assigneeFilter} onSelect={setAssigneeFilter} />}
                </div>
            </div>
           
            <div className="flex-1 min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;