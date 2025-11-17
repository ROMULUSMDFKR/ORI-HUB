import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { PurchaseOrder, Supplier } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const PurchaseOrdersPage: React.FC = () => {
    const { data: orders, loading, error } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: suppliers } = useCollection<Supplier>('suppliers');
    const navigate = useNavigate();

    const suppliersMap = React.useMemo(() => {
        if (!suppliers) return new Map();
        return new Map(suppliers.map(s => [s.id, s.name]));
    }, [suppliers]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Recibida Completa': return 'green';
            case 'Confirmada':
            case 'Recibida Parcial': return 'blue';
            case 'Enviada': return 'yellow';
            default: return 'gray';
        }
    };
    
    const columns = [
        { header: 'Orden #', accessor: (order: PurchaseOrder) => <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{order.id}</span> },
        { header: 'Proveedor', accessor: (order: PurchaseOrder) => suppliersMap.get(order.supplierId) || 'N/A' },
        { header: 'Fecha Creación', accessor: (order: PurchaseOrder) => new Date(order.createdAt).toLocaleDateString() },
        { header: 'Estado', accessor: (order: PurchaseOrder) => <Badge text={order.status} color={getStatusColor(order.status)} /> },
        { header: 'Total', accessor: (order: PurchaseOrder) => `$${order.total.toLocaleString()}`, className: 'text-right font-semibold' },
    ];

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error) return <p>Error al cargar las órdenes de compra.</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <Link to="/purchase-orders/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva OC
                </Link>
            </div>
            {!orders || orders.length === 0 ? (
                <EmptyState 
                    icon="receipt_long"
                    title="No hay órdenes de compra"
                    message="Crea tu primera orden de compra para empezar a gestionar tus adquisiciones."
                    actionText="Crear Orden de Compra"
                    onAction={() => navigate('/purchase-orders/new')}
                />
            ) : (
                <Table columns={columns} data={orders} />
            )}
        </div>
    );
};

export default PurchaseOrdersPage;
