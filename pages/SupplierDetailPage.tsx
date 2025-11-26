
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Supplier, SupplierRating, Note, PurchaseOrder } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';
import Table from '../components/ui/Table';

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right">{value}</dd>
    </div>
);

const getRatingColor = (rating?: SupplierRating) => {
    switch (rating) {
        case SupplierRating.Excelente: return 'green';
        case SupplierRating.Bueno: return 'blue';
        case SupplierRating.Regular: return 'yellow';
        default: return 'gray';
    }
};

const SupplierDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: supplier, loading, error } = useDoc<Supplier>('suppliers', id || '');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    
    const [activeTab, setActiveTab] = useState<'General' | 'Ordenes'>('General');

    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.supplierId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);
    
    const supplierOrders = useMemo(() => {
        if (!purchaseOrders || !id) return [];
        return purchaseOrders.filter(po => po.supplierId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseOrders, id]);

    const stats = useMemo(() => {
        const totalSpent = supplierOrders.reduce((sum, po) => sum + po.total, 0);
        const openOrders = supplierOrders.filter(po => po.status === 'Enviada' || po.status === 'Confirmada').length;
        return { totalSpent, openOrders };
    }, [supplierOrders]);

    const handleNoteAdded = (note: Note) => {
        // Optimistic handled by useCollection hook
    };

    if (loading || notesLoading || poLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !supplier) return <div className="text-center p-12">Proveedor no encontrado</div>;
    
    const orderColumns = [
        { header: 'Orden #', accessor: (po: PurchaseOrder) => <Link to={`/purchase/orders/${po.id}`} className="text-indigo-600 hover:underline font-mono">{po.id}</Link> },
        { header: 'Fecha', accessor: (po: PurchaseOrder) => new Date(po.createdAt).toLocaleDateString() },
        { header: 'Total', accessor: (po: PurchaseOrder) => `$${po.total.toLocaleString()}`, className: 'text-right' },
        { header: 'Estado', accessor: (po: PurchaseOrder) => <Badge text={po.status} color="gray" /> }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                         {/* App Icon Pattern */}
                        <div className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-lg">
                            {supplier.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{supplier.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                {supplier.rating && <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} />}
                                <span className="text-sm text-slate-500 dark:text-slate-400">{supplier.industry}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to={`/purchase/suppliers/${supplier.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar
                    </Link>
                    <Link to="/purchase/orders/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">add_shopping_cart</span>
                        Nueva Orden
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6">
                     {['General', 'Ordenes'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab === 'Ordenes' ? `Historial de Compras` : 'Información General'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Grid */}
            <div className="mt-6">
                {activeTab === 'General' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <InfoCard title="Contacto Principal" icon="person">
                                    <InfoRow label="Nombre" value={supplier.contactPerson?.name || '-'} />
                                    <InfoRow label="Email" value={supplier.contactPerson?.email ? <a href={`mailto:${supplier.contactPerson.email}`} className="text-indigo-600 hover:underline">{supplier.contactPerson.email}</a> : '-'} />
                                    <InfoRow label="Teléfono" value={supplier.contactPerson?.phone || '-'} />
                                </InfoCard>
                                <InfoCard title="Datos Bancarios" icon="account_balance">
                                    <InfoRow label="Banco" value={supplier.bankInfo?.bankName || '-'} />
                                    <InfoRow label="Cuenta" value={supplier.bankInfo?.accountNumber || '-'} />
                                    <InfoRow label="CLABE" value={supplier.bankInfo?.clabe || '-'} />
                                </InfoCard>
                            </div>
                            <NotesSection 
                                entityId={supplier.id}
                                entityType="supplier"
                                notes={notes}
                                onNoteAdded={handleNoteAdded}
                            />
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="text-lg font-bold opacity-90 mb-4">Resumen Financiero</h3>
                                <div className="mb-4">
                                    <p className="text-indigo-100 text-sm">Gasto Total Histórico</p>
                                    <p className="text-3xl font-bold">${(stats.totalSpent / 1000).toFixed(1)}k</p>
                                </div>
                                <div>
                                    <p className="text-indigo-100 text-sm">Órdenes Activas</p>
                                    <p className="text-2xl font-bold">{stats.openOrders}</p>
                                </div>
                            </div>

                            <InfoCard title="Ubicación" icon="location_on">
                                <p className="text-sm text-slate-600 dark:text-slate-300">{supplier.address?.street}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{supplier.address?.city}, {supplier.address?.state}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{supplier.address?.zip}</p>
                                {supplier.phone && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                    <span className="material-symbols-outlined text-base">call</span>
                                    {supplier.phone}
                                </div>}
                                {supplier.website && <div className="mt-1 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                    <span className="material-symbols-outlined text-base">language</span>
                                    <a href={supplier.website} target="_blank" rel="noreferrer" className="hover:underline">Sitio Web</a>
                                </div>}
                            </InfoCard>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <Table columns={orderColumns} data={supplierOrders} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierDetailPage;
