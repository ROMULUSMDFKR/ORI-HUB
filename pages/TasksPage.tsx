
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
  
  // Visual Progress Calculation (use manual % or checklist calculation)
  const checklistCompleted = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const checklistTotal = task.subtasks?.length || 0;
  const checklistPct = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
  const displayProgress = task.completionPercentage !== undefined ? task.completionPercentage : checklistPct;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 group transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between items-start mb-2">
           <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2">{task.title}</h4>
           {task.priority === Priority.Alta && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5 ml-2" title="Alta Prioridad"></span>}
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
         {task.impact && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{task.impact} Impacto</span>}
         {task.isRecurring && <span className="material-symbols-outlined text-slate-400 text-sm" title="Recurrente">update</span>}
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Progreso</span>
              <span>{displayProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
               <div className={`h-1.5 rounded-full ${displayProgress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${displayProgress}%` }}></div>
          </div>
      </div>

      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2">
        <div className="flex -space-x-2">
          {assignees.map(user => (
            user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover" /> : null
          ))}
        </div>
        {task.dueAt && (
            <span className={`text-xs font-medium flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="material-symbols-outlined !text-sm mr-1">event</span>
                {new Date(task.dueAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
            </span>
        )}
      </div>
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
    const [showCompleted, setShowCompleted] = useState(false); // New toggle

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
                t.id === taskId ? { ...t, status: newStatus, completionPercentage: newStatus === TaskStatus.Hecho ? 100 : t.completionPercentage } : t
            );
        });

        // API Update
        try {
            const updates: Partial<Task> = { status: newStatus };
            if (newStatus === TaskStatus.Hecho) updates.completionPercentage = 100;
            await api.updateDoc('tasks', taskId, updates);
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
        
        // Filter completed unless toggled or in Board View (where columns handle status)
        if (activeView !== 'board' && !showCompleted) {
            result = result.filter(t => t.status !== TaskStatus.Hecho);
        }

        return result;
    }, [tasks, activeView, currentUser, projectFilter, priorityFilter, assigneeFilter, showCompleted]);
    
    const projectOptions = useMemo(() => (projects || []).map(p => ({ value: p.id, label: p.name })), [projects]);
    const priorityOptions = useMemo(() => Object.values(Priority).map(p => ({ value: p, label: p })), []);
    const assigneeOptions = useMemo(() => (users || []).map((u: User) => ({ value: u.id, label: u.name })), [users]);

    const columns = useMemo(() => [
        { header: 'Título', accessor: (t: Task) => <Link to={`/tasks/${t.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{t.title}</Link> },
        { 
            header: 'Progreso', 
            accessor: (t: Task) => (
                 <div className="w-24">
                     <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                         <span>{t.status}</span>
                         <span>{t.completionPercentage || 0}%</span>
                     </div>
                     <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${t.status === TaskStatus.Hecho ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${t.completionPercentage || 0}%` }}></div>
                     </div>
                 </div>
            )
        },
        { header: 'Prioridad', accessor: (t: Task) => t.priority ? <Badge text={t.priority} color={getPriorityBadgeColor(t.priority)} /> : '-' },
        { 
            header: 'Vencimiento', 
            accessor: (t: Task) => {
                const { isOverdue, overdueText: text } = getOverdueStatus(t.dueAt, t.status);
                return <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600 dark:text-slate-300'}>{text || (t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '-')}</span>;
            }
        },
        { 
            header: 'Estimado / Real', 
            accessor: (t: Task) => (
                 <span className="text-xs font-mono text-slate-500">
                     {t.estimationHours || 0}h / <span className={(t.actualHours || 0) > (t.estimationHours || 0) ? 'text-red-500 font-bold' : ''}>{t.actualHours || 0}h</span>
                 </span>
            ),
            className: 'text-right'
        },
        { 
            header: 'Asignados', 
            accessor: (t: Task) => (
                <div className="flex -space-x-2 justify-end">
                    {t.assignees.map(userId => {
                        const user = usersMap.get(userId);
                        return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 object-cover" /> : null;
                    })}
                </div>
            ),
            className: 'text-right'
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
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Tablero de Control Operativo</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona y supervisa la ejecución de tareas.</p>
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
            
            {activeView !== 'board' && (
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                    <FilterButton label="Proyecto" options={projectOptions} selectedValue={projectFilter} onSelect={setProjectFilter} />
                    <FilterButton label="Prioridad" options={priorityOptions} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
                    {activeView === 'all' && <FilterButton label="Asignado a" options={assigneeOptions} selectedValue={assigneeFilter} onSelect={setAssigneeFilter} />}
                    
                    <div className="flex-grow"></div>
                    
                    <button 
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-lg">{showCompleted ? 'check_box' : 'check_box_outline_blank'}</span>
                        Mostrar Completadas
                    </button>
                </div>
            )}
           
            <div className="flex-1 min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default TasksPage;
