
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Supplier, SupplierRating } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

const SuppliersPage: React.FC = () => {
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
                <div className="flex items-center gap-3">
                    {/* App Icon Pattern - Initials */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-sm">
                        {supplier.name.substring(0, 2).toUpperCase()}
                    </div>
                    <Link to={`/purchase/suppliers/${supplier.id}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {supplier.name}
                    </Link>
                </div>
            )
        },
        { header: 'Industria', accessor: (supplier: Supplier) => <span className="text-slate-600 dark:text-slate-300 text-sm">{supplier.industry || '-'}</span> },
        { 
            header: 'Contacto', 
            accessor: (supplier: Supplier) => (
                 <div className="text-sm">
                    <p className="text-slate-700 dark:text-slate-300">{supplier.contactPerson?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{supplier.phone}</p>
                 </div>
            )
        },
        { 
            header: 'Rating', 
            accessor: (supplier: Supplier) => (
                supplier.rating ? <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} /> : <span className="text-slate-400">-</span>
            )
        },
        {
            header: 'Acciones',
            accessor: (supplier: Supplier) => (
                <div className="flex justify-end">
                    <Link to={`/purchase/suppliers/${supplier.id}`} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                    </Link>
                </div>
            ),
            className: 'text-right'
        }
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
                    icon="factory"
                    title="No hay proveedores"
                    message="Registra a tus proveedores para gestionar órdenes de compra y logística."
                    actionText="Crear Proveedor"
                    onAction={() => navigate('/purchase/suppliers/new')}
                />
            );
        }
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredData} />
            </div>
        );
    };
    

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Proveedores</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Directorio de socios comerciales y fabricantes.</p>
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
                        placeholder="Buscar proveedor..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
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
                     <Link to="/purchase/suppliers/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:opacity-90 transition-colors whitespace-nowrap">
                        <span className="material-symbols-outlined text-lg">add_business</span>
                        Nuevo
                    </Link>
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default SuppliersPage;
