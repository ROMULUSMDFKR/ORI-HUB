
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Company, Task, Prospect, User, SalesOrderStatus, TaskStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import AiAssistantWidget from '../components/dashboard/AiAssistantWidget';
import Badge from '../components/ui/Badge';

// --- Sub-components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
            <span className={`material-symbols-outlined text-2xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
    </div>
);

const ActiveDeliveries: React.FC<{ salesOrders: SalesOrder[], companies: Company[] }> = ({ salesOrders, companies }) => {
    const activeOrders = useMemo(() => salesOrders.filter(
        o => o.status === SalesOrderStatus.EnPreparacion || o.status === SalesOrderStatus.EnTransito
    ), [salesOrders]);

    const companiesMap = useMemo(() => new Map(companies.map(c => [c.id, c.shortName || c.name])), [companies]);

    const getStatusInfo = (status: SalesOrderStatus) => {
        switch (status) {
            case SalesOrderStatus.EnPreparacion:
                return { text: "En Preparación", color: "bg-yellow-500", progress: 25 };
            case SalesOrderStatus.EnTransito:
                return { text: "En Tránsito", color: "bg-blue-500", progress: 75 };
            default:
                return { text: "Pendiente", color: "bg-gray-500", progress: 0 };
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Entregas en Curso</h3>
                <Link to="/logistics/deliveries" className="text-xs font-semibold text-indigo-600 hover:underline">Ver Logística</Link>
            </div>
            
            {activeOrders.length > 0 ? (
                <ul className="space-y-4 flex-1 overflow-y-auto pr-2">
                    {activeOrders.map(order => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                            <li key={order.id}>
                                <Link to={`/hubs/sales-orders/${order.id}`} className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{order.folio || order.id.slice(0,8)}</p>
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-300">
                                            {companiesMap.get(order.companyId) || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span>{statusInfo.text}</span>
                                            <span>{statusInfo.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                                            <div className={`${statusInfo.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${statusInfo.progress}%` }}></div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-60">
                     <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">local_shipping</span>
                     <p className="text-sm text-slate-500">No hay entregas activas.</p>
                 </div>
            )}
        </div>
    );
};

const PriorityTasks: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const pendingTasks = useMemo(() => 
        tasks
            .filter(t => t.status !== TaskStatus.Hecho)
            .sort((a, b) => (a.dueAt && b.dueAt ? new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() : 0))
            .slice(0, 5)
    , [tasks]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Tareas Prioritarias</h3>
                <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline">Ver todas</Link>
            </div>
            
            {pendingTasks.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {pendingTasks.map(task => {
                         const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
                         return (
                            <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 truncate block">
                                            {task.title}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                                {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'Sin fecha'}
                                            </span>
                                            {task.priority && <Badge text={task.priority} color="gray" />}
                                        </div>
                                    </div>
                                </div>
                            </li>
                         );
                    })}
                </ul>
            ) : (
                <div className="text-center py-8 opacity-60">
                     <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">task_alt</span>
                     <p className="text-sm text-slate-500">¡Estás al día! No tienes tareas pendientes.</p>
                </div>
            )}
        </div>
    );
}

const DashboardPage: React.FC<{ user: User }> = ({ user }) => {
    const { data: tasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: salesOrders, loading: sLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');

    const loading = tLoading || pLoading || sLoading || cLoading;

    // Calculate Quick Stats
    const stats = useMemo(() => {
        if (!salesOrders || !prospects || !tasks) return { sales: 0, prospects: 0, tasks: 0 };
        
        const now = new Date();
        const currentMonth = now.getMonth();
        
        const monthlySales = salesOrders
            .filter(o => new Date(o.createdAt).getMonth() === currentMonth)
            .reduce((sum, o) => sum + o.total, 0);

        const activeProspects = prospects.filter(p => p.stage !== 'Perdido' && p.stage !== 'Ganado').length;
        
        const myPendingTasks = tasks.filter(t => t.assignees.includes(user.id) && t.status !== TaskStatus.Hecho).length;

        return { sales: monthlySales, prospects: activeProspects, tasks: myPendingTasks };
    }, [salesOrders, prospects, tasks, user.id]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Hola, {user.name}</h1>
                <p className="text-slate-500 dark:text-slate-400">Aquí tienes el resumen de operaciones para hoy.</p>
            </div>
            
            {/* AI Widget */}
            <AiAssistantWidget 
                tasks={tasks || []} 
                prospects={prospects || []} 
                salesOrders={salesOrders || []} 
            />

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard 
                    title="Ventas del Mes" 
                    value={`$${stats.sales.toLocaleString()}`} 
                    icon="payments" 
                    color="bg-emerald-500" 
                />
                <KpiCard 
                    title="Prospectos Activos" 
                    value={stats.prospects} 
                    icon="groups" 
                    color="bg-blue-500" 
                />
                <KpiCard 
                    title="Mis Tareas Pendientes" 
                    value={stats.tasks} 
                    icon="assignment" 
                    color="bg-amber-500" 
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PriorityTasks tasks={tasks?.filter(t => t.assignees.includes(user.id)) || []} />
                </div>
                <div className="lg:col-span-1">
                    <ActiveDeliveries salesOrders={salesOrders || []} companies={companies || []} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
