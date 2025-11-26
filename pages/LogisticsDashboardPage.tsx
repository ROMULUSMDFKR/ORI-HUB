
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Delivery, DeliveryStatus, Company, Carrier } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        blue: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-all">
             {/* App Icon Pattern */}
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-200">{value}</p>
            </div>
        </div>
    );
};

const LogisticsDashboardPage: React.FC = () => {
    const { data: deliveries, loading: dLoading } = useCollection<Delivery>('deliveries');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: carriers, loading: caLoading } = useCollection<Carrier>('carriers');
    
    const [period, setPeriod] = useState('this_month');

    const loading = dLoading || cLoading || caLoading;

    const { kpis, activeDeliveries, topCarriers } = useMemo(() => {
        if (!deliveries || !carriers) {
            return { kpis: { inTransit: 0, pending: 0, issues: 0, onTimeRate: '0%' }, activeDeliveries: [], topCarriers: [] };
        }

        const kpis = {
            inTransit: deliveries.filter(d => d.status === DeliveryStatus.EnTransito).length,
            pending: deliveries.filter(d => d.status === DeliveryStatus.Programada).length,
            issues: deliveries.filter(d => d.status === DeliveryStatus.Incidencia).length,
            onTimeRate: '98.5%', // Simulated
        };

        const active = deliveries
            .filter(d => d.status === DeliveryStatus.EnTransito || d.status === DeliveryStatus.Incidencia)
            .sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .slice(0, 5);

        const deliveriesByCarrier = deliveries.reduce((acc, delivery) => {
            acc[delivery.carrierId] = (acc[delivery.carrierId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const top = Object.entries(deliveriesByCarrier)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, count]) => ({
                id: id,
                name: carriers.find(c => c.id === id)?.name || 'Desconocido',
                count: count
            }));

        return { kpis, activeDeliveries: active, topCarriers: top };

    }, [deliveries, carriers, period]); // Period added to dep array for future filtering logic

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const carriersMap = useMemo(() => new Map(carriers?.map(c => [c.id, c.name])), [carriers]);
    
    const getStatusColor = (status: DeliveryStatus) => {
        switch (status) {
            case DeliveryStatus.EnTransito: return 'blue';
            case DeliveryStatus.Incidencia: return 'red';
            default: return 'gray';
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }
    
    const periodOptions = [
        { value: 'this_week', label: 'Esta Semana' },
        { value: 'this_month', label: 'Este Mes' },
        { value: 'last_month', label: 'Mes Pasado' },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Dashboard Logístico</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor de operaciones de entrega y rendimiento de flota.</p>
                </div>
                <div className="flex items-center gap-3">
                     <FilterButton 
                        label="Periodo" 
                        options={periodOptions} 
                        selectedValue={period} 
                        onSelect={setPeriod} 
                    />
                    <Link to="/logistics/deliveries" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">local_shipping</span>
                        Ver Entregas
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="En Tránsito" value={kpis.inTransit} icon="local_shipping" color="blue" />
                <KpiCard title="Pendientes" value={kpis.pending} icon="pending_actions" color="amber" />
                <KpiCard title="Incidencias" value={kpis.issues} icon="warning" color="rose" />
                <KpiCard title="Entregas a Tiempo" value={kpis.onTimeRate} icon="timelapse" color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Deliveries Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">radar</span>
                            Seguimiento en Tiempo Real
                        </h3>
                    </div>
                    
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Orden</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Destino</th>
                                    <th className="p-3">Transportista</th>
                                    <th className="p-3 rounded-r-lg text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {activeDeliveries.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                                            <Link to={`/logistics/deliveries`}>{d.salesOrderId}</Link>
                                        </td>
                                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{companiesMap.get(d.companyId)}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={d.destination}>{d.destination}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-400">{carriersMap.get(d.carrierId)}</td>
                                        <td className="p-3 text-right"><Badge text={d.status} color={getStatusColor(d.status)} /></td>
                                    </tr>
                                ))}
                                {activeDeliveries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">No hay entregas activas en este momento.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Carriers */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                     <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">leaderboard</span>
                        Top Transportistas
                     </h3>
                     <ul className="space-y-4">
                        {topCarriers.map((c, idx) => (
                            <li key={c.id} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 uppercase font-semibold">Entregas</span>
                                    <span className="font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md text-sm">{c.count}</span>
                                </div>
                            </li>
                        ))}
                        {topCarriers.length === 0 && (
                            <li className="text-center text-slate-400 py-4">Sin datos suficientes.</li>
                        )}
                     </ul>
                     <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                         <Link to="/logistics/providers" className="block text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Gestionar Proveedores
                         </Link>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsDashboardPage;
