
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Carrier, SupplierRating } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const LogisticsProvidersPage: React.FC = () => {
    const { data: carriers, loading, error } = useCollection<Carrier>('carriers');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'list' | 'map' | 'tariffs' | 'config'>('list');

    const getRatingColor = (rating: SupplierRating) => {
        switch (rating) {
            case SupplierRating.Excelente: return 'green';
            case SupplierRating.Bueno: return 'blue';
            case SupplierRating.Regular: return 'yellow';
            default: return 'gray';
        }
    };

    const columns = [
        {
            header: 'Nombre del Transportista',
            accessor: (c: Carrier) => <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>,
        },
        {
            header: 'Rating',
            accessor: (c: Carrier) => <Badge text={c.rating} color={getRatingColor(c.rating)} />,
        },
        { header: 'Contacto', accessor: (c: Carrier) => c.contactName },
        { header: 'Teléfono', accessor: (c: Carrier) => c.contactPhone },
        {
            header: 'Tipos de Servicio',
            accessor: (c: Carrier) => <div className="flex gap-1 flex-wrap">{c.serviceTypes.map(t => <span key={t} className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{t}</span>)}</div>,
        },
        {
            header: 'Estado',
            accessor: (c: Carrier) => <Badge text="Activo" color="blue" /> // Mock active state
        },
        {
            header: 'Acciones',
            accessor: (c: Carrier) => (
                <button className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-base">more_horiz</span>
                </button>
            ),
            className: 'text-right'
        }
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar los transportistas.</p>;
        
        if (activeTab === 'map') {
             return (
                <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">map</span>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Mapa de Cobertura de Proveedores</h3>
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
        
        return <Table columns={columns} data={carriers} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Proveedores de Transporte</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu red de socios logísticos y sus tarifas.</p>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg px-4 flex justify-between items-center">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('list')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'list' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Proveedores</button>
                    <button onClick={() => setActiveTab('map')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'map' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Zonas de Cobertura (Mapa)</button>
                    <button onClick={() => setActiveTab('tariffs')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tariffs' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Tarifas</button>
                    <button onClick={() => setActiveTab('config')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'config' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Configuración</button>
                </nav>
                {activeTab === 'list' && (
                    <Link
                        to="/logistics/providers/new"
                        className="bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm">
                        <span className="material-symbols-outlined mr-1 text-base">add</span>
                        Nuevo Proveedor
                    </Link>
                )}
            </div>

            {renderContent()}
        </div>
    );
};

export default LogisticsProvidersPage;
