import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Supplier, SupplierRating } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

const CrmSuppliersListPage: React.FC = () => {
    const { data: suppliers, loading, error } = useCollection<Supplier>('suppliers');
    const [filter, setFilter] = useState('');
    const [industryFilter, setIndustryFilter] = useState<string>('all');
    const [ratingFilter, setRatingFilter] = useState<string>('all');
    const navigate = useNavigate();

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
                <Link to={`/crm/suppliers/${supplier.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
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

    const industryOptions = useMemo(() => {
        if (!suppliers) return [];
        const uniqueIndustries = [...new Set(suppliers.map(s => s.industry).filter(Boolean) as string[])];
        return uniqueIndustries.map(ind => ({ value: ind, label: ind }));
    }, [suppliers]);

    const ratingOptions = useMemo(() => {
        return Object.values(SupplierRating).map(r => ({ value: r, label: r }));
    }, []);

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
                    onAction={() => navigate('/purchase/suppliers/new')}
                />
            );
        }
        return <Table columns={columns} data={filteredData} />;
    };
    

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Proveedores</h2>
                <Link to="/purchase/suppliers/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Proveedor
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center w-80 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
                        search
                    </span>
                    <input
                        id="supplier-search"
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-transparent pr-4 py-2 text-sm focus:outline-none"
                    />
                </div>
                <FilterButton
                    label="Industria"
                    options={industryOptions}
                    selectedValue={industryFilter}
                    onSelect={setIndustryFilter}
                    allLabel="Todas"
                />
                <FilterButton
                    label="Rating"
                    options={ratingOptions}
                    selectedValue={ratingFilter}
                    onSelect={setRatingFilter}
                    allLabel="Todos"
                />
            </div>
            
            {renderContent()}
        </div>
    );
};

export default CrmSuppliersListPage;