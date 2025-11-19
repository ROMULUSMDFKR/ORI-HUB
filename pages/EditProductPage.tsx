import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category, Unit, Supplier, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import { api } from '../data/mockData';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import AddLotDrawer from '../components/products/AddLotDrawer';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
);

const EditProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialProduct, loading: productLoading } = useDoc<Product>('products', id || '');
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');

    const [product, setProduct] = useState<Partial<Product> | null>(null);
    const [lots, setLots] = useState<ProductLot[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    useEffect(() => {
        if (initialProduct) {
            setProduct(initialProduct);
            const fetchLots = async () => {
                const fetchedLots = await api.getLotsForProduct(initialProduct.id);
                setLots(fetchedLots);
            };
            fetchLots();
        }
    }, [initialProduct]);

    const handleChange = useCallback((field: keyof Product, value: any) => {
        setProduct(prev => (prev ? { ...prev, [field]: value } : null));
    }, []);

    const handlePricingChange = useCallback((field: keyof Product['pricing'], value: any) => {
         setProduct(prev => (prev ? { ...prev, pricing: { ...prev.pricing, [field]: value } } : null));
    }, []);
    
    const handleSaveProduct = () => {
        console.log("Saving product...", product);
        alert("Producto guardado (revisa la consola).");
        navigate(`/products/${id}`);
    };

    const handleAddLot = async (newLotData: any) => {
        if (!product || !product.id) return;
        const newLot: Omit<ProductLot, 'id'> = {
            productId: product.id,
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
            setLots(prev => [...prev, addedLot]);
            setIsDrawerOpen(false);
            alert(`Lote ${addedLot.code} añadido exitosamente.`);
        } catch (error) {
            console.error("Error adding lot:", error);
            alert("Error al añadir el lote.");
        }
    }

    const loading = productLoading || categoriesLoading || suppliersLoading || locationsLoading;

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!product) {
        return <div className="text-center p-12">Producto no encontrado</div>;
    }

    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editar Producto: {product.name}</h2>
                 <div className="flex space-x-2">
                    <button onClick={() => navigate(`/products/${id}`)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSaveProduct} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                     <FormBlock title="Información General">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU</label>
                                <input type="text" value={product.sku || ''} onChange={(e) => handleChange('sku', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
                                <input type="text" value={product.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect label="Categoría" options={categoryOptions} value={product.categoryId || ''} onChange={val => handleChange('categoryId', val)} />
                            <CustomSelect label="Unidad Default" options={unitOptions} value={product.unitDefault || 'ton'} onChange={val => handleChange('unitDefault', val as Unit)} />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Producto Activo</span>
                            <button type="button" onClick={() => handleChange('isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>
                    </FormBlock>
                    <FormBlock title="Precios e Inventario">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Precio Mínimo de Venta</label>
                                <input type="number" value={product.pricing?.min || 0} onChange={(e) => handlePricingChange('min', parseFloat(e.target.value) || 0)} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Punto de Reorden</label>
                                <input type="number" value={product.reorderPoint || 0} onChange={(e) => handleChange('reorderPoint', parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                    </FormBlock>
                </div>
                 <div className="space-y-6">
                    <FormBlock title="Gestión de Lotes">
                        <button onClick={() => setIsDrawerOpen(true)} className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90">
                            <span className="material-symbols-outlined mr-2">add</span>
                            Añadir Nuevo Lote
                        </button>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">Lotes Existentes ({lots.length})</h4>
                            {lots.length > 0 ? lots.map(lot => (
                                <div key={lot.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                                    <p className="font-bold font-mono text-slate-800 dark:text-slate-200">{lot.code}</p>
                                    <p className="text-slate-600 dark:text-slate-300">Cantidad Inicial: {lot.initialQty.toLocaleString()} {product.unitDefault}</p>
                                    <p className="text-slate-600 dark:text-slate-300">Estado: {lot.status}</p>
                                </div>
                            )) : <p className="text-sm text-slate-500 dark:text-slate-400">No hay lotes para este producto.</p>}
                        </div>
                    </FormBlock>
                 </div>
            </div>

            <AddLotDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleAddLot}
                suppliers={suppliers || []}
                locations={locations || []}
                productSku={product.sku}
            />
        </div>
    );
};

export default EditProductPage;