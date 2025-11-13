import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Delivery, DeliveryStatus, Company, Carrier } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import FilterButton from '../components/ui/FilterButton';
import DeliveryDetailModal from '../components/logistics/DeliveryDetailModal';

const LogisticsDeliveriesPage: React.FC = () => {
    const { data: initialDeliveries, loading: deliveriesLoading } = useCollection<Delivery>('deliveries');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: carriers, loading: carriersLoading } = useCollection<Carrier>('carriers');

    const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [carrierFilter, setCarrierFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

    React.useEffect(() => {
        if(initialDeliveries) {
            setDeliveries(initialDeliveries);
        }
    }, [initialDeliveries]);

    const companiesMap = useMemo(() => new Map(companies?.map(c => [c.id, c.shortName || c.name])), [companies]);
    const carriersMap = useMemo(() => new Map(carriers?.map(c => [c.id, c.name])), [carriers]);
    
    const statusOptions = useMemo(() => Object.values(DeliveryStatus).map(s => ({ value: s, label: s })), []);
    const carrierOptions = useMemo(() => (carriers || []).map(c => ({ value: c.id, label: c.name })), [carriers]);

    const filteredData = useMemo(() => {
        if (!deliveries) return [];
        return deliveries.filter(delivery => {
            if (statusFilter !== 'all' && delivery.status !== statusFilter) return false;
            if (carrierFilter !== 'all' && delivery.carrierId !== carrierFilter) return false;
            return true;
        });
    }, [deliveries, statusFilter, carrierFilter]);

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
            case DeliveryStatus.Cancelada:
                 return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        { header: 'Entrega', accessor: (d: Delivery) => <span className="font-semibold">{d.salesOrderId} ({d.deliveryNumber})</span> },
        { header: 'Cliente', accessor: (d: Delivery) => companiesMap.get(d.companyId) || 'N/A' },
        { header: 'Destino', accessor: (d: Delivery) => d.destination },
        { header: 'Transportista', accessor: (d: Delivery) => carriersMap.get(d.carrierId) || 'N/A' },
        { header: 'Estado', accessor: (d: Delivery) => <Badge text={d.status} color={getStatusColor(d.status)} /> },
        { header: 'Fecha Prog.', accessor: (d: Delivery) => new Date(d.scheduledDate).toLocaleDateString() },
        { header: 'Acciones', accessor: (d: Delivery) => <button onClick={() => handleOpenModal(d)} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Ver/Actualizar</button> },
    ];

    const loading = deliveriesLoading || companiesLoading || carriersLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Seguimiento de Entregas</h2>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                <FilterButton label="Transportista" options={carrierOptions} selectedValue={carrierFilter} onSelect={setCarrierFilter} />
            </div>

            {loading ? (
                 <div className="flex justify-center py-12"><Spinner /></div>
            ) : !filteredData || filteredData.length === 0 ? (
                 <EmptyState icon="local_shipping" title="No se encontraron entregas" message="Ajusta los filtros o crea una nueva orden de venta para ver entregas." />
            ) : (
                <Table columns={columns} data={filteredData} />
            )}

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