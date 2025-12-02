
import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, Company, Task, Prospect, User, SalesOrderStatus, TaskStatus, Priority, Delivery, DeliveryStatus, SalesGoalSettings, PurchaseOrder, PurchaseOrderStatus } from '../types';
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
    
    // Calculate progress for each goal
    const progressData = useMemo(() => {
        if (!productGoals.length) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter orders for this month and valid status
        const validOrders = salesOrders.filter(o => {
            if (o.status === SalesOrderStatus.Cancelada) return false;
            const d = new Date(o.createdAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        return productGoals.map(goal => {
            let currentVolume = 0;
            
            validOrders.forEach(order => {
                 order.items.forEach(item => {
                     if (item.productId === goal.productId) {
                         // Normalize unit comparison
                         const itemUnit = item.unit?.toLowerCase() || '';
                         const goalUnit = goal.unit?.toLowerCase() || '';
                         
                         // Allow exact match or simple fallback if units are compatible
                         if (itemUnit === goalUnit || (itemUnit === 'ton' && goalUnit.startsWith('ton'))) {
                             currentVolume += Number(item.qty || 0);
                         }
                     }
                 });
            });

            const percentage = goal.globalMonthlyTarget > 0 ? (currentVolume / goal.globalMonthlyTarget) * 100 : 0;
            
            return {
                ...goal,
                current: currentVolume,
                percentage: Math.min(percentage, 100)
            };
        });
    }, [productGoals, salesOrders]);

    if (!productGoals.length) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">flag</span>
                Metas de Volumen (Mes Actual)
            </h3>
            <div className="space-y-6">
                {progressData.map(p => (
                    <div key={p.id}>
                        <div className="flex justify-between items-end mb-1">
                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{p.productName || 'Producto'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{p.current.toLocaleString()} / {p.globalMonthlyTarget.toLocaleString()} {p.unit}</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{p.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${p.percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                style={{ width: `${p.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Dashboard Page ---

const DashboardPage: React.FC<{ user: User }> = ({ user }) => {
    const navigate = useNavigate();
    
    // Data Fetching
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: tasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: deliveries, loading: dLoading } = useCollection<Delivery>('deliveries');

    const [salesGoals, setSalesGoals] = useState<SalesGoalSettings | null>(null);
    const [loadingGoals, setLoadingGoals] = useState(true);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const doc = await api.getDoc('settings', 'salesGoals');
                setSalesGoals(doc);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingGoals(false);
            }
        };
        fetchGoals();
    }, []);

    const loading = soLoading || cLoading || tLoading || pLoading || poLoading || dLoading || loadingGoals;

    const myTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter(t => t.assignees.includes(user.id) && t.status !== TaskStatus.Hecho)
                    .sort((a, b) => new Date(a.dueAt || '').getTime() - new Date(b.dueAt || '').getTime())
                    .slice(0, 5);
    }, [tasks, user.id]);

    const activeDeliveries = useMemo(() => {
        if (!deliveries) return [];
        // Show deliveries that are scheduled or in transit
        return deliveries
            .filter(d => d.status === DeliveryStatus.Programada || d.status === DeliveryStatus.EnTransito)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .slice(0, 5);
    }, [deliveries]);

    const activeReceptions = useMemo(() => {
        if (!purchaseOrders) return [];
        // Show POs that are waiting to be received (excludes Drafts, Rejected, Received, Cancelled)
        return purchaseOrders
            .filter(po => 
                po.status === PurchaseOrderStatus.Ordenada || 
                po.status === PurchaseOrderStatus.PagoPendiente || 
                po.status === PurchaseOrderStatus.PagoParcial || 
                po.status === PurchaseOrderStatus.Pagada ||
                po.status === PurchaseOrderStatus.EnTransito
            )
            .sort((a, b) => new Date(a.expectedDeliveryDate || a.createdAt).getTime() - new Date(b.expectedDeliveryDate || b.createdAt).getTime())
            .slice(0, 5);
    }, [purchaseOrders]);

    // Sales KPIs
    const salesKpis = useMemo(() => {
        if (!salesOrders || !prospects) return { monthSales: 0, monthSalesCount: 0, newProspects: 0 };
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthOrders = salesOrders.filter(o => {
            const d = new Date(o.createdAt);
            return d.getMonth() === currentMonth && 
                   d.getFullYear() === currentYear && 
                   o.status !== SalesOrderStatus.Cancelada;
        });

        const monthProspects = prospects.filter(p => {
             const d = new Date(p.createdAt);
             return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // Ensure total is treated as number
        const totalSales = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

        return {
            monthSales: totalSales,
            monthSalesCount: monthOrders.length,
            newProspects: monthProspects.length
        };
    }, [salesOrders, prospects]);


    if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hola, {user.name.split(' ')[0]}</h1>
                    <p className="text-slate-500 dark:text-slate-400">Aquí tienes un resumen de la actividad de hoy.</p>
                </div>
                <div className="flex gap-2">
                    <HeaderActionButton icon="add_task" label="Tarea" onClick={() => navigate('/tasks/new')} />
                    <HeaderActionButton icon="add_circle" label="Orden" onClick={() => navigate('/hubs/sales-orders/new')} primary />
                </div>
            </div>

            {/* AI Widget */}
            <AiAssistantWidget 
                tasks={tasks || []} 
                prospects={prospects || []} 
                salesOrders={salesOrders || []} 
                isLoadingData={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Sales Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg">
                                    <span className="material-symbols-outlined">payments</span>
                                </span>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ventas del Mes</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">${salesKpis.monthSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-slate-400 mt-1">{salesKpis.monthSalesCount} órdenes activas</p>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
                                    <span className="material-symbols-outlined">person_add</span>
                                </span>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nuevos Prospectos</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{salesKpis.newProspects}</p>
                             <p className="text-xs text-slate-400 mt-1">En el mes actual</p>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                                    <span className="material-symbols-outlined">pending_actions</span>
                                </span>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tareas Pendientes</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{myTasks.length}</p>
                             <p className="text-xs text-slate-400 mt-1">Asignadas a ti</p>
                        </div>
                    </div>

                    {/* Volume Goals Widget */}
                    {salesGoals && <VolumeGoalWidget salesOrders={salesOrders || []} companies={companies || []} goals={salesGoals} user={user} />}

                    {/* Active Deliveries & Logistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Outbound */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">local_shipping</span>
                                Entregas en Curso (Ventas)
                            </h3>
                            <div className="space-y-3">
                                {activeDeliveries.length > 0 ? activeDeliveries.map(d => (
                                    <Link to={`/logistics/deliveries`} key={d.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{d.deliveryNumber}</p>
                                            <p className="text-xs text-slate-500">{d.destination}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded ${d.status === DeliveryStatus.EnTransito ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {d.status}
                                        </span>
                                    </Link>
                                )) : <p className="text-sm text-slate-400 italic">No hay entregas activas.</p>}
                            </div>
                        </div>
                        
                        {/* Inbound */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">input</span>
                                Entradas en Curso (Compras)
                            </h3>
                             <div className="space-y-3">
                                {activeReceptions.length > 0 ? activeReceptions.map(po => (
                                    <Link to={`/purchase/orders/${po.id}`} key={po.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">OC-{po.id.slice(-4)}</p>
                                            <p className="text-xs text-slate-500">Llega: {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Pendiente'}</p>
                                        </div>
                                         <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                            {po.status}
                                        </span>
                                    </Link>
                                )) : <p className="text-sm text-slate-400 italic">No hay recepciones pendientes.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* My Tasks List */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">check_circle</span>
                                Mis Tareas
                            </h3>
                            <Link to="/tasks" className="text-xs text-indigo-600 hover:underline">Ver todas</Link>
                        </div>
                        <div className="space-y-3">
                            {myTasks.length > 0 ? myTasks.map(t => (
                                <Link to={`/tasks/${t.id}`} key={t.id} className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2">{t.title}</p>
                                        {t.priority === Priority.Alta && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5"></span>}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-xs">event</span>
                                        {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'Sin fecha'}
                                    </p>
                                </Link>
                            )) : <p className="text-sm text-slate-400 italic text-center py-4">¡Estás al día! No hay tareas pendientes.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;
