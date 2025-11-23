
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Category, Product, ProductLot } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { api } from '../api/firebaseApi';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

// --- KPI Card for Categories ---
const CategoryKpiCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
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

const ConfirmationDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-slate-100" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        Eliminar
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProductCategoriesPage: React.FC = () => {
    const { data: initialCategories, loading: categoriesLoading, error: categoriesError } = useCollection<Category>('categories');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    // Need lots to calculate value per category
    const { data: lots, loading: lotsLoading } = useCollection<ProductLot>('lots');
    const navigate = useNavigate();
    
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [hasAttemptedSeed, setHasAttemptedSeed] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    useEffect(() => {
        if (initialCategories) {
            setCategories(initialCategories);
        }
    }, [initialCategories]);

    // --- AUTO-SEED DATA LOGIC ---
    useEffect(() => {
        const seedData = async () => {
            if (!categoriesLoading && categories && categories.length === 0 && !hasAttemptedSeed) {
                setHasAttemptedSeed(true);
                console.log("No categories found, seeding initial data...");
                const SEED_DATA = [
                    { id: 'cat-root-campo', name: 'Campo', code: 'CAMP', parentId: '', description: 'Insumos agrícolas y fertilizantes', isActive: true },
                    { id: 'cat-root-ind', name: 'Industria', code: 'IND', parentId: '', description: 'Insumos para procesos industriales', isActive: true },
                    { id: 'cat-root-auto', name: 'Automotriz', code: 'AUTO', parentId: '', description: 'Soluciones automotrices', isActive: true },
                    { id: 'cat-fosf', name: 'Fosfatados', code: 'FOSF', parentId: 'cat-root-campo', description: 'Fertilizantes a base de fósforo', isActive: true },
                    { id: 'cat-liq', name: 'Líquidos', code: 'LIQD', parentId: 'cat-root-campo', description: 'Fertilizantes en solución líquida', isActive: true },
                    { id: 'cat-quim', name: 'Químicos básicos', code: 'QBAS', parentId: 'cat-root-ind', description: 'Químicos base y materia prima', isActive: true },
                ];

                try {
                    for (const cat of SEED_DATA) {
                        await api.setDoc('categories', cat.id, cat);
                    }
                    setCategories(SEED_DATA);
                } catch (error) {
                    console.error("Error seeding categories:", error);
                }
            }
        };
        seedData();
    }, [categories, categoriesLoading, hasAttemptedSeed]);

    // --- CALCULATE STATS PER CATEGORY ---
    const enrichedCategories = useMemo(() => {
        if (!categories) return [];
        const totalProducts = products?.length || 0;

        return categories.map(cat => {
            const catProducts = products?.filter(p => p.categoryId === cat.id) || [];
            const count = catProducts.length;
            
            // Calculate value
            let value = 0;
            if (lots) {
                catProducts.forEach(p => {
                    const pLots = lots.filter(l => l.productId === p.id);
                    pLots.forEach(l => {
                        const qty = l.stock.reduce((sum, s) => sum + s.qty, 0);
                        value += qty * l.unitCost;
                    });
                });
            }
            
            const share = totalProducts > 0 ? (count / totalProducts) * 100 : 0;

            return {
                ...cat,
                count,
                value,
                share
            };
        });
    }, [categories, products, lots]);

    const stats = useMemo(() => {
        if(!enrichedCategories.length) return { total: 0, topCategory: '-', active: 0 };
        const sorted = [...enrichedCategories].sort((a,b) => b.count - a.count);
        return {
            total: enrichedCategories.length,
            topCategory: sorted[0]?.name || '-',
            active: enrichedCategories.filter(c => c.isActive).length
        };
    }, [enrichedCategories]);

    const categoriesMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    
    const handleDeleteCategory = (category: Category) => {
        const count = products?.filter(p => p.categoryId === category.id).length || 0;
        if (count > 0) {
            alert(`No puedes eliminar la categoría "${category.name}" porque tiene ${count} productos asociados.`);
            return;
        }
        setCategoryToDelete(category);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await api.deleteDoc('categories', categoryToDelete.id);
            setCategories(prev => prev!.filter(c => c.id !== categoryToDelete.id));
        } catch (error) {
            console.error("Error deleting category:", error);
            alert('No se pudo eliminar la categoría.');
        } finally {
            setIsDeleteDialogOpen(false);
            setCategoryToDelete(null);
        }
    };

    const columns = [
        {
            header: 'Nombre',
            accessor: (c: any) => (
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.parentId ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                        {c.parentId ? 'S' : 'R'}
                    </div>
                    <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{c.name}</p>
                        {c.description && <p className="text-xs text-slate-500 truncate max-w-[200px]" title={c.description}>{c.description}</p>}
                    </div>
                </div>
            )
        },
        {
            header: 'Código',
            accessor: (c: Category) => <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{c.code || '-'}</span>
        },
        {
            header: 'Jerarquía',
            accessor: (c: Category) => c.parentId ? (
                <div className="flex items-center text-xs text-slate-500">
                    <span className="material-symbols-outlined !text-sm mr-1 text-slate-300">subdirectory_arrow_right</span>
                    {categoriesMap.get(c.parentId)}
                </div>
            ) : <span className="text-xs font-semibold text-slate-400 uppercase">Categoría Raíz</span>
        },
        {
            header: 'Productos',
            accessor: (c: any) => (
                <div className="w-24">
                    <div className="flex justify-between text-xs mb-1">
                         <span className="font-semibold">{c.count}</span>
                         <span className="text-slate-400">{c.share.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.max(c.share, 5)}%` }}></div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Valor Inventario',
            accessor: (c: any) => <span className="text-sm font-medium text-slate-700 dark:text-slate-300">${c.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>,
            className: 'text-right'
        },
        {
            header: 'Estado',
            accessor: (c: Category) => c.isActive ? <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100 dark:border-green-800">ACTIVO</span> : <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold">INACTIVO</span>,
            className: 'text-center'
        },
        {
            header: 'Acciones',
            accessor: (c: Category) => (
                <div className="flex space-x-2 justify-center">
                    <button onClick={() => navigate(`/products/categories/${c.id}/edit`)} className="text-gray-400 hover:text-indigo-600 p-1"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <button onClick={() => handleDeleteCategory(c)} className="text-gray-400 hover:text-red-600 p-1"><span className="material-symbols-outlined text-lg">delete</span></button>
                </div>
            ),
            className: 'text-center'
        },
    ];
    
    const loading = categoriesLoading || productsLoading || lotsLoading;

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (categoriesError) return <p className="text-center text-red-500 py-12">Error al cargar las categorías.</p>;
        if (!categories || categories.length === 0) {
            return (
                <div className="flex flex-col items-center">
                    <EmptyState
                        icon="category"
                        title="No hay categorías definidas"
                        message="Crea categorías para organizar tus productos de manera eficiente."
                        actionText="Crear Categoría"
                        onAction={() => navigate('/products/categories/new')}
                    />
                </div>
            );
        }
        return <Table columns={columns} data={enrichedCategories} />;
    };

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CategoryKpiCard title="Total Categorías" value={stats.total} icon="category" color="bg-blue-500" />
                <CategoryKpiCard title="Categoría Top" value={stats.topCategory} icon="star" color="bg-amber-500" />
                <CategoryKpiCard title="Categorías Activas" value={stats.active} icon="check_circle" color="bg-emerald-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                     <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Listado de Categorías</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Organiza tu catálogo con jerarquías.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/products/categories/new')}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm">
                        <span className="material-symbols-outlined mr-2 text-base">add</span>
                        Nueva Categoría
                    </button>
                </div>
                {renderContent()}
            </div>
            
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Categoría"
                message={`¿Estás seguro de que quieres eliminar la categoría "${categoryToDelete?.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default ProductCategoriesPage;
