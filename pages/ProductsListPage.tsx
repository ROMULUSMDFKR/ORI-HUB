
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
    const { showToast } = useToast();

    const [products, setProducts] = useState<Product[] | null>(null);
    const [filter, setFilter] = useState('');
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
        return products.filter(product =>
            product.name.toLowerCase().includes(filter.toLowerCase()) ||
            product.sku.toLowerCase().includes(filter.toLowerCase())
        );
    }, [products, filter]);
    
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
            // Safe check for lot.stock using optional chaining
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
        { header: 'SKU', accessor: (p: Product) => <span className="font-mono text-xs">{p.sku}</span> },
        {
            header: 'Nombre',
            accessor: (p: Product) => (
                <Link to={`/products/${p.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {p.name}
                </Link>
            )
        },
        { header: 'Categoría', accessor: (p: Product) => categoriesMap.get(p.categoryId) || 'N/A' },
        { header: 'Unidad', accessor: (p: Product) => p.unitDefault },
        { 
            header: 'Precio Mín.', 
            accessor: (p: Product) => `$${p.pricing.min.toFixed(2)}`,
            className: 'text-right' 
        },
        { 
            header: 'Estado', 
            accessor: (p: Product) => (
                p.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />
            )
        },
        {
            header: 'Acciones',
            accessor: (p: Product) => <div className="flex justify-center"><ActionsMenu product={p} onDelete={handleDeleteProduct} onAddLot={handleOpenAddLot} /></div>,
            className: 'text-center'
        }
    ];
    
    const loading = productsLoading || categoriesLoading || suppliersLoading || locationsLoading;

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (productsError) return <p className="text-center text-red-500 py-12">Error al cargar los productos.</p>;
        if (!filteredProducts || filteredProducts.length === 0) {
            return (
                <div className="p-6">
                    <EmptyState
                        icon="inventory_2"
                        title="No se encontraron productos"
                        message="Comienza creando tu primer producto para gestionar tu catálogo."
                        actionText="Crear Producto"
                        onAction={() => navigate('/products/new')}
                    />
                </div>
            );
        }
        return <Table columns={columns} data={filteredProducts} />;
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center w-80 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500">
                        <span className="material-symbols-outlined px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
                            search
                        </span>
                        <input
                            id="product-search"
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-transparent pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none search-input-field"
                        />
                    </div>
                    <Link 
                    to="/products/new"
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">add</span>
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
        </>
    );
};

export default ProductsListPage;
