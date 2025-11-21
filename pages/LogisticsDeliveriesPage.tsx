
import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Delivery, DeliveryStatus, Company, Carrier } from '../types';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import DeliveryDetailModal from '../components/logistics/DeliveryDetailModal';

const LogisticsDeliveriesPage: React.FC = () => {
    const { data: initialDeliveries, loading: deliveriesLoading } = useCollection<Delivery>('deliveries');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: carriers, loading: carriersLoading } = useCollection<Carrier>('carriers');

    const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

    React.useEffect(() => {
        if(initialDeliveries) {
            setDeliveries(initialDeliveries);
        }
    }, [initialDeliveries]);

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const carriersMap = useMemo(() => new Map(carriers?.map(c => [c.id, c.name])), [carriers]);
    
    const handleOpenModal = (delivery: Delivery) => {
        setSelectedDelivery(delivery);
        setIsModalOpen(true);
    };

    const handleUpdateDelivery = (updatedDelivery: Delivery) => {
        setDeliveries(prev => prev!.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
    };

    const getStatusColor = (status: DeliveryStatus) => {
        switch (status) {
            case DeliveryStatus.Entregada: return 'green';
            case DeliveryStatus.EnTransito: return 'blue';
            case DeliveryStatus.Programada: return 'yellow';
            case DeliveryStatus.Incidencia:
            case DeliveryStatus.Cancelada: return 'red';
            default: return 'gray';
        }
    };

    // Group deliveries by date
    const groupedDeliveries = useMemo<Record<string, Delivery[]>>(() => {
        if (!deliveries) return {};
        const groups: Record<string, Delivery[]> = {};
        const now = new Date();
        const todayStr = now.toLocaleDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString();

        const sortedDeliveries = [...deliveries].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        sortedDeliveries.forEach(delivery => {
            const date = new Date(delivery.scheduledDate);
            const dateStr = date.toLocaleDateString();
            let key = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
            
            if (dateStr === todayStr) key = 'HOY';
            else if (dateStr === tomorrowStr) key = 'MAÑANA';

            if (!groups[key]) groups[key] = [];
            groups[key].push(delivery);
        });
        
        return groups;
    }, [deliveries]);

    const loading = deliveriesLoading || companiesLoading || carriersLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
             <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Logística</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitorea y gestiona las operaciones de entrega.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Próximas Entregas</h3>
                
                {!deliveries || deliveries.length === 0 ? (
                    <EmptyState icon="local_shipping" title="No hay entregas programadas" message="Las entregas creadas desde Órdenes de Venta aparecerán aquí." />
                ) : (
                    <div className="space-y-8">
                        {Object.keys(groupedDeliveries).map((dateLabel) => {
                            const dateDeliveries = groupedDeliveries[dateLabel];
                            return (
                            <div key={dateLabel}>
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 border-b border-slate-100 dark:border-slate-700 pb-1">{dateLabel}</h4>
                                <div className="space-y-3">
                                    {dateDeliveries.map(delivery => (
                                        <div 
                                            key={delivery.id} 
                                            onClick={() => handleOpenModal(delivery)}
                                            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer"
                                        >
                                            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-4">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                        {delivery.isSample ? 'Muestra de producto' : `Entrega de orden ${delivery.salesOrderId}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{delivery.deliveryNumber}</p>
                                                </div>
                                                <div className="col-span-3">
                                                    <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{companiesMap.get(delivery.companyId) || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-3">
                                                    <p className="text-xs uppercase text-slate-400 font-semibold">Transportista</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{carriersMap.get(delivery.carrierId) || 'Asignación Pendiente'}</p>
                                                </div>
                                                 <div className="col-span-2 text-right">
                                                    <Badge text={delivery.status} color={getStatusColor(delivery.status)} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>

            <DeliveryDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                delivery={selectedDelivery}
                onUpdateDelivery={handleUpdateDelivery}
            />
        </div>
    );
};

export default LogisticsDeliveriesPage;
