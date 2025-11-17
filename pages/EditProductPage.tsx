import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Product, ProductLot, Category, Unit, Supplier, LotStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import Drawer from '../components/ui/Drawer';
// FIX: Changed import path to a dedicated api module.
import { api } from '../data/mockData';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';

const initialLotState = {
    code: '',
    supplierId: '',
    receptionDate: new Date().toISOString().split('T')[0],
    initialQty: 0,
    unitCost: 0,
    minSellPrice: 0,
    initialLocationId: ''
};

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
);

const AddLotDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (newLot: any) => void;
    suppliers: Supplier[];
    locations: any[];
    productSku?: string;
}> = ({ isOpen, onClose, onSave, suppliers, locations, productSku }) => {
    const [lot, setLot] = useState(initialLotState);

    useEffect(() => {
        if (isOpen && productSku) {
            // Generate suggested lot code
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const suggestedCode = `${productSku}-${year}${month}${day}`;
            setLot(prev => ({ ...prev, code: suggestedCode }));
        } else if (!isOpen) {
            setLot(initialLotState); // Reset form on close
        }
    }, [isOpen, productSku]);

    const handleChange = (field: string, value: any) => {
        setLot(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSave = () => {
        // Simple validation
        if (lot.code && lot.initialQty > 0 && lot.unitCost > 0 && lot.minSellPrice > 0 && lot.initialLocationId) {
             onSave(lot);
        } else {
            alert("Por favor, complete todos los campos requeridos del lote.");
        }
    }
    
    const supplierOptions = (suppliers || []).map(s => ({ value: s.id, name: s.name }));
    const locationOptions = (locations || []).map(l => ({ value: l.id, name: l.name }));

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Añadir Nuevo Lote">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Código de Lote</label>
                    <input type="text" value={lot.code} onChange={e => handleChange('code', e.target.value)} />
                </div>
                <CustomSelect label="Proveedor" options={supplierOptions} value={lot.supplierId} onChange={val => handleChange('supplierId', val)} />
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Recepción</label>
                    <input type="date" value={lot.receptionDate} onChange={e => handleChange('receptionDate', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cantidad Recibida</label>
                        <input type="number" value={lot.initialQty} onChange={e => handleChange('initialQty', parseFloat(e.target.value) || 0)} />
                    </div>
                     <CustomSelect label="Ubicación Inicial" options={locationOptions} value={lot.initialLocationId} onChange={val => handleChange('initialLocationId', val)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Costo Unitario</label>
                        <input type="number" value={lot.unitCost} onChange={e => handleChange('unitCost', parseFloat(e.target.value) || 0)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Precio Venta Mín.</label>
                        <input type="number" value={lot.minSellPrice} onChange={e => handleChange('minSellPrice', parseFloat(e.target.value) || 0)} />
                    </div>
                </div>
            </div>
             <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Lote</button>
            </div>
        </Drawer>
    );
}


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

    const handleChange = (field: keyof Product, value: any) => {
        setProduct(prev => (prev ? { ...prev, [field]: value } : null));
    };

    const handlePricingChange = (field: keyof Product['pricing'], value: any) => {
         setProduct(prev => (prev ? { ...prev, pricing: { ...prev.pricing, [field]: value } } : null));
    }
    
    const handleSaveProduct = () => {
        console.log("Saving product...", product);
        alert("Producto guardado (revisa la consola).");
        navigate(`/products/${id}`);
    };

    const handleAddLot = (newLotData: any) => {
        const newLot: ProductLot = {
            id: `lot-${Date.now()}`,
            code: newLotData.code,
            unitCost: newLotData.unitCost,
            supplierId: newLotData.supplierId,
            receptionDate: new Date(newLotData.receptionDate).toISOString(),
            initialQty: newLotData.initialQty,
            status: LotStatus.Disponible,
            pricing: { min: newLotData.minSellPrice },
            stock: [{ locationId: newLotData.initialLocationId, qty: newLotData.initialQty }]
        };
        setLots(prev => [...prev, newLot]);
        setIsDrawerOpen(false);
        alert(`Lote ${newLot.code} añadido localmente.`);
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