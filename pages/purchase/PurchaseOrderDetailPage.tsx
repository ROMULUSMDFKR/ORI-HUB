
import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { useCollection } from '../../hooks/useCollection';
import { PurchaseOrder, Supplier } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const PurchaseOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: order, loading: orderLoading, error } = useDoc<PurchaseOrder>('purchaseOrders', id || '');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');

    const loading = orderLoading || suppliersLoading;

    const supplier = useMemo(() => {
        if (!order || !suppliers) return null;
        return suppliers.find(s => s.id === order.supplierId);
    }, [order, suppliers]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Recibida Completa': return 'green';
            case 'Confirmada':
            case 'Recibida Parcial': return 'blue';
            case 'Enviada': return 'yellow';
            default: return 'gray';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !order) return <div className="text-center p-12">Orden de Compra no encontrada.</div>;

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Orden {order.id}</h1>
                        <Badge text={order.status} color={getStatusColor(order.status)} />
                    </div>
                    <Link to="/purchase/orders" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a la lista
                    </Link>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2">
                        <span className="material-symbols-outlined">print</span> Imprimir
                    </button>
                    <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        <span className="material-symbols-outlined">mail</span> Enviar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier & Dates Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">factory</span>
                            Información del Proveedor
                        </h3>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Proveedor</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-base mt-1">{supplier?.name || 'Desconocido'}</p>
                                <p className="text-slate-600 dark:text-slate-400">{supplier?.address?.city}, {supplier?.address?.state}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Contacto</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1">{supplier?.contactPerson?.name || '-'}</p>
                                <p className="text-indigo-600 dark:text-indigo-400">{supplier?.contactPerson?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Fecha Emisión</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Entrega Estimada</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Pendiente'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">list_alt</span>
                            Productos
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Producto</th>
                                        <th className="p-3 text-right">Cant.</th>
                                        <th className="p-3 text-right">Costo Unit.</th>
                                        <th className="p-3 rounded-r-lg text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {order.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.productName || 'Producto'}</td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">{item.qty} {item.unit}</td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">${item.unitCost.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">${item.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                         <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Total a Pagar</h3>
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between"><span>Subtotal</span> <span>${(order.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                                <div className="flex justify-between"><span>Impuestos</span> <span>${(order.tax || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                                <div className="flex justify-between text-lg font-bold border-t border-indigo-700/50 pt-3 mt-2 text-white">
                                    <span>Total</span>
                                    <span>${(order.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative blob */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Notas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                            {order.notes || 'Sin notas adicionales.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderDetailPage;
