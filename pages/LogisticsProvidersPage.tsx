
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Carrier, SupplierRating } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const LogisticsProvidersPage: React.FC = () => {
    const { data: carriers, loading, error } = useCollection<Carrier>('carriers');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'list' | 'map' | 'tariffs' | 'config'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');

    const getRatingColor = (rating: SupplierRating) => {
        switch (rating) {
            case SupplierRating.Excelente: return 'green';
            case SupplierRating.Bueno: return 'blue';
            case SupplierRating.Regular: return 'yellow';
            default: return 'gray';
        }
    };
    
    const filteredCarriers = useMemo(() => {
        if (!carriers) return [];
        return carriers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  c.contactName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRating = ratingFilter === 'all' || c.rating === ratingFilter;
            return matchesSearch && matchesRating;
        });
    }, [carriers, searchTerm, ratingFilter]);

    const columns = [
        {
            header: 'Transportista',
            accessor: (c: Carrier) => (
                <div className="flex items-center gap-3">
                    {/* App Icon Pattern */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-sm">
                        {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                </div>
            ),
        },
        {
            header: 'Servicios',
            accessor: (c: Carrier) => (
                <div className="flex gap-1 flex-wrap">
                    {c.serviceTypes.length > 0 ? c.serviceTypes.map(t => (
                        <span key={t} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                            {t}
                        </span>
                    )) : <span className="text-xs text-slate-400 italic">Sin servicios</span>}
                </div>
            ),
        },
        { 
            header: 'Contacto', 
            accessor: (c: Carrier) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.contactName || '-'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{c.contactPhone}</span>
                </div>
            ) 
        },
        {
            header: 'Calificación',
            accessor: (c: Carrier) => c.rating ? <Badge text={c.rating} color={getRatingColor(c.rating)} /> : <span className="text-slate-400">-</span>,
        },
        {
            header: 'Acciones',
            accessor: (c: Carrier) => (
                <div className="flex justify-end gap-2">
                     <button className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];
    
    const ratingOptions = [
        { value: 'all', label: 'Todos' },
        ...Object.values(SupplierRating).map(r => ({ value: r, label: r }))
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los transportistas.</p>;
        
        if (activeTab === 'map') {
             return (
                <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">map</span>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Mapa de Cobertura</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">Visualiza las áreas de operación de tus transportistas activos.</p>
                </div>
            );
        }
        
        if (!carriers || carriers.length === 0) {
            return (
                <EmptyState
                    icon="local_shipping"
                    title="No hay transportistas"
                    message="Añade tus proveedores de transporte para gestionar tus entregas."
                    actionText="Añadir Transportista"
                    onAction={() => navigate('/logistics/providers/new')}
                />
            );
        }
        
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                 <Table columns={columns} data={filteredCarriers} />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Transportistas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu red de socios logísticos y sus tarifas.</p>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <nav className="-mb-px flex space-x-8 overflow-x-auto w-full sm:w-auto" aria-label="Tabs">
                    {['list', 'map', 'tariffs', 'config'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)} 
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'}`}
                        >
                            {tab === 'list' ? 'Proveedores' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
                {activeTab === 'list' && (
                    <Link
                        to="/logistics/providers/new"
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm mb-2 sm:mb-0 w-full sm:w-auto justify-center">
                        <span className="material-symbols-outlined mr-2 text-lg">add</span>
                        Nuevo Transportista
                    </Link>
                )}
            </div>
            
            {/* Toolbar for List View */}
            {activeTab === 'list' && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                     {/* Input Safe Pattern */}
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar transportista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                         <FilterButton 
                            label="Calificación" 
                            options={ratingOptions} 
                            selectedValue={ratingFilter} 
                            onSelect={setRatingFilter} 
                        />
                    </div>
                </div>
            )}

            {renderContent()}
        </div>
    );
};

export default LogisticsProvidersPage;
