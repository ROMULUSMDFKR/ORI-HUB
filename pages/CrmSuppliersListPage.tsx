

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Supplier, SupplierRating } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const CrmSuppliersListPage: React.FC = () => {
    const { data: suppliers, loading, error } = useCollection<Supplier>('suppliers');
    const [filter, setFilter] = useState('');
    const [industryFilter, setIndustryFilter] = useState<string>('all');
    const [ratingFilter, setRatingFilter] = useState<string>('all');

    const filteredData = useMemo(() => {
        if (!suppliers) return [];
        let result = suppliers;

        if (filter) {
            result = result.filter(item => 
                item.name.toLowerCase().includes(filter.toLowerCase())
            );
        }
        if (industryFilter !== 'all') {
            result = result.filter(s => s.industry === industryFilter);
        }
        if (ratingFilter !== 'all') {
            result = result.filter(s => s.rating === ratingFilter);
        }
        return result;
    }, [suppliers, filter, industryFilter, ratingFilter]);

    const getRatingColor = (rating?: SupplierRating) => {
        switch (rating) {
            case SupplierRating.Excelente: return 'green';
            case SupplierRating.Bueno: return 'blue';
            case SupplierRating.Regular: return 'yellow';
            default: return 'gray';
        }
    };

    const columns = [
        { 
            header: 'Nombre', 
            accessor: (supplier: Supplier) => (
                <Link to={`/crm/suppliers/${supplier.id}`} className="font-medium text-primary hover:underline">
                    {supplier.name}
                </Link>
            )
        },
        { header: 'Industria', accessor: (supplier: Supplier) => supplier.industry || '-' },
        { 
            header: 'Rating', 
            accessor: (supplier: Supplier) => (
                supplier.rating ? <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} /> : '-'
            )
        },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los proveedores.</p>;
        if (!filteredData || filteredData.length === 0) {
            return (
                <EmptyState
                    icon="conveyor_belt"
                    title="No hay proveedores"
                    message="Registra a tus proveedores para gestionar órdenes de compra y logística."
                    actionText="Crear Proveedor"
                    onAction={() => alert('Abrir drawer para nuevo proveedor')}
                />
            );
        }
        return <Table columns={columns} data={filteredData} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-text-main">Proveedores</h2>
                <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Proveedor
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-secondary pointer-events-none">
                        search
                    </span>
                    <input
                        id="supplier-search"
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-80 bg-surface pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Industria:</label>
                    <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                        <option value="all">Todas</option>
                        {[...new Set(suppliers?.map(s => s.industry).filter(Boolean))]?.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Rating:</label>
                    <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className="bg-white text-gray-900 text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
                        <option value="all">Todos</option>
                        {Object.values(SupplierRating).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default CrmSuppliersListPage;