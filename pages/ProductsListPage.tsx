
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Product, Category, ProductLot, Supplier, LotStatus } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { api } from '../api/firebaseApi';
import AddLotDrawer from '../components/products/AddLotDrawer';
import { useToast } from '../hooks/useToast';
import FilterButton from '../components/ui/FilterButton';

// --- KPI Card Component ---
const ProductKpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
             <span className={`material-symbols-outlined text-2xl ${color.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
        </div>
    </div>
);

const ActionsMenu: React.FC<{ product: Product, onDelete: (product: Product) => void, onAddLot: (product: Product) => void }> = ({ product, onDelete, onAddLot }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
                className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <span className="material-symbols-outlined">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 transform origin-top-right">
                    <ul className="py-1">
                        <li>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddLot(product); setIsOpen(false); }} 
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-3 text-base">add_box</span>
                                Añadir Lote
                            </button>
                        </li>
                        <li>
                            <Link 
                                to={`/products/${product.id}/edit`}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-3 text-base">edit</span>
                                Editar
                            </Link>
                        </li>
                        <li>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(product); setIsOpen(false); }} 
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-3 text-base">delete</span>
                                Eliminar
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};


const ProductsListPage: React.FC = () => {
    const { data: initialProducts, loading: productsLoading, error: productsError } = useCollection<Product>('products');
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');
    // Fetch lots to calculate live stock in the list
    const { data: lotsData, loading: lotsLoading } = useCollection<ProductLot>('lots');
    const { showToast } = useToast();

    const [products, setProducts] = useState<Product[] | null>(null);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [brandFilter, setBrandFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    const [isAddLotDrawerOpen, setIsAddLotDrawerOpen] = useState(false);
    const [productForLot, setProductForLot] = useState<Product | null>(null);

    useEffect(() => {
        if(initialProducts) {
            setProducts(initialProducts);
        }
    }, [initialProducts]);

    const categoriesMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(cat => [cat.id, cat.name]));
    }, [categories]);

    // --- Calculated Data for Products (Stock & Value) ---
    const enrichedProducts = useMemo(() => {
        if (!products) return [];
        return products.map(p => {
            const pLots = lotsData?.filter(l => l.productId === p.id) || [];
            const totalStock = pLots.reduce((sum, lot) => sum + lot.stock.reduce((sSum, s) => sSum + s.qty, 0), 0);
            const totalValue = pLots.reduce((sum, lot) => {
                const lotStock = lot.stock.reduce((sSum, s) => sSum + s.qty, 0);
                return sum + (lotStock * lot.unitCost);
            }, 0);
            
            return {
                ...p,
                calculatedStock: totalStock,
                calculatedValue: totalValue
            };
        });
    }, [products, lotsData]);

    const filteredProducts = useMemo(() => {
        return enrichedProducts.filter(product => {
            const matchesText = product.name.toLowerCase().includes(filter.toLowerCase()) ||
                                product.sku.toLowerCase().includes(filter.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
            const matchesBrand = brandFilter === 'all' || (product.brand === brandFilter);
            const matchesStatus = statusFilter === 'all' 
                ? true 
                : statusFilter === 'active' ? product.isActive 
                : !product.isActive;

            return matchesText && matchesCategory && matchesBrand && matchesStatus;
        });
    }, [enrichedProducts, filter, categoryFilter, brandFilter, statusFilter]);

    // --- KPI Stats ---
    const stats = useMemo(() => {
        const totalValue = enrichedProducts.reduce((sum, p) => sum + p.calculatedValue, 0);
        const lowStock = enrichedProducts.filter(p => p.reorderPoint && p.calculatedStock <= p.reorderPoint).length;
        const activeCount = enrichedProducts.filter(p => p.isActive).length;
        return { totalValue, lowStock, activeCount };
    }, [enrichedProducts]);
    
    const handleOpenAddLot = (product: Product) => {
        setProductForLot(product);
        setIsAddLotDrawerOpen(true);
    };

    const handleSaveLot = async (newLotData: any) => {
        if (!productForLot) return;

        const newLot: Omit<ProductLot, 'id'> = {
            productId: productForLot.id,
            code: newLotData.code,
            unitCost: newLotData.unitCost,
            supplierId: newLotData.supplierId,
            receptionDate: new Date(newLotData.receptionDate).toISOString(),
            initialQty: newLotData.initialQty,
            status: LotStatus.Disponible,
            pricing: { min: newLotData.minSellPrice },
            stock: [{ locationId: newLotData.initialLocationId, qty: newLotData.initialQty }]
        };
        
        try {
            const addedLot = await api.addDoc('lots', newLot);
            showToast('success', `Lote ${addedLot.code} para ${productForLot.name} añadido exitosamente.`);
            setIsAddLotDrawerOpen(false);
            setProductForLot(null);
        } catch (error) {
            console.error("Error adding lot:", error);
            showToast('error', "Error al añadir el lote.");
        }
    };


    const handleDeleteProduct = async (product: Product) => {
        try {
            const productLots = await api.getLotsForProduct(product.id);
            const hasStock = productLots.some(lot => lot.stock?.some((s: { qty: number; }) => s.qty > 0));
            
            if (hasStock) {
                showToast('warning', `No se puede eliminar "${product.name}" porque tiene lotes con stock disponible.`);
                return;
            }

            if (window.confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`)) {
                await api.deleteDoc('products', product.id);
                setProducts(prev => prev!.filter(p => p.id !== product.id));
                showToast('success', 'Producto eliminado con éxito.');
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            showToast('error', "No se pudo eliminar el producto.");
        }
    };

    const categoryOptions = (categories || []).map(c => ({ value: c.id, label: c.name }));
    const brandOptions = Array.from(new Set(enrichedProducts.map(p => p.brand).filter(Boolean))).map(b => ({ value: b!, label: b! }));
    const statusOptions = [{ value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }];

    const columns = [
        { 
            header: 'Producto', 
            accessor: (p: any) => (
                <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                        {p.imageUrl ? (
                             <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                             <span className="material-symbols-outlined text-slate-400 text-xl">image</span>
                        )}
                     </div>
                     <div>
                        <Link to={`/products/${p.id}`} className="font-semibold text-sm text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">
                            {p.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                             <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{p.sku}</span>
                             {p.brand && <span>• {p.brand}</span>}
                        </div>
                     </div>
                </div>
            )
        },
        { header: 'Categoría', accessor: (p: any) => <Badge text={categoriesMap.get(p.categoryId) || 'N/A'} color="gray" /> },
        { 
            header: 'Stock', 
            accessor: (p: any) => {
                const max = p.maxStock || p.calculatedStock * 1.5 || 100;
                const percent = Math.min((p.calculatedStock / max) * 100, 100);
                const isLow = p.reorderPoint && p.calculatedStock <= p.reorderPoint;
                
                return (
                    <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                {p.calculatedStock.toLocaleString()} <span className="font-normal text-slate-500">{p.unitDefault}</span>
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                );
            }
        },
        { 
            header: 'Valor Stock', 
            accessor: (p: any) => (
                <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">${p.calculatedValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div className="text-[10px] text-slate-400">Costo Prom.</div>
                </div>
            ),
            className: 'text-right' 
        },
        { 
            header: 'Precio Venta', 
            accessor: (p: any) => (
                 <div className="text-right">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">${p.pricing.min.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 ml-1">{p.currency}</span>
                 </div>
            ),
            className: 'text-right' 
        },
        { 
            header: 'Estado', 
            accessor: (p: any) => (
                p.isActive ? <span className="w-2 h-2 rounded-full bg-green-500 block mx-auto" title="Activo"></span> : <span className="w-2 h-2 rounded-full bg-red-500 block mx-auto" title="Inactivo"></span>
            ),
            className: 'text-center'
        },
        {
            header: 'Acciones',
            accessor: (p: Product) => <div className="flex justify-center"><ActionsMenu product={p} onDelete={handleDeleteProduct} onAddLot={handleOpenAddLot} /></div>,
            className: 'text-center'
        }
    ];
    
    const loading = productsLoading || categoriesLoading || suppliersLoading || locationsLoading || lotsLoading;

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (productsError) return <p className="text-center text-red-500 py-12">Error al cargar los productos.</p>;
        if (!filteredProducts || filteredProducts.length === 0) {
            return (
                <div className="p-6">
                    <EmptyState
                        icon="inventory_2"
                        title="No se encontraron productos"
                        message="Ajusta los filtros o comienza creando tu primer producto."
                        actionText="Crear Producto"
                        onAction={() => navigate('/products/new')}
                    />
                </div>
            );
        }
        return <Table columns={columns} data={filteredProducts} />;
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProductKpiCard title="Valor Total Inventario (Costo)" value={`$${stats.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon="paid" color="bg-emerald-500" />
                <ProductKpiCard title="Productos Bajo Stock" value={stats.lowStock} icon="warning" color="bg-amber-500" />
                <ProductKpiCard title="SKUs Activos" value={stats.activeCount} icon="check_circle" color="bg-blue-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                         <div className="flex items-center w-full md:w-64 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500">
                            <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">search</span>
                            <input
                                id="product-search"
                                type="text"
                                placeholder="Buscar..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none search-input-field"
                            />
                        </div>
                        <FilterButton label="Categoría" options={categoryOptions} selectedValue={categoryFilter} onSelect={setCategoryFilter} />
                        <FilterButton label="Marca" options={brandOptions} selectedValue={brandFilter} onSelect={setBrandFilter} />
                        <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                    </div>

                    <Link 
                        to="/products/new"
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined mr-2 text-base">add</span>
                        Nuevo Producto
                    </Link>
                </div>
                
                {renderContent()}
            </div>
            <AddLotDrawer 
                isOpen={isAddLotDrawerOpen}
                onClose={() => setIsAddLotDrawerOpen(false)}
                onSave={handleSaveLot}
                suppliers={suppliers || []}
                locations={locations || []}
                productSku={productForLot?.sku}
            />
        </div>
    );
};

export default ProductsListPage;
