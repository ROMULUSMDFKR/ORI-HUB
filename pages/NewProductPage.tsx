import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Unit, LotStatus, Supplier, Currency } from '../types';
import { useCollection } from '../hooks/useCollection';
import { UNITS } from '../constants';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';

const initialProductState: Omit<Product, 'id'> = {
    sku: '',
    name: '',
    unitDefault: 'ton',
    currency: 'USD',
    isActive: true,
    categoryId: '',
    pricing: {
        min: 0,
    },
};

const initialLotState = {
    code: '',
    supplierId: '',
    receptionDate: new Date().toISOString().split('T')[0],
    initialQty: 0,
    unitCost: 0,
    minSellPrice: 0,
    initialLocationId: ''
};

const NewProductPage: React.FC = () => {
    const navigate = useNavigate();
    const [product, setProduct] = useState(initialProductState);
    const [lot, setLot] = useState(initialLotState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const { data: categories, loading: categoriesLoading } = useCollection<Category>('categories');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');
    
    const categoryOptions = (categories || []).map(c => ({ value: c.id, name: c.name }));
    const unitOptions = UNITS.map(u => ({ value: u, name: u }));
    const supplierOptions = (suppliers || []).map(s => ({ value: s.id, name: s.name }));
    const locationOptions = (locations || []).map(l => ({ value: l.id, name: l.name }));


    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        // Product validation
        if (!product.name.trim()) newErrors.name = 'El nombre es requerido.';
        if (!product.sku.trim()) newErrors.sku = 'El SKU es requerido.';
        if (!product.categoryId) newErrors.categoryId = 'La categoría es requerida.';
        
        // Lot validation
        if (!lot.code.trim()) newErrors.lotCode = 'El código del lote es requerido.';
        if (lot.initialQty <= 0) newErrors.lotQty = 'La cantidad inicial debe ser mayor a cero.';
        if (lot.unitCost <= 0) newErrors.lotCost = 'El costo unitario debe ser mayor a cero.';
        if (lot.minSellPrice <= 0) newErrors.lotPrice = 'El precio de venta debe ser mayor a cero.';
        if (lot.minSellPrice < lot.unitCost) newErrors.lotPrice = 'El precio de venta no puede ser menor al costo.';
        if (!lot.initialLocationId) newErrors.lotLocation = 'La ubicación es requerida.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (entity: 'product' | 'lot', field: string, value: any) => {
        if (entity === 'product') {
            const updatedProduct = { ...product, [field]: value };
            setProduct(updatedProduct);

            if (field === 'sku') {
                const skuValue = value.trim();
                if (skuValue) {
                    const date = new Date();
                    const year = date.getFullYear().toString().slice(-2);
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const suggestedCode = `${skuValue}-${year}${month}${day}`;
                    setLot(prevLot => ({ ...prevLot, code: suggestedCode }));
                } else {
                    setLot(prevLot => ({ ...prevLot, code: '' }));
                }
            }
        } else {
            setLot(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newProductData: Omit<Product, 'id'> = {
                ...product,
                createdAt: new Date().toISOString()
            };

            try {
                // 1. Save Product
                const addedProduct = await api.addDoc('products', newProductData);
                
                // 2. Save Initial Lot
                const newLotData = {
                    id: `lot-${Date.now()}`, // Optionally let Firestore auto-id if not critical
                    productId: addedProduct.id, // Link to the new product
                    code: lot.code,
                    unitCost: lot.unitCost,
                    supplierId: lot.supplierId,
                    receptionDate: new Date(lot.receptionDate).toISOString(),
                    initialQty: lot.initialQty,
                    status: LotStatus.Disponible,
                    pricing: { min: lot.minSellPrice },
                    stock: [{ locationId: lot.initialLocationId, qty: lot.initialQty }]
                };

                await api.addDoc('lots', newLotData);

                alert("Producto y lote inicial guardados exitosamente.");
                navigate('/products/list');
            } catch (error) {
                console.error("Error saving product:", error);
                alert("Hubo un error al guardar el producto.");
            }
        }
    };

    const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
          <div className="space-y-4">
            {children}
          </div>
        </div>
      );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Crear Nuevo Producto</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/products/list')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                        Guardar Producto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <FormBlock title="Información General del Producto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
                            <input type="text" value={product.name} onChange={(e) => handleChange('product', 'name', e.target.value)} className="mt-1 block w-full" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU</label>
                            <input type="text" value={product.sku} onChange={(e) => handleChange('product', 'sku', e.target.value)} className="mt-1 block w-full" />
                            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                        </div>

                        <div>
                            <CustomSelect label="Categoría" options={categoryOptions} value={product.categoryId} onChange={val => handleChange('product', 'categoryId', val)} placeholder={categoriesLoading ? 'Cargando...' : 'Seleccionar...'} />
                            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                        </div>

                        <CustomSelect label="Unidad Default" options={unitOptions} value={product.unitDefault} onChange={val => handleChange('product', 'unitDefault', val as Unit)} />

                        <CustomSelect 
                            label="Moneda" 
                            options={[{value: 'USD', name: 'Dólares (USD)'}, {value: 'MXN', name: 'Pesos (MXN)'}]} 
                            value={product.currency} 
                            onChange={val => handleChange('product', 'currency', val as Currency)} 
                        />

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Producto Activo</span>
                            <button type="button" onClick={() => handleChange('product', 'isActive', !product.isActive)} className={`${product.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>
                    </FormBlock>
                </div>
                <div className="space-y-6">
                    <FormBlock title="Lote Inicial y Stock">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Código de Lote</label>
                                <input type="text" value={lot.code} onChange={e => handleChange('lot', 'code', e.target.value)} className="mt-1 block w-full"/>
                                {errors.lotCode && <p className="text-red-500 text-xs mt-1">{errors.lotCode}</p>}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Recepción</label>
                                <input type="date" value={lot.receptionDate} onChange={e => handleChange('lot', 'receptionDate', e.target.value)} className="mt-1 block w-full"/>
                            </div>
                        </div>
                         <div>
                            <CustomSelect label="Proveedor" options={supplierOptions} value={lot.supplierId} onChange={val => handleChange('lot', 'supplierId', val)} placeholder={suppliersLoading ? 'Cargando...' : 'Seleccionar...'} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cantidad Recibida</label>
                                <input type="number" value={lot.initialQty} onChange={e => handleChange('lot', 'initialQty', parseFloat(e.target.value) || 0)} className="mt-1 block w-full"/>
                                {errors.lotQty && <p className="text-red-500 text-xs mt-1">{errors.lotQty}</p>}
                            </div>
                             <div>
                                <CustomSelect label="Ubicación de Recepción" options={locationOptions} value={lot.initialLocationId} onChange={val => handleChange('lot', 'initialLocationId', val)} placeholder={locationsLoading ? 'Cargando...' : 'Seleccionar...'} />
                                {errors.lotLocation && <p className="text-red-500 text-xs mt-1">{errors.lotLocation}</p>}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">Costos y Precios del Lote</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Define la rentabilidad de este lote específico.</p>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Costo Unitario (Compra)</label>
                                    <input type="number" value={lot.unitCost} onChange={e => handleChange('lot', 'unitCost', parseFloat(e.target.value) || 0)} className="mt-1 block w-full"/>
                                    {errors.lotCost && <p className="text-red-500 text-xs mt-1">{errors.lotCost}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Precio Mín. (Venta)</label>
                                    <input type="number" value={lot.minSellPrice} onChange={e => handleChange('lot', 'minSellPrice', parseFloat(e.target.value) || 0)} className="mt-1 block w-full"/>
                                    {errors.lotPrice && <p className="text-red-500 text-xs mt-1">{errors.lotPrice}</p>}
                                </div>
                            </div>
                             <div className="mt-3 text-center bg-blue-50 dark:bg-blue-500/10 p-2 rounded-md">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Margen Mínimo por Unidad: <span className="font-bold">${(lot.minSellPrice - lot.unitCost > 0 ? lot.minSellPrice - lot.unitCost : 0).toFixed(2)}</span></p>
                            </div>
                        </div>
                    </FormBlock>
                </div>
            </form>
        </div>
    );
};

export default NewProductPage;