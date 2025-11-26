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
                className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl z-20 border border-slate-200 dark:border-slate-700 transform origin-top-right overflow-hidden">
                    <ul className="py-1">
                        <li>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddLot(product); setIsOpen(false); }} 
                                className="w-full text-left flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-3 text-lg text-slate-400">add_box</span>
                                Añadir Lote
                            </button>
                        </li>
                        <li>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(product); setIsOpen(false); }} 
                                className="w-full text-left flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-3 text-lg text-red-500">delete</span>
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
    const { showToast } = useToast();

    const [products, setProducts] = useState<Product[] | null>(null);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
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

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(filter.toLowerCase()) || product.sku.toLowerCase().includes(filter.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.isActive : !product.isActive);
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, filter, categoryFilter, statusFilter]);
    
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

    const columns = [
        {
             header: 'Nombre',
             accessor: (p: Product) => (
                 <div className="flex items-center gap-3">
                     {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                         <span className="material-symbols-outlined text-xl">inventory_2</span>
                     </div>
                     <div>
                         <Link to={`/products/${p.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                             {p.name}
                         </Link>
                         <p className="text-xs text-slate-500 font-mono mt-0.5">{p.sku}</p>
                     </div>
                 </div>
             )
        },
        { header: 'Categoría', accessor: (p: Product) => categoriesMap.get(p.categoryId) || 'N/A' },
        { header: 'Unidad', accessor: (p: Product) => <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md text-xs font-medium">{p.unitDefault}</span> },
        { 
            header: 'Precio Mín.', 
            accessor: (p: Product) => <span className="font-semibold text-slate-700 dark:text-slate-300">${p.pricing.min.toFixed(2)}</span>,
            className: 'text-right' 
        },
        { 
            header: 'Estado', 
            accessor: (p: Product) => <Badge text={p.isActive ? 'Activo' : 'Inactivo'} color={p.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (p: Product) => <div className="flex justify-end"><ActionsMenu product={p} onDelete={handleDeleteProduct} onAddLot={handleOpenAddLot} /></div>,
            className: 'text-right'
        }
    ];
    
    const loading = productsLoading || categoriesLoading || suppliersLoading || locationsLoading;

    const categoryOptions = useMemo(() => [
        { value: 'all', label: 'Todas' },
        ...(categories || []).map(c => ({ value: c.id, label: c.name }))
    ], [categories]);

    const statusOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'active', label: 'Activos' },
        { value: 'inactive', label: 'Inactivos' },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (productsError) return <p className="text-center text-red-500 py-12">Error al cargar los productos.</p>;
        if (!filteredProducts || filteredProducts.length === 0) {
            return (
                <div className="p-6">
                    <EmptyState
                        icon="inventory_2"
                        title="No se encontraron productos"
                        message="Intenta ajustar los filtros o crea tu primer producto para gestionar tu catálogo."
                        actionText="Crear Producto"
                        onAction={() => navigate('/products/new')}
                    />
                </div>
            );
        }
        return <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><Table columns={columns} data={filteredProducts} /></div>;
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Catálogo de Productos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Administra tu inventario, precios y detalles de productos.</p>
                </div>
                 <Link 
                    to="/products/new"
                    className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Nuevo Producto
                </Link>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
                {/* Input Safe Pattern */}
                <div className="relative w-full lg:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        id="product-search"
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm transition-shadow focus:shadow-md outline-none"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <FilterButton 
                        label="Categoría" 
                        options={categoryOptions} 
                        selectedValue={categoryFilter} 
                        onSelect={setCategoryFilter} 
                    />
                     <FilterButton 
                        label="Estado" 
                        options={statusOptions} 
                        selectedValue={statusFilter} 
                        onSelect={setStatusFilter} 
                    />
                </div>
            </div>
                
            {renderContent()}
            
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