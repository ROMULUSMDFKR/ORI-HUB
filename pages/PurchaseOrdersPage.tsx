
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { PurchaseOrder, Supplier } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const PurchaseOrdersPage: React.FC = () => {
    const { data: orders, loading, error } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: suppliers } = useCollection<Supplier>('suppliers');
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const suppliersMap = React.useMemo(() => {
        if (!suppliers) return new Map();
        return new Map(suppliers.map(s => [s.id, s.name]));
    }, [suppliers]);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        return orders.filter(order => {
            const matchesSearch = 
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (suppliersMap.get(order.supplierId) || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, searchTerm, statusFilter, suppliersMap]);

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
        { 
            header: 'Orden #', 
            accessor: (order: PurchaseOrder) => (
                <Link to={`/purchase/orders/${order.id}`} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {order.id}
                </Link>
            ) 
        },
        { 
            header: 'Proveedor', 
            accessor: (order: PurchaseOrder) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {suppliersMap.get(order.supplierId) || 'Desconocido'}
                </span>
            )
        },
        { 
            header: 'Fecha Creación', 
            accessor: (order: PurchaseOrder) => <span className="text-slate-500 dark:text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
        },
        { header: 'Estado', accessor: (order: PurchaseOrder) => <Badge text={order.status} color={getStatusColor(order.status)} /> },
        { 
            header: 'Total', 
            accessor: (order: PurchaseOrder) => <span className="font-bold text-slate-800 dark:text-slate-200">${order.total.toLocaleString()}</span>, 
            className: 'text-right' 
        },
        {
            header: 'Acciones',
            accessor: (order: PurchaseOrder) => (
                <div className="flex justify-end">
                    <Link to={`/purchase/orders/${order.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                    </Link>
                </div>
            ),
            className: 'text-right'
        }
    ];

    const statusOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'Borrador', label: 'Borrador' },
        { value: 'Enviada', label: 'Enviada' },
        { value: 'Confirmada', label: 'Confirmada' },
        { value: 'Recibida Parcial', label: 'Recibida Parcial' },
        { value: 'Recibida Completa', label: 'Recibida Completa' },
        { value: 'Cancelada', label: 'Cancelada' },
    ];

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error) return <div className="text-center text-red-500 p-12">Error al cargar las órdenes de compra.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Órdenes de Compra</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tus adquisiciones y recepciones de mercancía.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por ID o proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                     <FilterButton 
                        label="Estado" 
                        options={statusOptions} 
                        selectedValue={statusFilter} 
                        onSelect={setStatusFilter} 
                    />
                    <Link to="/purchase/orders/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:opacity-90 transition-colors whitespace-nowrap">
                        <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                        Nueva OC
                    </Link>
                </div>
            </div>

            {!orders || orders.length === 0 ? (
                <EmptyState 
                    icon="receipt_long"
                    title="No hay órdenes de compra"
                    message="Crea tu primera orden de compra para empezar a gestionar tus adquisiciones."
                    actionText="Crear Orden de Compra"
                    onAction={() => navigate('/purchase/orders/new')}
                />
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                     <Table columns={columns} data={filteredOrders} />
                </div>
            )}
        </div>
    );
};

export default PurchaseOrdersPage;
