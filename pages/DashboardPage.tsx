
import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Company, Task, Prospect, User, SalesOrderStatus, TaskStatus, Priority, ProspectStage, Delivery, DeliveryStatus, SalesGoalSettings } from '../types';
import Spinner from '../components/ui/Spinner';
import AiAssistantWidget from '../components/dashboard/AiAssistantWidget';
import { api } from '../api/firebaseApi';

// --- UI Components ---

// Standard Button for Header
const HeaderActionButton: React.FC<{ icon: string; label: string; onClick: () => void; primary?: boolean }> = ({ icon, label, onClick, primary = false }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all ${
            primary 
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md' 
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`}
    >
        <span className="material-symbols-outlined !text-lg">{icon}</span>
        {label}
    </button>
);

// New Volume Goal Widget supporting multiple products
const VolumeGoalWidget: React.FC<{ salesOrders: SalesOrder[]; companies: Company[]; goals: SalesGoalSettings | null; user: User }> = ({ salesOrders, companies, goals, user }) => {
    const productGoals = goals?.goals || [];
    
    // Create a map for fast company lookup
    const companiesMap = useMemo(() => {
        const map = new Map<string, Company>();
        companies.forEach(c => map.set(c.id, c));
        return map;
    }, [companies]);

    // Calculate progress for each goal
    const progressData = useMemo(() => {
        if (!productGoals.length) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter orders for this month and valid status
        const validOrders = salesOrders.filter(o => {
            const d = new Date(o.createdAt);
            return d.getMonth() === currentMonth && 
                   d.getFullYear() === currentYear && 
                   o.status !== SalesOrderStatus.Cancelada;
        });

        return productGoals.map(goal => {
            let currentVolume = 0;
            
            // Only count orders relevant to the user if not Admin
            const relevantOrders = (user.role === 'Admin' || user.role === 'Logística') 
                ? validOrders 
                : validOrders.filter(o => {
                    // Check if user created the order
                    if (o.salespersonId === user.id) return true;
                    
                    // Check if user is an owner of the company linked to the order
                    const company = companiesMap.get(o.companyId);
                    if (company) {
                        if (company.ownerId === user.id) return true;
                        if (company.additionalOwnerIds && company.additionalOwnerIds.includes(user.id)) return true;
                    }
                    return false;
                });

            relevantOrders.forEach(order => {
                order.items.forEach(item => {
                    if (item.productId === goal.productId) {
                        currentVolume += item.qty;
                    }
                });
            });

            // Determine target (Global vs User specific)
            const target = (user.role === 'Admin' || user.role === 'Logística')
                ? goal.globalMonthlyTarget
                : (goal.userTargets?.[user.id] || 0);

            const percentage = target > 0 ? Math.min(100, (currentVolume / target) * 100) : 0;
            
            return {
                ...goal,
                current: currentVolume,
                target,
                percentage
            };
        });
    }, [productGoals, salesOrders, user, companiesMap]);

    if (progressData.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col justify-center items-center text-center">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-2">flag</span>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Sin metas de producto configuradas.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-950 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col h-full relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-indigo-400">inventory_2</span>
                    <h3 className="font-bold text-lg">Metas de Volumen (Mes)</h3>
                </div>
                
                <div className="space-y-5">
                    {progressData.map(p => (
                        <div key={p.id}>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-200">{p.productName || 'Producto'}</span>
                                <span className="text-indigo-200 font-mono">
                                    {p.current.toLocaleString()} / <span className="text-white">{p.target.toLocaleString()}</span> {p.unit}
                                </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${p.percentage >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`} 
                                    style={{ width: `${p.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
             {/* Decorative background blob */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
        </div>
    );
};

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string; trend?: string }> = ({ title, value, icon, color, trend }) => {
    const colorName = color.split('-')[1]; 
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-${colorName}-50 dark:bg-${colorName}-900/20 text-${colorName}-600 dark:text-${colorName}-400`}>
                <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <div className="flex items-end gap-2">
                    <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</h4>
                    {trend && <span className="text-xs font-medium text-emerald-500 mb-1">{trend}</span>}
                </div>
            </div>
        </div>
    );
};

const DealCard: React.FC<{ prospect: Prospect }> = ({ prospect }) => (
    <Link to={`/hubs/prospects/${prospect.id}`} className="block min-w-[240px] p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group shadow-sm">
        <div className="flex justify-between items-start mb-2">
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{prospect.stage}</span>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-500 text-lg">arrow_forward</span>
        </div>
        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{prospect.name}</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">${prospect.estValue.toLocaleString()}</p>
        <p className="text-xs text-slate-400 mt-2">Probabilidad: Alta</p>
    </Link>
);

const TaskRow: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
    return (
        <Link to={`/tasks/${task.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors group border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                task.priority === Priority.Alta ? 'bg-rose-500' : 
                task.priority === Priority.Media ? 'bg-amber-500' : 'bg-blue-500'
            }`}></div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className={`text-sm font-semibold truncate ${task.status === TaskStatus.Hecho ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                    </p>
                    {isOverdue && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-1.5 rounded ml-2">VENCIDA</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                        <span className="material-symbols-outlined text-[14px] mr-1">calendar_today</span>
                        {task.dueAt ? new Date(task.dueAt).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'}) : 'Sin fecha'}
                    </span>
                    {task.tags?.[0] && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 rounded">{task.tags[0]}</span>}
                </div>
            </div>
        </Link>
    );
};

const DeliveryRow: React.FC<{ delivery: Delivery, companies: Company[] }> = ({ delivery, companies }) => {
    const companyName = companies.find(c => c.id === delivery.companyId)?.shortName || 'Cliente';
    const isTransit = delivery.status === DeliveryStatus.EnTransito;
    
    return (
        <Link to={`/logistics/deliveries`} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isTransit ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'} dark:bg-slate-700`}>
                    <span className="material-symbols-outlined text-xl">{isTransit ? 'local_shipping' : 'inventory_2'}</span>
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{delivery.deliveryNumber}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{companyName}</p>
                </div>
            </div>
            <div className="text-right">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isTransit ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                    {delivery.status}
                </span>
            </div>
        </Link>
    );
}

// --- SUB-DASHBOARDS ---

const SalesDashboardWidgets: React.FC<{ 
    user: User, 
    prospects: Prospect[], 
    salesOrders: SalesOrder[], 
    companies: Company[],
    tasks: Task[],
    loading: boolean,
    goals: SalesGoalSettings | null 
}> = ({ user, prospects, salesOrders, companies, tasks, loading, goals }) => {
    
    const companiesMap = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filter orders to include created by user OR where user is responsible for the client
        // This logic MUST match VolumeGoalWidget to be consistent
        const relevantOrders = user.role === 'Admin' 
            ? salesOrders 
            : salesOrders.filter(o => {
                // 1. Is direct salesperson?
                if (o.salespersonId === user.id) return true;
                
                // 2. Is company owner or collaborator?
                const company = companiesMap.get(o.companyId);
                if (company) {
                     if (company.ownerId === user.id) return true;
                     if (company.additionalOwnerIds && company.additionalOwnerIds.includes(user.id)) return true;
                }
                return false;
            });

        const monthlySales = relevantOrders
            .filter(o => {
                const d = new Date(o.createdAt);
                return d.getMonth() === currentMonth && 
                       d.getFullYear() === currentYear &&
                       o.status !== SalesOrderStatus.Cancelada
            })
            .reduce((sum, o) => sum + o.total, 0);

        const activeProspects = prospects.filter(p => p.ownerId === user.id && p.stage !== 'Perdido' && p.stage !== 'Ganado').length;
        const myPendingTasks = tasks.filter(t => t.assignees.includes(user.id) && t.status !== TaskStatus.Hecho).length;

        return { sales: monthlySales, prospects: activeProspects, tasks: myPendingTasks };
    }, [salesOrders, prospects, tasks, user.id, user.role, companiesMap]);

    const hotDeals = useMemo(() => {
        return prospects.filter(p => 
            (user.role === 'Admin' || p.ownerId === user.id) && 
            (p.stage === ProspectStage.Propuesta || p.stage === ProspectStage.Negociacion)
        ).sort((a,b) => b.estValue - a.estValue).slice(0, 5);
    }, [prospects, user.id, user.role]);

    return (
        <div className="space-y-6 animate-fade-in">
             {/* Hero Section */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <AiAssistantWidget 
                        tasks={tasks} 
                        prospects={prospects} 
                        salesOrders={salesOrders} 
                        isLoadingData={loading}
                    />
                </div>
                <div className="lg:col-span-1">
                    {/* UPDATED: Volume Goal Widget with Companies data */}
                    <VolumeGoalWidget salesOrders={salesOrders} companies={companies} goals={goals} user={user} /> 
                </div>
            </div>

             {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Ventas del Mes ($)" value={loading ? '...' : `$${stats.sales.toLocaleString()}`} icon="payments" color="bg-emerald-500" trend="+12%" />
                <KpiCard title="Pipeline Activo" value={loading ? '...' : stats.prospects} icon="filter_alt" color="bg-blue-500" />
                <KpiCard title="Tareas Pendientes" value={loading ? '...' : stats.tasks} icon="assignment_late" color="bg-amber-500" />
            </div>

            {/* Hot Deals */}
            {hotDeals.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-amber-500">local_fire_department</span>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Oportunidades en Cierre</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {hotDeals.map(deal => <DealCard key={deal.id} prospect={deal} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

const LogisticsDashboardWidgets: React.FC<{
    deliveries: Delivery[],
    companies: Company[]
}> = ({ deliveries, companies }) => {
    const activeDeliveries = useMemo(() => deliveries.filter(
        d => d.status === DeliveryStatus.Programada || d.status === DeliveryStatus.EnTransito
    ), [deliveries]);

    return (
        <div className="space-y-6 mt-8 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-500">local_shipping</span>
                Panel de Logística
            </h3>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <h4 className="font-bold mb-4 text-slate-700 dark:text-slate-300">Entregas en Curso</h4>
                     {activeDeliveries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeDeliveries.slice(0, 6).map(delivery => (
                                <DeliveryRow key={delivery.id} delivery={delivery} companies={companies} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500">No hay entregas activas.</p>
                    )}
                </div>
                 <div className="lg:col-span-1">
                    <div className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-xl border border-sky-200 dark:border-sky-800">
                        <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Alertas de Ruta</p>
                        <p className="text-xs text-sky-600 dark:text-sky-400 mt-2">Sin incidencias reportadas hoy.</p>
                    </div>
                </div>
             </div>
        </div>
    );
}

// --- MAIN PAGE ---

const DashboardPage: React.FC<{ user: User }> = ({ user }) => {
    const navigate = useNavigate();
    
    // Data Fetching
    const { data: tasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: salesOrders, loading: sLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: deliveries, loading: dLoading } = useCollection<Delivery>('deliveries');
    
    const [salesGoals, setSalesGoals] = useState<SalesGoalSettings | null>(null);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const goals = await api.getDoc('settings', 'salesGoals');
                if (goals) setSalesGoals(goals);
            } catch (error) {
                console.error("Failed to fetch sales goals", error);
            }
        };
        fetchGoals();
    }, []);

    const loading = tLoading || pLoading || sLoading || cLoading || dLoading;
    const currentDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    // Determine which dashboards to show
    // Default: Show Sales if role is Sales or Admin, Logistics if Logisitics.
    // Override: user.activeDashboards (from profile)
    const showSales = user.activeDashboards 
        ? user.activeDashboards.includes('sales') 
        : (user.role === 'Admin' || user.role === 'Ventas');
        
    const showLogistics = user.activeDashboards
        ? user.activeDashboards.includes('logistics')
        : (user.role === 'Admin' || user.role === 'Logística');

    const myPriorityTasks = useMemo(() => 
        tasks?.filter(t => t.assignees.includes(user.id) && t.status !== TaskStatus.Hecho)
              .sort((a, b) => {
                  const pMap = { [Priority.Alta]: 1, [Priority.Media]: 2, [Priority.Baja]: 3 };
                  const pDiff = (pMap[a.priority] || 3) - (pMap[b.priority] || 3);
                  if (pDiff !== 0) return pDiff;
                  return (a.dueAt && b.dueAt ? new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() : 0);
              }).slice(0, 5) || []
    , [tasks, user.id]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* 1. Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">{currentDate}</p>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Hola, {user.name.split(' ')[0]} 👋
                    </h1>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <HeaderActionButton icon="add_task" label="Tarea" onClick={() => navigate('/tasks/new')} />
                    {showSales && <HeaderActionButton icon="person_add" label="Prospecto" onClick={() => navigate('/hubs/prospects/new')} />}
                    {showSales && <HeaderActionButton icon="receipt_long" label="Orden" onClick={() => navigate('/hubs/sales-orders/new')} primary />}
                </div>
            </div>

            {/* SALES DASHBOARD BLOCK */}
            {showSales && (
                <SalesDashboardWidgets 
                    user={user}
                    tasks={tasks || []}
                    prospects={prospects || []}
                    salesOrders={salesOrders || []}
                    companies={companies || []}
                    loading={loading}
                    goals={salesGoals}
                />
            )}

            {/* LOGISTICS DASHBOARD BLOCK */}
            {showLogistics && (
                <LogisticsDashboardWidgets 
                    deliveries={deliveries || []}
                    companies={companies || []}
                />
            )}

            {/* COMMON OPERATIONAL GRID (Tasks are relevant for everyone) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">check_circle</span>
                            Mis Tareas Prioritarias
                        </h3>
                        <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline">Ver todas</Link>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {myPriorityTasks.length > 0 ? (
                            myPriorityTasks.map(task => <TaskRow key={task.id} task={task} />)
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined">done_all</span>
                                </div>
                                <p className="text-slate-500">¡Estás al día! No hay tareas urgentes.</p>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 h-full">
                     <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Avisos del Sistema</h3>
                     <p className="text-sm text-slate-500">No hay avisos importantes por ahora.</p>
                 </div>
            </div>
        </div>
    );
};

export default DashboardPage;
