import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Prospect, SalesOrder, User, ActivityLog, ProspectStage } from '../../types';
import Spinner from '../../components/ui/Spinner';

// --- Reusable Card Components ---
const KpiCard: React.FC<{ title: string; value: string; change?: string; icon: string; }> = ({ title, value, change, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">{icon}</span>
        </div>
        <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
        {change && <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">{change}</p>}
    </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode; link?: { to: string; text: string; }; className?: string }> = ({ title, children, link, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
            {link && <Link to={link.to} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{link.text}</Link>}
        </div>
        <div className="flex-1">{children}</div>
    </div>
);


// --- Dashboard-specific Components ---

const SalesFunnel: React.FC<{ prospects: Prospect[] }> = ({ prospects }) => {
    const funnelStages = [
        ProspectStage.Prospecto,
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
    const colors = ['bg-sky-500', 'bg-sky-400', 'bg-teal-400', 'bg-emerald-400', 'bg-green-500', 'bg-green-600'];

    return (
        <div className="space-y-2">
            {stageCounts.map((stage, index) => (
                <div key={stage.name} className="flex items-center gap-3">
                    <div className="w-28 text-right text-sm font-medium text-slate-600 dark:text-slate-400">{stage.name}</div>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full">
                         <div className={`h-6 rounded-full ${colors[index % colors.length]}`} style={{ width: `${(stage.count / maxCount) * 100}%` }}></div>
                    </div>
                    <div className="w-10 text-left font-bold">{stage.count}</div>
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
                // This is a simplification; a real app might link sales orders directly to salespeople.
                // Here we find the owner of the company associated with the sales order.
                 const companyOwnerId = 'user-2'; // Mocking this for now as SO doesn't have owner
                if (companyOwnerId) {
                    salesByUser[companyOwnerId] = (salesByUser[companyOwnerId] || 0) + order.total;
                }
            }
        });
        
        return users
            .filter(u => u.role === 'Ventas' && salesByUser[u.id])
            .map(user => ({
                user,
                total: salesByUser[user.id]
            }))
            .sort((a, b) => b.total - a.total);
    }, [salesOrders, users]);

    const maxSales = Math.max(...salesData.map(d => d.total), 0);

    return (
        <ul className="space-y-4">
            {salesData.map(({ user, total }) => (
                <li key={user.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">${total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${maxSales > 0 ? (total / maxSales) * 100 : 0}%` }}></div>
                    </div>
                </li>
            ))}
        </ul>
    );
};

const DealsToClose: React.FC<{ prospects: Prospect[], users: User[] }> = ({ prospects, users }) => {
    const deals = useMemo(() => {
        return prospects.filter(p => p.stage === ProspectStage.Negociacion);
    }, [prospects]);

    // FIX: Explicitly type the Map to resolve type inference issue with .get()
    const usersMap = new Map<string, User>(users.map(u => [u.id, u]));

    return (
        <ul className="space-y-3">
            {deals.length > 0 ? deals.map(deal => (
                <li key={deal.id}>
                    <Link to={`/crm/prospects/${deal.id}`} className="block p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{deal.name}</p>
                            <p className="font-bold text-sm text-green-600 dark:text-green-400">${deal.estValue.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{usersMap.get(deal.ownerId)?.name || 'N/A'}</span>
                            {deal.nextAction?.dueDate && <span>Vence: {new Date(deal.nextAction.dueDate).toLocaleDateString()}</span>}
                        </div>
                    </Link>
                </li>
            )) : <p className="text-center text-sm text-slate-500 py-8">No hay negocios en negociación.</p>}
        </ul>
    );
};

const RecentActivity: React.FC<{ activities: ActivityLog[], users: User[] }> = ({ activities, users }) => {
    const salesActivities = useMemo(() => {
        return activities
            .filter(a => a.type === 'Cambio de Estado' && (a.quoteId || a.salesOrderId || (a.prospectId && a.description.includes('Ganado'))))
            .slice(0, 5);
    }, [activities]);
    
    // FIX: Explicitly type the Map to resolve type inference issue with .get()
    const usersMap = new Map<string, User>(users.map(u => [u.id, u]));

    return (
        <ul className="space-y-4">
            {salesActivities.map(activity => {
                const user = usersMap.get(activity.userId);
                return (
                    <li key={activity.id} className="flex items-start gap-3 text-sm">
                        <img src={user?.avatarUrl} alt={user?.name || ''} className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div>
                            <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt).toLocaleString()}</p>
                        </div>
                    </li>
                );
            })}
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
            revenueChange: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs mes anterior`,
            conversionRate: `${conversionRate.toFixed(1)}%`,
            avgDealSize: `$${(avgDealSize / 1000).toFixed(1)}k`,
            avgSalesCycle: `${avgSalesCycle.toFixed(0)} días`,
        };
    }, [salesOrders, prospects]);

    if (loading || !kpiData) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Ingresos del Mes" value={kpiData.revenue} change={kpiData.revenueChange} icon="monitoring" />
                <KpiCard title="Tasa de Conversión" value={kpiData.conversionRate} icon="pie_chart" />
                <KpiCard title="Valor Promedio de Venta" value={kpiData.avgDealSize} icon="monetization_on" />
                <KpiCard title="Ciclo de Venta Promedio" value={kpiData.avgSalesCycle} icon="hourglass_empty" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Embudo de Ventas" className="lg:col-span-2">
                    <SalesFunnel prospects={prospects || []} />
                </Card>
                <Card title="Negocios por Cerrar" link={{ to: '/hubs/prospects', text: 'Ver todo' }}>
                    <DealsToClose prospects={prospects || []} users={users || []} />
                </Card>
                <Card title="Rendimiento por Vendedor (Mes)" className="lg:col-span-2">
                    <PerformanceBySeller salesOrders={salesOrders || []} users={users || []} />
                </Card>
                <Card title="Actividad Reciente">
                    <RecentActivity activities={activities || []} users={users || []} />
                </Card>
            </div>
        </div>
    );
};

export default SalesDashboardPage;
