
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { PurchaseOrder, Supplier } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';

// Reusable UI Components
const KpiCard: React.FC<{ title: string; value: string | number; icon: string; link?: string; variant?: 'default' | 'money' }> = ({ title, value, icon, link, variant = 'default' }) => {
    const isMoney = variant === 'money';
    const content = (
      <div className={`${isMoney ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-white dark:bg-slate-800'} p-6 rounded-xl shadow-sm border ${isMoney ? 'border-transparent' : 'border-slate-200 dark:border-slate-700'} h-full flex flex-col justify-between`}>
        <div>
          <div className="flex justify-between items-start">
            <h3 className={`text-base font-semibold ${isMoney ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
            <span className={`material-symbols-outlined text-3xl ${isMoney ? 'text-emerald-200' : 'text-slate-400 dark:text-slate-500'}`}>{icon}</span>
          </div>
          <p className={`text-4xl font-bold mt-2 ${isMoney ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{value}</p>
        </div>
      </div>
    );
  
    return link ? <Link to={link}>{content}</Link> : content;
};

const ListCard: React.FC<{ title: string; children: React.ReactNode; linkTo: string; emptyMessage: string; }> = ({ title, children, linkTo, emptyMessage }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
        <Link to={linkTo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todo</Link>
      </div>
      {children}
    </div>
  );

const SpendingChartMock: React.FC = () => (
    <div className="flex items-end justify-between h-40 gap-2 mt-4 px-2">
        {[65, 40, 75, 55, 80, 95, 70].map((h, i) => (
            <div key={i} className="w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-t-md relative group">
                <div className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-t-md transition-all duration-500 group-hover:bg-indigo-600" style={{ height: `${h}%` }}></div>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded pointer-events-none transition-opacity">
                    ${h}k
                </div>
            </div>
        ))}
    </div>
);
  
const PurchasesDashboardPage: React.FC = () => {
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');

    const loading = poLoading || sLoading;

    const suppliersMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name])), [suppliers]);

    const kpiData = useMemo(() => {
        if (!purchaseOrders || !suppliers) {
            return { poThisMonth: 0, totalSpent: 0, activeSuppliers: 0, pendingReceptions: 0, accountsPayable: 0 };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const poThisMonth = purchaseOrders.filter(po => {
            const date = new Date(po.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const totalSpent = poThisMonth.reduce((sum, po) => sum + po.total, 0);
        const activeSuppliers = new Set(purchaseOrders.map(po => po.supplierId)).size;
        const pendingReceptions = purchaseOrders.filter(po => po.status === 'Enviada' || po.status === 'Confirmada').length;
        
        // Mock Accounts Payable logic (Total of not fully paid POs)
        const accountsPayable = purchaseOrders
            .filter(po => po.status !== 'Cancelada' && po.paidAmount < po.total)
            .reduce((sum, po) => sum + (po.total - po.paidAmount), 0);

        return {
            poThisMonth: poThisMonth.length,
            totalSpent: `$${(totalSpent / 1000).toFixed(1)}k`,
            activeSuppliers,
            pendingReceptions,
            accountsPayable: `$${(accountsPayable / 1000).toFixed(1)}k`
        };
    }, [purchaseOrders, suppliers]);
    
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

        return Object.entries(spendBySupplier)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, total]) => ({
                id,
                name: suppliersMap.get(id) || 'Desconocido',
                total
            }));
    }, [purchaseOrders, suppliers, suppliersMap]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Recibida Completa': return 'green';
            case 'Confirmada':
            case 'Recibida Parcial': return 'blue';
            case 'Enviada': return 'yellow';
            default: return 'gray';
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Cuentas por Pagar" value={kpiData.accountsPayable} icon="account_balance_wallet" variant="money" />
                <KpiCard title="Gasto Total (Mes)" value={kpiData.totalSpent} icon="payments" />
                <KpiCard title="OCs (Mes Actual)" value={kpiData.poThisMonth} icon="shopping_basket" link="/purchase/orders" />
                <KpiCard title="Recepciones Pendientes" value={kpiData.pendingReceptions} icon="local_shipping" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ListCard title="Órdenes de Compra Recientes" linkTo="/purchase/orders" emptyMessage="No hay órdenes de compra recientes.">
                         <div className="flex-1">
                            {recentPurchaseOrders.length > 0 ? (
                                <ul className="space-y-2">
                                    {recentPurchaseOrders.map(po => (
                                        <li key={po.id} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded text-indigo-600 dark:text-indigo-400 font-bold text-xs min-w-[60px] text-center">
                                                    {po.id.slice(0, 8)}...
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{suppliersMap.get(po.supplierId)}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">${(po.total || 0).toLocaleString()}</p>
                                                <div className="mt-1"><Badge text={po.status} color={getStatusColor(po.status)} /></div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-sm text-slate-500 py-8">No hay órdenes de compra recientes.</p>
                            )}
                        </div>
                    </ListCard>
                </div>
                <div>
                     <ListCard title="Top Proveedores por Gasto" linkTo="/purchase/suppliers" emptyMessage="No hay datos de gasto.">
                         <div className="flex-1">
                            {topSuppliers.length > 0 ? (
                                <ul className="space-y-4">
                                    {topSuppliers.map(s => (
                                        <li key={s.id}>
                                             <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">${s.total.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{width: `${(s.total / topSuppliers[0].total) * 100}%`}}></div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                 <p className="text-center text-sm text-slate-500 py-8">No hay datos de gasto.</p>
                            )}
                            
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tendencia de Gasto (7 Días)</p>
                                <SpendingChartMock />
                            </div>
                        </div>
                     </ListCard>
                </div>
            </div>
        </div>
    );
};

export default PurchasesDashboardPage;
