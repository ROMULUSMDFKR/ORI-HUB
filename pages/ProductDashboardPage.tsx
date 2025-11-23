
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category, ProductLot, SalesOrder, QuoteItem } from '../types';
import Spinner from '../components/ui/Spinner';

// --- Reusable UI Components ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: string; link?: string; variant?: 'default' | 'money' }> = ({ title, value, icon, link, variant = 'default' }) => {
  const isMoney = variant === 'money';
  
  const content = (
    <div className={`${isMoney ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-white dark:bg-slate-800'} p-6 rounded-xl shadow-md border ${isMoney ? 'border-transparent' : 'border-slate-200 dark:border-slate-700'} h-full flex flex-col justify-between relative overflow-hidden`}>
      {isMoney && (
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
      )}
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <h3 className={`text-base font-semibold ${isMoney ? 'text-emerald-50' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
          <span className={`material-symbols-outlined text-3xl ${isMoney ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>{icon}</span>
        </div>
        <p className="text-4xl font-bold mt-2">{value}</p>
      </div>
    </div>
  );

  return link ? <Link to={link} className="block h-full">{content}</Link> : content;
};

const ChartCard: React.FC<{ title: string; data: { label: string; value: number; color?: string }[]; type?: 'bar' | 'donut' }> = ({ title, data, type = 'bar' }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const totalValue = data.reduce((a, b) => a + b.value, 0);
  const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500'];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 h-full">
      <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            return (
                <div key={item.label} className="group">
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        {type === 'donut' && <span className={`w-2 h-2 rounded-full ${item.color || colors[index % colors.length]}`}></span>}
                        {item.label}
                    </span>
                    <div className="text-right">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mr-2">
                            {type === 'bar' ? `$${(item.value || 0).toLocaleString()}` : item.value.toLocaleString()}
                        </span>
                        {type === 'donut' && <span className="text-xs text-slate-400">({percentage.toFixed(0)}%)</span>}
                    </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`${item.color || colors[index % colors.length]} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${type === 'bar' ? (maxValue > 0 ? (item.value / maxValue) * 100 : 0) : percentage}%` }}
                    ></div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

const ProductListCard: React.FC<{ title: string; products: any[]; linkTo: string; emptyMessage: string; showStock?: boolean }> = ({ title, products, linkTo, emptyMessage, showStock }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 h-full flex flex-col">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
      <Link to={linkTo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todo</Link>
    </div>
    <ul className="space-y-3 flex-1">
      {products.length > 0 ? products.map(product => (
        <li key={product.id}>
          <Link to={`/products/${product.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</p>
                </div>
            </div>
            <div className="text-right">
                {showStock && product.totalStock !== undefined ? (
                    <div className="flex flex-col items-end">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.totalStock <= (product.reorderPoint || 0) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-600'}`}>
                             {product.totalStock.toLocaleString()} {product.unitDefault}
                         </span>
                         {product.reorderPoint && <span className="text-[10px] text-slate-400 mt-0.5">Mín: {product.reorderPoint}</span>}
                    </div>
                ) : (
                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                )}
            </div>
          </Link>
        </li>
      )) : (
        <li className="text-center text-sm text-slate-500 dark:text-slate-400 py-8 flex flex-col items-center">
            <span className="material-symbols-outlined text-3xl mb-2 opacity-50">check_circle</span>
            {emptyMessage}
        </li>
      )}
    </ul>
  </div>
);

const QuickActions = () => (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <Link to="/products/new" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Nuevo Producto
        </Link>
        <Link to="/inventory/movements" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-lg text-blue-500">swap_horiz</span>
            Registrar Movimiento
        </Link>
        <Link to="/products/list" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-lg text-orange-500">qr_code_scanner</span>
            Gestión de Lotes
        </Link>
         <Link to="/products/categories" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-lg text-purple-500">category</span>
            Categorías
        </Link>
    </div>
);

// --- Main Dashboard Page Component ---

const ProductDashboardPage: React.FC = () => {
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: categories, loading: cLoading } = useCollection<Category>('categories');
    const { data: lotsData, loading: lLoading } = useCollection<ProductLot>('lots');
    const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: locations, loading: locLoading } = useCollection<any>('locations');

    const loading = pLoading || cLoading || lLoading || soLoading || locLoading;

    // --- Data Processing ---
    const lotsByProductId = useMemo(() => {
        if (!lotsData) return new Map<string, ProductLot[]>();
        return lotsData.reduce((acc, lot) => {
            if (!acc.has(lot.productId)) {
                acc.set(lot.productId, []);
            }
            acc.get(lot.productId)!.push(lot);
            return acc;
        }, new Map<string, ProductLot[]>());
    }, [lotsData]);


    // --- KPI Calculations ---
    const kpiData = useMemo(() => {
        if (!products || !salesOrders || !lotsData) {
            return { 
                total: 0, 
                active: 0, 
                lowStock: 0, 
                topSeller: { name: '-', value: 0 },
                inventoryValue: 0,
                lotStatus: { available: 0, quarantine: 0, exhausted: 0 }
            };
        }

        let lowStockCount = 0;
        let totalInventoryValuation = 0;
        
        const lotStatusCounts = { available: 0, quarantine: 0, exhausted: 0 };

        lotsData.forEach(lot => {
            // Valuation
            const currentQty = lot.stock.reduce((sum, s) => sum + s.qty, 0);
            totalInventoryValuation += currentQty * lot.unitCost;

            // Status
            if (lot.status === 'Disponible') lotStatusCounts.available++;
            else if (lot.status === 'En Cuarentena') lotStatusCounts.quarantine++;
            else if (lot.status === 'Agotado') lotStatusCounts.exhausted++;
        });
        
        products.forEach(p => {
            if (p.reorderPoint) {
                const productLots = lotsByProductId.get(p.id) || [];
                const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
                if (totalStock < p.reorderPoint) {
                    lowStockCount++;
                }
            }
        });

        const salesByProduct: { [productId: string]: number } = {};
        salesOrders.forEach(order => {
            order.items.forEach((item: QuoteItem) => {
                salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + item.subtotal;
            });
        });

        let topSeller = { name: '-', value: 0 };
        if (Object.keys(salesByProduct).length > 0) {
            const topProductId = Object.keys(salesByProduct).reduce((a, b) => salesByProduct[a] > salesByProduct[b] ? a : b);
            const topProduct = products.find(p => p.id === topProductId);
            if (topProduct) {
                topSeller = { name: topProduct.name, value: salesByProduct[topProductId] };
            }
        }

        return {
            total: products.length,
            active: products.filter(p => p.isActive).length,
            lowStock: lowStockCount,
            topSeller: topSeller,
            inventoryValue: totalInventoryValuation,
            lotStatus: lotStatusCounts
        };
    }, [products, salesOrders, lotsData, lotsByProductId]);

    // --- Chart and List Data ---
    const salesByCategory = useMemo(() => {
        if (!products || !categories || !salesOrders) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const sales: { [categoryId: string]: number } = {};

        salesOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    sales[product.categoryId] = (sales[product.categoryId] || 0) + item.subtotal;
                }
            });
        });
        
        return Object.entries(sales)
            .map(([catId, value]) => ({ label: categoryMap.get(catId) || 'Sin Categoría', value }))
            .sort((a, b) => b.value - a.value);
    }, [products, categories, salesOrders]);
    
    const warehouseDistribution = useMemo(() => {
        if (!lotsData || !locations) return [];
        const locMap = new Map(locations.map((l: any) => [l.id, l.name]));
        const dist: Record<string, number> = {};

        lotsData.forEach(lot => {
            lot.stock.forEach(s => {
                 // Rough approximation: count raw units (mixing kg, L, units). 
                 // In a real app, normalize to a standard value or just count items.
                 // For dashboard visual, item count might be safer than mixed units sum.
                 // Let's do "Lotes/Items stored" count for simplicity or sum if unit is consistent.
                 // Going with Unit Sum for visual impact, assuming similar scale.
                 dist[s.locationId] = (dist[s.locationId] || 0) + s.qty;
            });
        });

        return Object.entries(dist)
            .map(([locId, value]) => ({ 
                label: locMap.get(locId) || 'Ubicación Desconocida', 
                value: Math.round(value),
                color: 'bg-slate-500' // Default, can be mapped
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

    }, [lotsData, locations]);

    const lowStockList = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            if (!p.reorderPoint) return false;
            const productLots = lotsByProductId.get(p.id) || [];
            const totalStock = productLots.reduce((sum, lot) => sum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 0);
            // Attach total stock for display
            (p as any).totalStock = totalStock;
            return totalStock < p.reorderPoint;
        }).slice(0, 5);
    }, [products, lotsByProductId]);

    const recentProducts = useMemo(() => {
        if (!products) return [];
        return [...products].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);
    }, [products]);
    
    const lotStatusData = useMemo(() => [
        { label: 'Disponibles', value: kpiData?.lotStatus.available || 0, color: 'bg-green-500' },
        { label: 'Cuarentena', value: kpiData?.lotStatus.quarantine || 0, color: 'bg-amber-500' },
        { label: 'Agotados/Histórico', value: kpiData?.lotStatus.exhausted || 0, color: 'bg-slate-400' },
    ], [kpiData]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Panel de Productos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Visión general del catálogo e inventario.</p>
                </div>
            </div>

            <QuickActions />
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Valor Inventario (Costo)" value={`$${kpiData?.inventoryValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon="paid" variant="money" />
                <KpiCard title="Total de SKUs" value={kpiData?.total || 0} icon="inventory_2" link="/products/list" />
                <KpiCard title="Productos con Bajo Stock" value={kpiData?.lowStock || 0} icon="warning" link="/inventory/alerts" />
                <KpiCard title="Top Ventas (Mes)" value={kpiData?.topSeller.name || '-'} icon="star" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ChartCard title="Ventas por Categoría" data={salesByCategory} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <ChartCard title="Distribución por Almacén (Unidades)" data={warehouseDistribution} type="donut" />
                         <ChartCard title="Estado de Lotes" data={lotStatusData} type="donut" />
                    </div>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <ProductListCard title="⚠️ Alertas de Stock" products={lowStockList} linkTo="/inventory/alerts" emptyMessage="¡Todo el stock está en orden!" showStock />
                    <ProductListCard title="🆕 Productos Recientes" products={recentProducts} linkTo="/products/list" emptyMessage="No hay productos nuevos." />
                </div>
            </div>
        </div>
    );
};

export default ProductDashboardPage;
