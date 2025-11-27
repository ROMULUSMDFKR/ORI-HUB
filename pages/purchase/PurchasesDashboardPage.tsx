
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// Reusable UI Components
const KpiCard: React.FC<{ title: string; value: string | number; icon: string; link?: string; color: string }> = ({ title, value, icon, link, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }[color] || "bg-slate-100 text-slate-600";

    const content = (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex items-center gap-4 hover:shadow-md transition-all">
        <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
        </div>
      </div>
    );
  
    return link ? <Link to={link}>{content}</Link> : content;
};

const ListCard: React.FC<{ title: string; children: React.ReactNode; linkTo: string; emptyMessage: string; icon: string }> = ({ title, children, linkTo, emptyMessage, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">{icon}</span>
            {title}
        </h3>
        <Link to={linkTo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
      <div className="flex-1">
          {children}
      </div>
    </div>
  );
  
const PurchasesDashboardPage: React.FC = () => {
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');
    const [period, setPeriod] = useState('this_month');

    const loading = poLoading || sLoading;

    const suppliersMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name])), [suppliers]);

    const kpiData = useMemo(() => {
        if (!purchaseOrders || !suppliers) {
            return { poThisMonth: 0, totalSpent: 0, activeSuppliers: 0, pendingReceptions: 0 };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter based on period state (Simulated logic for demo purposes, defaulting to month)
        const filteredOrders = purchaseOrders.filter(po => {
            const date = new Date(po.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const totalSpent = filteredOrders.reduce((sum, po) => sum + po.total, 0);
        const activeSuppliers = new Set(purchaseOrders.map(po => po.supplierId)).size;
        const pendingReceptions = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.Ordenada || po.status === PurchaseOrderStatus.EnTransito).length;

        return {
            poThisMonth: filteredOrders.length,
            totalSpent: `$${(totalSpent / 1000).toFixed(1)}k`,
            activeSuppliers,
            pendingReceptions,
        };
    }, [purchaseOrders, suppliers, period]);
    
    const recentPurchaseOrders = useMemo(() => {
        if (!purchaseOrders) return [];
        return [...purchaseOrders]
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [purchaseOrders]);
    
    const topSuppliers = useMemo(() => {
        if (!purchaseOrders || !suppliers) return [];
        const spendBySupplier: { [key: string]: number } = {};
        purchaseOrders.forEach(po => {
            spendBySupplier[po.supplierId] = (spendBySupplier[po.supplierId] || 0) + po.total;
        });

        const maxSpend = Math.max(...Object.values(spendBySupplier), 1);

        return Object.entries(spendBySupplier)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, total]) => ({
                id,
                name: suppliersMap.get(id) || 'Desconocido',
                total,
                percentage: (total / maxSpend) * 100
            }));
    }, [purchaseOrders, suppliers, suppliersMap]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case PurchaseOrderStatus.Recibida: return 'green';
            case PurchaseOrderStatus.Pagada: return 'green';
            case PurchaseOrderStatus.Facturada: return 'green';
            case PurchaseOrderStatus.Ordenada:
            case PurchaseOrderStatus.PorAprobar:
            case PurchaseOrderStatus.PagoPendiente: return 'blue';
            case PurchaseOrderStatus.PagoParcial:
            case PurchaseOrderStatus.EnTransito: return 'yellow';
            case PurchaseOrderStatus.Cancelada: return 'red';
            default: return 'gray';
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const periodOptions = [
        { value: 'this_month', label: 'Este Mes' },
        { value: 'last_month', label: 'Mes Pasado' },
        { value: 'this_year', label: 'Este Año' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Dashboard de Compras</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visión general del gasto, órdenes activas y proveedores principales.</p>
                </div>
                <div className="flex gap-3 items-center">
                     <FilterButton 
                        label="Periodo" 
                        options={periodOptions} 
                        selectedValue={period} 
                        onSelect={setPeriod} 
                    />
                    <Link to="/purchase/orders/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                        Nueva Compra
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="OCs (Periodo)" value={kpiData.poThisMonth} icon="shopping_basket" link="/purchase/orders" color="indigo" />
                <KpiCard title="Gasto Total" value={kpiData.totalSpent} icon="payments" color="emerald" />
                <KpiCard title="Proveedores Activos" value={kpiData.activeSuppliers} icon="factory" link="/purchase/suppliers" color="blue" />
                <KpiCard title="Recepciones Pendientes" value={kpiData.pendingReceptions} icon="pending_actions" color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ListCard title="Órdenes de Compra Recientes" linkTo="/purchase/orders" emptyMessage="No hay órdenes de compra recientes." icon="receipt_long">
                        {recentPurchaseOrders.length > 0 ? (
                            <div className="space-y-3">
                                {recentPurchaseOrders.map(po => (
                                    <Link to={`/purchase/orders/${po.id}`} key={po.id} className="block group">
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all flex justify-between items-center shadow-sm hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center border border-slate-200 dark:border-slate-500 text-slate-500 dark:text-slate-300 font-bold text-xs">
                                                    OC
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{suppliersMap.get(po.supplierId)}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{po.id} • {new Date(po.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">${(po.total || 0).toLocaleString()}</p>
                                                <Badge text={po.status} color={getStatusColor(po.status)} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-slate-500 py-8">No hay órdenes de compra recientes.</p>
                        )}
                    </ListCard>
                </div>
                <div>
                     <ListCard title="Top Proveedores (Gasto)" linkTo="/purchase/suppliers" emptyMessage="No hay datos de gasto." icon="leaderboard">
                         <div className="flex-1 overflow-y-auto pr-2 max-h-[400px]">
                            {topSuppliers.length > 0 ? (
                                <ul className="space-y-5">
                                    {topSuppliers.map((s, index) => (
                                        <li key={s.id}>
                                             <div className="flex items-center justify-between text-sm mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{s.name}</span>
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">${s.total.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${s.percentage}%` }}></div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                 <p className="text-center text-sm text-slate-500 py-8">No hay datos de gasto.</p>
                            )}
                        </div>
                     </ListCard>
                </div>
            </div>
        </div>
    );
};

export default PurchasesDashboardPage;
