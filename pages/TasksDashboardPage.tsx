
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, User, TaskStatus, Priority } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string; subtitle?: string }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">{title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-2">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <span className={`material-symbols-outlined text-3xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
            </div>
        </div>
    </div>
);

// Simple Bar Chart for Workload
const WorkloadChart: React.FC<{ data: { name: string; count: number; }[] }> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="space-y-3">
            {data.map(item => (
                <div key={item.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-24 truncate">{item.name}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                         <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right">{item.count}</span>
                </div>
            ))}
        </div>
    );
};

// Simple Donut Chart for Status
const StatusChart: React.FC<{ counts: Record<string, number> }> = ({ counts }) => {
    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    if (total === 0) return <p className="text-center text-slate-400 py-8">Sin datos</p>;

    const segments = [
        { label: 'Hecho', value: counts[TaskStatus.Hecho] ?? 0, color: 'bg-green-500' },
        { label: 'En Progreso', value: counts[TaskStatus.EnProgreso] ?? 0, color: 'bg-blue-500' },
        { label: 'Por Hacer', value: counts[TaskStatus.PorHacer] ?? 0, color: 'bg-slate-400' },
    ];
    
    // Calculate percentages for CSS conic-gradient simulation or simple bars
    // Since we want pure CSS/Tailwind without heavy libs, let's use a stacked bar or simple legend list for now
    // to represent the "chart" visually. A true donut needs SVG paths.
    // Let's do a segmented bar instead for simplicity and elegance.

    return (
        <div className="space-y-4">
            <div className="flex h-4 rounded-full overflow-hidden">
                {segments.map(seg => {
                    const pct = (Number(seg.value) / Number(total)) * 100;
                    if (pct === 0) return null;
                    return <div key={seg.label} className={`h-full ${seg.color}`} style={{ width: `${pct}%` }} title={`${seg.label}: ${seg.value}`}></div>
                })}
            </div>
            <div className="flex justify-between flex-wrap gap-2">
                {segments.map(seg => (
                    <div key={seg.label} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${seg.color}`}></span>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{seg.label}</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">({seg.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TasksDashboardPage: React.FC = () => {
    const { data: tasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: users, loading: uLoading } = useCollection<User>('users');
    const { user: currentUser } = useAuth();

    const loading = tLoading || uLoading;

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const metrics = useMemo(() => {
        if (!tasks) return null;

        const total = tasks.length;
        const completed = tasks.filter(t => t.status === TaskStatus.Hecho).length;
        const inProgress = tasks.filter(t => t.status === TaskStatus.EnProgreso).length;
        const pending = tasks.filter(t => t.status === TaskStatus.PorHacer).length;
        
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        
        // Overdue logic
        const now = new Date();
        const overdue = tasks.filter(t => t.status !== TaskStatus.Hecho && t.dueAt && new Date(t.dueAt) < now).length;

        // Hours estimation vs actual
        let estimatedTotal = 0;
        let actualTotal = 0;
        tasks.forEach(t => {
            estimatedTotal += t.estimationHours || 0;
            actualTotal += t.actualHours || 0;
        });

        // Tasks per user (Top 5)
        const tasksByUser: Record<string, number> = {};
        tasks.forEach(t => {
            t.assignees.forEach(userId => {
                tasksByUser[userId] = (tasksByUser[userId] || 0) + 1;
            });
        });
        
        const workloadData = Object.entries(tasksByUser)
            .map(([id, count]) => ({ name: usersMap.get(id) || 'Desconocido', count }))
            .sort((a,b) => b.count - a.count)
            .slice(0, 5);

        // Urgent & Important (Matrix)
        const criticalTasks = tasks.filter(t => 
            t.status !== TaskStatus.Hecho && 
            t.priority === Priority.Alta && 
            t.impact === 'Alto'
        );

        return {
            total,
            completed,
            inProgress,
            pending,
            completionRate,
            overdue,
            estimatedTotal,
            actualTotal,
            workloadData,
            criticalTasks
        };
    }, [tasks, usersMap]);

    if (loading || !metrics) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Centro de Comando de Productividad</h1>
                <div className="flex gap-2">
                    <Link to="/tasks/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">add_task</span>
                        Nueva Tarea
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Tasa de Finalización" 
                    value={`${metrics.completionRate.toFixed(1)}%`} 
                    icon="check_circle" 
                    color="bg-emerald-500"
                    subtitle={`${metrics.completed} de ${metrics.total} tareas`}
                />
                <KpiCard 
                    title="Tareas Vencidas" 
                    value={metrics.overdue} 
                    icon="warning" 
                    color="bg-red-500"
                    subtitle="Requieren atención inmediata"
                />
                <KpiCard 
                    title="Horas Reales vs Est." 
                    value={`${metrics.actualTotal} / ${metrics.estimatedTotal}`} 
                    icon="timelapse" 
                    color="bg-blue-500" 
                    subtitle="Eficiencia operativa"
                />
                <KpiCard 
                    title="Tareas en Curso" 
                    value={metrics.inProgress} 
                    icon="hourglass_top" 
                    color="bg-amber-500"
                    subtitle="Actividad actual"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Workload Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Carga de Trabajo por Usuario</h3>
                    <WorkloadChart data={metrics.workloadData} />
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Estado General</h3>
                    <div className="flex items-center justify-center h-32 mb-4">
                        <div className="text-center">
                            <span className="text-4xl font-bold text-slate-800 dark:text-slate-200">{metrics.total}</span>
                            <p className="text-xs text-slate-500">Tareas Totales</p>
                        </div>
                    </div>
                    <StatusChart counts={{
                        [TaskStatus.Hecho]: metrics.completed,
                        [TaskStatus.EnProgreso]: metrics.inProgress,
                        [TaskStatus.PorHacer]: metrics.pending
                    }} />
                </div>

                {/* Critical Tasks List */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-red-600 flex items-center gap-2">
                        <span className="material-symbols-outlined">priority_high</span>
                        Críticas (Alta Prioridad e Impacto)
                    </h3>
                    {metrics.criticalTasks.length > 0 ? (
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {metrics.criticalTasks.slice(0, 5).map(task => (
                                <li key={task.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg">
                                    <Link to={`/tasks/${task.id}`} className="block group">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">{task.title}</p>
                                        <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span>{task.assignees.length > 0 ? usersMap.get(task.assignees[0]) : 'Sin asignar'}</span>
                                            <span>{new Date(task.dueAt || '').toLocaleDateString()}</span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-8">¡Excelente! No hay tareas críticas pendientes.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TasksDashboardPage;
