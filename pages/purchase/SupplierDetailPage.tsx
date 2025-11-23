
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Supplier, SupplierRating, Note, PurchaseOrder } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string, icon?: string }> = ({ title, children, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</dd>
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
    const { data: orders, loading: ordersLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    
    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.supplierId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const supplierOrders = useMemo(() => {
        if (!orders || !id) return [];
        return orders.filter(o => o.supplierId === id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, id]);

    const financialStats = useMemo(() => {
        const totalSpent = supplierOrders.reduce((sum, o) => sum + o.total, 0);
        const openOrdersCount = supplierOrders.filter(o => o.status === 'Enviada' || o.status === 'Confirmada').length;
        // Mock balance calculation
        const balance = supplierOrders.reduce((sum, o) => sum + (o.total - o.paidAmount), 0);
        return { totalSpent, openOrdersCount, balance };
    }, [supplierOrders]);

    const handleNoteAdded = (note: Note) => {
        // Handled by useCollection subscription
    };

    if (loading || notesLoading || ordersLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !supplier) return <div className="text-center p-12">Proveedor no encontrado</div>;

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xl overflow-hidden border border-slate-300 dark:border-slate-600">
                        {supplier.logoUrl ? <img src={supplier.logoUrl} alt={supplier.name} className="w-full h-full object-cover" /> : supplier.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {supplier.name}
                            {supplier.rating && <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} />}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">factory</span> {supplier.industry || 'Industria N/A'}</span>
                             <span>•</span>
                             <span>{supplier.supplierType || 'Proveedor General'}</span>
                             {supplier.website && (
                                 <>
                                    <span>•</span>
                                    <a href={supplier.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                                        Website <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    </a>
                                 </>
                             )}
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                    <Link to={`/purchase/suppliers/${supplier.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar
                    </Link>
                    <Link to="/purchase/orders/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">add_shopping_cart</span>
                        Nueva Orden
                    </Link>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                     <div>
                         <p className="text-sm text-slate-500 font-semibold uppercase">Gasto Histórico</p>
                         <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">${financialStats.totalSpent.toLocaleString()}</p>
                     </div>
                     <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full text-green-600"><span className="material-symbols-outlined">payments</span></div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                     <div>
                         <p className="text-sm text-slate-500 font-semibold uppercase">Saldo Pendiente</p>
                         <p className="text-2xl font-bold text-red-600">${financialStats.balance.toLocaleString()}</p>
                     </div>
                     <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600"><span className="material-symbols-outlined">account_balance_wallet</span></div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                     <div>
                         <p className="text-sm text-slate-500 font-semibold uppercase">Órdenes Abiertas</p>
                         <p className="text-2xl font-bold text-blue-600">{financialStats.openOrdersCount}</p>
                     </div>
                     <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600"><span className="material-symbols-outlined">shopping_basket</span></div>
                 </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title="Órdenes de Compra Recientes" icon="receipt_long">
                        {supplierOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-slate-500 bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="p-2 rounded-l-lg">Folio</th>
                                            <th className="p-2">Fecha</th>
                                            <th className="p-2">Total</th>
                                            <th className="p-2 rounded-r-lg">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {supplierOrders.slice(0, 5).map(order => (
                                            <tr key={order.id}>
                                                <td className="p-2 font-medium text-indigo-600">
                                                    <Link to={`/purchase/orders/${order.id}`}>{order.id.slice(0,8)}...</Link>
                                                </td>
                                                <td className="p-2 text-slate-600 dark:text-slate-300">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="p-2 font-bold text-slate-800 dark:text-slate-200">${order.total.toLocaleString()}</td>
                                                <td className="p-2"><Badge text={order.status} color="gray" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay órdenes registradas.</p>
                        )}
                        <div className="text-right mt-2">
                             <Link to="/purchase/orders" className="text-xs font-bold text-indigo-600 hover:underline">Ver todas las órdenes &rarr;</Link>
                        </div>
                    </InfoCard>
                    
                    <NotesSection 
                        entityId={supplier.id}
                        entityType="supplier"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Condiciones Comerciales" icon="handshake">
                        <InfoRow label="Días de Crédito" value={supplier.creditDays ? `${supplier.creditDays} días` : 'Contado'} />
                        <InfoRow label="Límite Crédito" value={supplier.creditLimit ? `$${supplier.creditLimit.toLocaleString()}` : 'No definido'} />
                        <InfoRow label="Tiempo Entrega" value={supplier.leadTimeDays ? `${supplier.leadTimeDays} días (prom.)` : '-'} />
                        <InfoRow label="Tax ID / RFC" value={supplier.taxId || 'N/A'} />
                    </InfoCard>

                    <InfoCard title="Contacto Principal" icon="person">
                        {supplier.contactPerson?.name ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                        {supplier.contactPerson.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{supplier.contactPerson.name}</p>
                                        <p className="text-xs text-slate-500">Contacto Primario</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2 text-sm">
                                    {supplier.contactPerson.email && (
                                        <a href={`mailto:${supplier.contactPerson.email}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">
                                            <span className="material-symbols-outlined text-slate-400 text-lg">mail</span> {supplier.contactPerson.email}
                                        </a>
                                    )}
                                     {supplier.contactPerson.phone && (
                                        <a href={`tel:${supplier.contactPerson.phone}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">
                                            <span className="material-symbols-outlined text-slate-400 text-lg">call</span> {supplier.contactPerson.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay contacto principal asignado.</p>
                        )}
                    </InfoCard>
                    
                     <InfoCard title="Datos Bancarios" icon="account_balance">
                        <InfoRow label="Banco" value={supplier.bankInfo?.bankName || '-'} />
                        <InfoRow label="Cuenta" value={supplier.bankInfo?.accountNumber || '-'} />
                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-500 font-medium mb-1">CLABE</p>
                            <p className="font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 p-2 rounded select-all">{supplier.bankInfo?.clabe || '-'}</p>
                        </div>
                    </InfoCard>
                </div>
            </div>
        </div>
    );
};

export default SupplierDetailPage;
