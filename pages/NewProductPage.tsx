
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Unit, LotStatus, Supplier } from '../types';
import { useCollection } from '../hooks/useCollection';
import { UNITS } from '../../constants';

const initialProductState: Omit<Product, 'id'> = {
    sku: '',
    name: '',
    unitDefault: 'ton',
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

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        // Product validation
        if (!product.name.trim()) newErrors.name = 'El nombre es requerido.';
        if (!product.sku.trim()) newErrors.sku = 'El SKU es requerido.';
        if (!product.categoryId) newErrors.categoryId = 'La categoría es requerida.';
        if (product.pricing.min <= 0) newErrors.productPrice = 'El precio default debe ser mayor a cero.';
        
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
            if (field === 'pricing.min') {
                setProduct(prev => ({ ...prev, pricing: { min: value }}));
            } else {
                setProduct(prev => ({ ...prev, [field]: value }));
            }
        } else {
            setLot(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newProduct: Product = {
                id: `prod-${Date.now()}`,
                ...product
            };
            const newLot = {
                id: `lot-${Date.now()}`,
                code: lot.code,
                unitCost: lot.unitCost,
                supplierId: lot.supplierId,
                receptionDate: new Date(lot.receptionDate).toISOString(),
                initialQty: lot.initialQty,
                status: LotStatus.Disponible,
                pricing: { min: lot.minSellPrice },
                stock: [{ locationId: lot.initialLocationId, qty: lot.initialQty }]
            };

            console.log("Nuevo Producto Guardado:", newProduct);
            console.log("Lote Inicial:", newLot);
            // In a real app, you would call the API to save both records.
            alert("Producto y lote inicial guardados (revisa la consola).");
            navigate('/products/list');
        }
    };

    const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold border-b pb-3 mb-4">{title}</h3>
          <div className="space-y-4">
            {children}
          </div>
        </div>
      );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">Crear Nuevo Producto</h2>
                <div className="flex space-x-2">
                    <button onClick={() => navigate('/products/list')} className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark">
                        Guardar Producto
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <FormBlock title="Información General del Producto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                            <input type="text" value={product.name} onChange={(e) => handleChange('product', 'name', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">SKU</label>
                            <input type="text" value={product.sku} onChange={(e) => handleChange('product', 'sku', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" />
                            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Categoría</label>
                            <select value={product.categoryId} onChange={(e) => handleChange('product', 'categoryId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" disabled={categoriesLoading}>
                                <option value="">{categoriesLoading ? 'Cargando...' : 'Seleccionar...'}</option>
                                {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unidad Default</label>
                                <select value={product.unitDefault} onChange={(e) => handleChange('product', 'unitDefault', e.target.value as Unit)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary">
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Precio Mín. (Default)</label>
                                <input type="number" value={product.pricing.min} onChange={(e) => handleChange('product', 'pricing.min', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" />
                                {errors.productPrice && <p className="text-red-500 text-xs mt-1">{errors.productPrice}</p>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-sm font-medium text-gray-700">Producto Activo</span>
                            <button type="button" onClick={() => handleChange('product', 'isActive', !product.isActive)} className={`${product.isActive ? 'bg-primary' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                <span className={`${product.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                            </button>
                        </div>
                    </FormBlock>
                </div>
                <div className="space-y-6">
                    <FormBlock title="Lote Inicial y Stock">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código de Lote</label>
                                <input type="text" value={lot.code} onChange={e => handleChange('lot', 'code', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                {errors.lotCode && <p className="text-red-500 text-xs mt-1">{errors.lotCode}</p>}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha de Recepción</label>
                                <input type="date" value={lot.receptionDate} onChange={e => handleChange('lot', 'receptionDate', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                            <select value={lot.supplierId} onChange={e => handleChange('lot', 'supplierId', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3" disabled={suppliersLoading}>
                               <option value="">{suppliersLoading ? 'Cargando...' : 'Seleccionar...'}</option>
                               {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cantidad Recibida</label>
                                <input type="number" value={lot.initialQty} onChange={e => handleChange('lot', 'initialQty', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                {errors.lotQty && <p className="text-red-500 text-xs mt-1">{errors.lotQty}</p>}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Ubicación de Recepción</label>
                                <select value={lot.initialLocationId} onChange={e => handleChange('lot', 'initialLocationId', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3" disabled={locationsLoading}>
                                    <option value="">{locationsLoading ? 'Cargando...' : 'Seleccionar...'}</option>
                                    {locations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                {errors.lotLocation && <p className="text-red-500 text-xs mt-1">{errors.lotLocation}</p>}
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <h4 className="text-md font-semibold text-gray-800">Costos y Precios del Lote</h4>
                            <p className="text-xs text-gray-500 mb-2">Define la rentabilidad de este lote específico.</p>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Costo Unitario (Compra)</label>
                                    <input type="number" value={lot.unitCost} onChange={e => handleChange('lot', 'unitCost', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                    {errors.lotCost && <p className="text-red-500 text-xs mt-1">{errors.lotCost}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Mín. (Venta)</label>
                                    <input type="number" value={lot.minSellPrice} onChange={e => handleChange('lot', 'minSellPrice', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                    {errors.lotPrice && <p className="text-red-500 text-xs mt-1">{errors.lotPrice}</p>}
                                </div>
                            </div>
                             <div className="mt-3 text-center bg-blue-50 p-2 rounded-md">
                                <p className="text-sm font-medium text-blue-800">Margen Mínimo por Unidad: <span className="font-bold">${(lot.minSellPrice - lot.unitCost > 0 ? lot.minSellPrice - lot.unitCost : 0).toFixed(2)}</span></p>
                            </div>
                        </div>
                    </FormBlock>
                </div>
            </form>
        </div>
    );
};

export default NewProductPage;