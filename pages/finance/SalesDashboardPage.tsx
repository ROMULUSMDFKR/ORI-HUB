
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Prospect, SalesOrder, User, ActivityLog, ProspectStage } from '../../types';
import Spinner from '../../components/ui/Spinner';

// --- Reusable Card Components ---

const KpiCard: React.FC<{ title: string; value: string; change?: string; icon: string; colorClass: string }> = ({ title, value, change, icon, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-start justify-between transition-all hover:shadow-md">
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-2">{value}</h3>
            {change && (
                <div className={`flex items-center mt-1 text-xs font-medium ${change.includes('+') ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                    {change.includes('+') && <span className="material-symbols-outlined text-[14px] mr-0.5 shrink-0">trending_up</span>}
                    {change}
                </div>
            )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${colorClass} bg-opacity-10 dark:bg-opacity-20 shrink-0 flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-2xl ${colorClass.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
    </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode; link?: { to: string; text: string; }; className?: string; icon?: string }> = ({ title, children, link, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${className}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                {icon && <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>}
                {title}
            </h3>
            {link && (
                <Link to={link.to} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    {link.text}
                    <span className="material-symbols-outlined text-sm shrink-0">arrow_forward</span>
                </Link>
            )}
        </div>
        <div className="flex-1">{children}</div>
    </div>
);


// --- Dashboard-specific Components ---

const SalesFunnel: React.FC<{ prospects: Prospect[] }> = ({ prospects }) => {
    const funnelStages = [
        ProspectStage.Nueva,
        ProspectStage.Contactado,
        ProspectStage.Calificado,
        ProspectStage.Propuesta,
        ProspectStage.Negociacion,
        ProspectStage.Ganado,
    ];

    const stageCounts = useMemo(() => {
        const counts = funnelStages.reduce((acc, stage) => {
            acc[stage] = 0;
            return acc;
        }, {} as Record<ProspectStage, number>);
        
        prospects.forEach(p => {
            if (counts[p.stage] !== undefined) {
                counts[p.stage]++;
            }
        });

        return funnelStages.map(stage => ({
            name: stage,
            count: counts[stage]
        }));
    }, [prospects]);

    const maxCount = Math.max(...stageCounts.map(s => s.count), 1);
    const colors = ['bg-slate-300', 'bg-sky-300', 'bg-sky-400', 'bg-indigo-400', 'bg-indigo-500', 'bg-emerald-500'];

    return (
        <div className="space-y-4 relative py-2">
            {/* Connecting Line (Visual Guide) */}
            <div className="absolute left-[140px] top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-700 hidden sm:block"></div>
            
            {stageCounts.map((stage, index) => (
                <div key={stage.name} className="flex items-center gap-4 relative z-10">
                    <div className="w-32 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 shrink-0">{stage.name}</div>
                    <div className="flex-1 h-8 bg-slate-50 dark:bg-slate-700/50 rounded-r-full rounded-l-sm overflow-hidden flex items-center">
                         <div 
                            className={`h-full ${colors[index % colors.length]} transition-all duration-1000 ease-out flex items-center justify-end pr-2`} 
                            style={{ width: `${Math.max((stage.count / maxCount) * 100, 2)}%` }}
                         >
                         </div>
                         <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-200">{stage.count}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const PerformanceBySeller: React.FC<{ salesOrders: SalesOrder[], users: User[] }> = ({ salesOrders, users }) => {
    const salesData = useMemo(() => {
        const salesByUser: { [userId: string]: number } = {};
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        salesOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                 const companyOwnerId = 'user-2'; // Mocking this for now as SO doesn't have owner directly accessible without join
                if (companyOwnerId) {
                    salesByUser[companyOwnerId] = (salesByUser[companyOwnerId] || 0) + order.total;
                }
            }
        });
        
        return users
            .filter(u => u.role === 'Ventas' || u.role === 'Admin')
            .map(user => ({
                user,
                total: salesByUser[user.id] || 0 // Ensure 0 if no sales
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // Top 5
    }, [salesOrders, users]);

    const maxSales = Math.max(...salesData.map(d => d.total), 1);

    return (
        <ul className="space-y-5">
            {salesData.map(({ user, total }, index) => (
                <li key={user.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 w-4 shrink-0">#{index + 1}</span>
                            <img 
                                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                                alt={user.name} 
                                className="w-6 h-6 rounded-full object-cover shrink-0 bg-slate-200" 
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{user.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                            ${(total || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" 
                            style={{ width: `${(total / maxSales) * 100}%` }}
                        ></div>
                    </div>
                </li>
            ))}
             {salesData.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No hay datos de ventas este mes.</p>
            )}
        </ul>
    );
};

const DealsToClose: React.FC<{ prospects: Prospect[], users: User[] }> = ({ prospects, users }) => {
    const deals = useMemo(() => {
        return prospects
            .filter(p => p.stage === ProspectStage.Negociacion)
            .sort((a, b) => b.estValue - a.estValue)
            .slice(0, 5);
    }, [prospects]);

    const usersMap = new Map<string, User>(users.map(u => [u.id, u]));

    return (
        <ul className="space-y-3">
            {deals.length > 0 ? deals.map(deal => (
                <li key={deal.id}>
                    <Link to={`/hubs/prospects/${deal.id}`} className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{deal.name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px] shrink-0">person</span>
                                        {usersMap.get(deal.ownerId)?.name || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">${(deal.estValue || 0).toLocaleString()}</p>
                                {deal.nextAction?.dueDate && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${new Date(deal.nextAction.dueDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                                        {new Date(deal.nextAction.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                </li>
            )) : (
                <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2 shrink-0">
                        <span className="material-symbols-outlined text-slate-400">handshake</span>
                    </div>
                    <p className="text-sm text-slate-500">No hay negocios en negociación.</p>
                </div>
            )}
        </ul>
    );
};

const RecentActivity: React.FC<{ activities: ActivityLog[], users: User[] }> = ({ activities, users }) => {
    const salesActivities = useMemo(() => {
        return activities
            .filter(a => a.type === 'Cambio de Estado' && (a.quoteId || a.salesOrderId || (a.prospectId && a.description.includes('Ganado'))))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [activities]);
    
    const usersMap = new Map<string, User>(users.map(u => [u.id, u]));

    return (
        <ul className="space-y-0">
            {salesActivities.map((activity, idx) => {
                const user = usersMap.get(activity.userId);
                const isLast = idx === salesActivities.length - 1;
                return (
                    <li key={activity.id} className={`relative pl-6 pb-6 ${isLast ? '' : 'border-l border-slate-200 dark:border-slate-700 ml-3'}`}>
                        <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${isLast ? 'ml-3' : ''} bg-indigo-500 shrink-0`}></div>
                        <div className={`flex items-start gap-3 ${isLast ? 'ml-3' : ''}`}>
                            <img 
                                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                                alt={user?.name || ''} 
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-600" 
                            />
                            <div>
                                <p className="text-sm text-slate-800 dark:text-slate-200 leading-tight">{activity.description}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </li>
                );
            })}
            {salesActivities.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-8">No hay actividad reciente relevante.</p>
            )}
        </ul>
    );
};


// --- Main Page Component ---
const SalesDashboardPage: React.FC = () => {
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: salesOrders, loading: sLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: users, loading: uLoading } = useCollection<User>('users');
    const { data: activities, loading: aLoading } = useCollection<ActivityLog>('activities');

    const loading = pLoading || sLoading || uLoading || aLoading;

    // --- KPI Calculations ---
    const kpiData = useMemo(() => {
        if (!salesOrders || !prospects) return null;
        
        // Monthly Revenue
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const currentMonthRevenue = salesOrders
            .filter(o => new Date(o.createdAt).getMonth() === currentMonth && new Date(o.createdAt).getFullYear() === currentYear)
            .reduce((sum, o) => sum + o.total, 0);

        const prevMonthRevenue = salesOrders
            .filter(o => new Date(o.createdAt).getMonth() === prevMonth && new Date(o.createdAt).getFullYear() === prevMonthYear)
            .reduce((sum, o) => sum + o.total, 0);
        
        const revenueChange = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : currentMonthRevenue > 0 ? 100 : 0;
        
        // Conversion Rate
        const won = prospects.filter(p => p.stage === ProspectStage.Ganado).length;
        const lost = prospects.filter(p => p.stage === ProspectStage.Perdido).length;
        const conversionRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0;

        // Avg Deal Size
        const avgDealSize = salesOrders.length > 0 ? salesOrders.reduce((sum, o) => sum + o.total, 0) / salesOrders.length : 0;

        // Avg Sales Cycle
        const wonProspects = prospects.filter(p => p.stage === ProspectStage.Ganado && p.lastInteraction);
        const totalCycleDays = wonProspects.reduce((sum, p) => {
            const created = new Date(p.createdAt).getTime();
            const closed = new Date(p.lastInteraction!.date).getTime();
            return sum + (closed - created);
        }, 0);
        const avgSalesCycle = wonProspects.length > 0 ? (totalCycleDays / wonProspects.length) / (1000 * 3600 * 24) : 0;

        return {
            revenue: `$${(currentMonthRevenue / 1000).toFixed(1)}k`,
            revenueChange: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
            conversionRate: `${conversionRate.toFixed(1)}%`,
            avgDealSize: `$${(avgDealSize / 1000).toFixed(1)}k`,
            avgSalesCycle: `${avgSalesCycle.toFixed(0)} días`,
        };
    }, [salesOrders, prospects]);

    if (loading || !kpiData) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Panel de Ventas</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Visión general del rendimiento comercial y oportunidades.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Ingresos del Mes" 
                    value={kpiData.revenue} 
                    change={kpiData.revenueChange} 
                    icon="payments" 
                    colorClass="bg-emerald-500 text-emerald-600"
                />
                <KpiCard 
                    title="Tasa de Conversión" 
                    value={kpiData.conversionRate} 
                    icon="pie_chart" 
                    colorClass="bg-blue-500 text-blue-600"
                />
                <KpiCard 
                    title="Valor Promedio (Ticket)" 
                    value={kpiData.avgDealSize} 
                    icon="monetization_on" 
                    colorClass="bg-amber-500 text-amber-600"
                />
                <KpiCard 
                    title="Ciclo de Venta" 
                    value={kpiData.avgSalesCycle} 
                    icon="timelapse" 
                    colorClass="bg-indigo-500 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Embudo de Ventas" className="lg:col-span-2" icon="filter_list">
                    <SalesFunnel prospects={prospects || []} />
                </Card>
                <Card title="Negocios por Cerrar" link={{ to: '/hubs/prospects', text: 'Ver Pipeline' }} icon="local_fire_department">
                    <DealsToClose prospects={prospects || []} users={users || []} />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Rendimiento por Vendedor (Mes)" className="lg:col-span-2" icon="leaderboard">
                    <PerformanceBySeller salesOrders={salesOrders || []} users={users || []} />
                </Card>
                <Card title="Actividad Reciente" icon="notifications_active">
                    <RecentActivity activities={activities || []} users={users || []} />
                </Card>
            </div>
        </div>
    );
};

export default SalesDashboardPage;
