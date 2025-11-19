import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Delivery, DeliveryStatus, Company, Carrier } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
        </div>
        <span className="material-symbols-outlined text-3xl text-indigo-500">{icon}</span>
      </div>
    </div>
);

const LogisticsDashboardPage: React.FC = () => {
    const { data: deliveries, loading: dLoading } = useCollection<Delivery>('deliveries');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: carriers, loading: caLoading } = useCollection<Carrier>('carriers');

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
            .sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

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

    }, [deliveries, carriers]);

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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Entregas en Tránsito" value={kpis.inTransit} icon="local_shipping" />
                <KpiCard title="Entregas Pendientes" value={kpis.pending} icon="pending_actions" />
                <KpiCard title="Entregas con Incidencia" value={kpis.issues} icon="warning" />
                <KpiCard title="Tasa de Entrega a Tiempo" value={kpis.onTimeRate} icon="timelapse" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Seguimiento de Entregas Activas</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="p-2">Orden</th>
                                    <th className="p-2">Cliente</th>
                                    <th className="p-2">Destino</th>
                                    <th className="p-2">Transportista</th>
                                    <th className="p-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeDeliveries.map(d => (
                                    <tr key={d.id} className="border-t border-slate-200 dark:border-slate-700">
                                        <td className="p-2 font-semibold">{d.salesOrderId}</td>
                                        <td className="p-2">{companiesMap.get(d.companyId)}</td>
                                        <td className="p-2">{d.destination}</td>
                                        <td className="p-2">{carriersMap.get(d.carrierId)}</td>
                                        <td className="p-2"><Badge text={d.status} color={getStatusColor(d.status)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                     <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Rendimiento de Transportistas</h3>
                     <ul className="space-y-3">
                        {topCarriers.map(c => (
                            <li key={c.id} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                                <span className="font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{c.count} entregas</span>
                            </li>
                        ))}
                     </ul>
                </div>
            </div>
        </div>
    );
};

export default LogisticsDashboardPage;