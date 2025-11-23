
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Company, Task, Prospect, User, SalesOrderStatus, TaskStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import AiAssistantWidget from '../components/dashboard/AiAssistantWidget';
import Badge from '../components/ui/Badge';

// --- Sub-components ---

const QuickActionBtn: React.FC<{ to: string; icon: string; label: string; color: string }> = ({ to, icon, label, color }) => (
    <Link 
        to={to} 
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 group"
    >
        <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <span className={`material-symbols-outlined text-lg ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </Link>
);

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between hover:shadow-md transition-all duration-300 group">
        <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
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
                return { text: "En Preparación", color: "bg-amber-500", badgeColor: "yellow", progress: 35 };
            case SalesOrderStatus.EnTransito:
                return { text: "En Tránsito", color: "bg-blue-600", badgeColor: "blue", progress: 75 };
            default:
                return { text: "Pendiente", color: "bg-slate-500", badgeColor: "gray", progress: 0 };
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">local_shipping</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Entregas Activas</h3>
                </div>
                <Link to="/logistics/deliveries" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    Ver todo <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                </Link>
            </div>
            
            {activeOrders.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {activeOrders.map(order => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                            <Link to={`/hubs/sales-orders/${order.id}`} key={order.id} className="block group">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all relative overflow-hidden">
                                    
                                    {/* Status Line Indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusInfo.color}`}></div>

                                    <div className="flex justify-between items-start mb-3 pl-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs font-bold text-slate-400">#{order.folio || order.id.slice(0,6)}</span>
                                                <Badge text={statusInfo.text} color={statusInfo.badgeColor as any} />
                                            </div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                                                {companiesMap.get(order.companyId) || 'Cliente Desconocido'}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors">chevron_right</span>
                                    </div>
                                    
                                    <div className="pl-2">
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                                            <div className={`${statusInfo.color} h-1.5 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${statusInfo.progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-end mt-1">
                                             <span className="text-[10px] font-medium text-slate-400">{statusInfo.progress}% completado</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-60">
                     <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-3xl text-slate-400">local_shipping</span>
                     </div>
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sin entregas en curso</p>
                     <p className="text-xs text-slate-500">Tus pedidos activos aparecerán aquí.</p>
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">task_alt</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Tareas Prioritarias</h3>
                </div>
                <Link to="/tasks/new" className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-600 transition-colors" title="Nueva Tarea">
                     <span className="material-symbols-outlined text-lg">add</span>
                </Link>
            </div>
            
            {pendingTasks.length > 0 ? (
                <div className="flex-1 flex flex-col gap-3">
                    {pendingTasks.map(task => {
                         const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
                         return (
                            <Link key={task.id} to={`/tasks/${task.id}`} className="block group">
                                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                                    
                                    {/* Priority Indicator */}
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'Alta' ? 'bg-red-500 ring-2 ring-red-100 dark:ring-red-900' : 'bg-slate-300'}`}></div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                                <span className="material-symbols-outlined !text-xs">event</span>
                                                {task.dueAt ? new Date(task.dueAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Sin fecha'}
                                            </span>
                                            {task.impact && (
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                    {task.impact} Impacto
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Fake Checkbox for visual cue */}
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-indigo-500 flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-xs text-transparent group-hover:text-indigo-500">check</span>
                                    </div>
                                </div>
                            </Link>
                         );
                    })}
                    <Link to="/tasks" className="mt-auto pt-2 text-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        Ver todas las tareas
                    </Link>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-60">
                     <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3 text-green-500">
                        <span className="material-symbols-outlined text-3xl">check</span>
                     </div>
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-300">¡Estás al día!</p>
                     <p className="text-xs text-slate-500">No tienes tareas urgentes pendientes.</p>
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

    // Format today's date
    const todayDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = todayDate.charAt(0).toUpperCase() + todayDate.slice(1);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{formattedDate}</p>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Hola, {user.name.split(' ')[0]}</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Aquí tienes el resumen operativo del día.</p>
                </div>
                
                {/* Quick Actions Toolbar */}
                <div className="flex flex-wrap gap-3">
                    <QuickActionBtn to="/purchase/orders/new" icon="add_shopping_cart" label="Nuevo Pedido" color="bg-indigo-500" />
                    <QuickActionBtn to="/tasks/new" icon="check_circle" label="Nueva Tarea" color="bg-emerald-500" />
                    <QuickActionBtn to="/hubs/prospects/new" icon="person_add" label="Prospecto" color="bg-blue-500" />
                </div>
            </div>
            
            {/* AI Widget */}
            <div className="animate-fade-in-up">
                <AiAssistantWidget 
                    tasks={tasks || []} 
                    prospects={prospects || []} 
                    salesOrders={salesOrders || []} 
                    isLoadingData={loading}
                />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard 
                    title="Ventas del Mes" 
                    value={loading ? '...' : `$${stats.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
                    icon="payments" 
                    color="bg-emerald-500" 
                />
                <KpiCard 
                    title="Prospectos Activos" 
                    value={loading ? '...' : stats.prospects} 
                    icon="groups" 
                    color="bg-blue-500" 
                />
                <KpiCard 
                    title="Mis Tareas Pendientes" 
                    value={loading ? '...' : stats.tasks} 
                    icon="assignment" 
                    color="bg-amber-500" 
                />
            </div>

            {/* Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                <div className="lg:col-span-2 h-full">
                    <PriorityTasks tasks={tasks?.filter(t => t.assignees.includes(user.id)) || []} />
                </div>
                <div className="lg:col-span-1 h-full">
                    <ActiveDeliveries salesOrders={salesOrders || []} companies={companies || []} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
