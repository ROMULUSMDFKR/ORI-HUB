
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Supplier, Product, User, Unit, PurchaseOrder, PurchaseOrderItem } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import CustomSelect from '../../components/ui/CustomSelect';
import { TAX_RATE, UNITS } from '../../constants';
import Drawer from '../../components/ui/Drawer';

// Moved outside
const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const FormRow: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-start ${className}`}>
        {children}
    </div>
);

interface POItemForm extends PurchaseOrderItem {
    id: number; // Internal ID for React keys
    isCustom?: boolean;
}

const NewPurchaseOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const [supplierId, setSupplierId] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItemForm[]>([]);
    
    const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');
    const { data: initialProducts, loading: pLoading } = useCollection<Product>('products');
    const [products, setProducts] = useState<Product[] | null>(null);
    const { data: users, loading: uLoading } = useCollection<User>('users');

    // Drawer state
    const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', sku: '', unitDefault: 'kg' as Unit });
    const [creatingProductForRow, setCreatingProductForRow] = useState<number | null>(null);

    useEffect(() => {
        if (initialProducts) {
            setProducts(initialProducts);
        }
    }, [initialProducts]);

    const loading = sLoading || !products || uLoading;
    
    const supplierOptions = useMemo(() => (suppliers || []).map(s => ({ value: s.id, name: s.name })), [suppliers]);
    const productOptions = useMemo(() => [
        { value: 'CUSTOM_ITEM', name: 'Otro (Insumo/Gasto...)' },
        { value: 'CREATE_NEW', name: 'Crear Nuevo Producto (Catálogo)...' },
        ...(products || []).map(p => ({ value: p.id, name: `${p.name} (${p.sku})` }))
    ], [products]);
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);
    const unitOptions = useMemo(() => UNITS.map(u => ({ value: u, name: u })), []);

    const { subtotal, tax, total } = useMemo(() => {
        const sub = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const taxAmount = sub * TAX_RATE;
        const totalAmount = sub + taxAmount;
        return { subtotal: sub, tax: taxAmount, total: totalAmount };
    }, [items]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), productId: '', qty: 1, unit: 'kg', unitCost: 0, subtotal: 0, isCustom: false }]);
    };
    
    const handleRemoveItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = useCallback((id: number, field: keyof POItemForm, value: any) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'qty' || field === 'unitCost') {
                    updatedItem.subtotal = (Number(updatedItem.qty) || 0) * (Number(updatedItem.unitCost) || 0);
                }
                if (field === 'productId' && !updatedItem.isCustom) {
                    const product = products?.find(p => p.id === value);
                    updatedItem.unit = product?.unitDefault || 'kg';
                    updatedItem.productName = product?.name;
                }
                return updatedItem;
            }
            return item;
        }));
    }, [products]);

    const handleProductSelectionChange = (itemId: number, value: string) => {
        if (value === 'CREATE_NEW') {
            setCreatingProductForRow(items.findIndex(item => item.id === itemId));
            setIsProductDrawerOpen(true);
        } else if (value === 'CUSTOM_ITEM') {
            setItems(prev => prev.map(item => 
                item.id === itemId ? { ...item, isCustom: true, productId: '', productName: '' } : item
            ));
        } else {
            handleItemChange(itemId, 'productId', value);
            // Reset custom state if selecting a real product
            setItems(prev => prev.map(item => 
                item.id === itemId ? { ...item, isCustom: false } : item
            ));
        }
    };

    const handleSaveNewProduct = async () => {
        if (!newProduct.name || !newProduct.sku) {
            alert('Nombre y SKU son requeridos.');
            return;
        }

        const newProductData: Omit<Product, 'id'> = {
            name: newProduct.name,
            sku: newProduct.sku,
            unitDefault: newProduct.unitDefault,
            isActive: true,
            categoryId: 'cat-root-ind', // Default category for quick add
            pricing: { min: 0 },
            currency: 'USD',
        };
        
        try {
            const addedProduct = await api.addDoc('products', newProductData);
            setProducts(prev => (prev ? [...prev, addedProduct] : [addedProduct]));

            if (creatingProductForRow !== null) {
                const itemToUpdate = items[creatingProductForRow];
                handleItemChange(itemToUpdate.id, 'productId', addedProduct.id);
            }

            setIsProductDrawerOpen(false);
            setNewProduct({ name: '', sku: '', unitDefault: 'kg' as Unit });
            setCreatingProductForRow(null);
        } catch (error) {
            console.error("Error creating product:", error);
            alert('Error al crear el producto.');
        }
    };

    const handleSubmit = async () => {
        if (!supplierId || items.length === 0) {
            alert('Por favor, selecciona un proveedor y añade al menos un producto.');
            return;
        }

        // Validate items
        for (const item of items) {
            if (item.isCustom && !item.productName) {
                alert('Por favor, escribe el nombre para los productos "Otros".');
                return;
            }
            if (!item.isCustom && !item.productId) {
                alert('Por favor, selecciona un producto para todas las filas.');
                return;
            }
        }

        const newPO: Omit<PurchaseOrder, 'id'> = {
            supplierId,
            responsibleId,
            expectedDeliveryDate,
            notes,
            items: items.map(({ id, isCustom, ...rest }) => rest),
            status: 'Borrador',
            createdAt: new Date().toISOString(),
            subtotal,
            tax,
            total,
            paidAmount: 0,
        };

        try {
            await api.addDoc('purchaseOrders', newPO);
            alert('Orden de Compra creada con éxito.');
            navigate('/purchase/orders');
        } catch (error) {
            console.error("Error creating purchase order:", error);
            alert('Error al crear la orden de compra.');
        }
    };
    
    // Input Safe Pattern classes
    const inputWrapperClass = "relative";
    const inputIconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
    const inputFieldClass = "block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400";


    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Compra</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/purchase/orders')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar OC</button>
                </div>
            </div>

            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <FormBlock title="Información General">
                            <FormRow>
                                <CustomSelect label="Proveedor *" options={supplierOptions} value={supplierId} onChange={setSupplierId} placeholder="Seleccionar..."/>
                                <CustomSelect label="Responsable" options={userOptions} value={responsibleId} onChange={setResponsibleId} placeholder="Seleccionar..."/>
                            </FormRow>
                            <FormRow>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Emisión</label>
                                     <div className={inputWrapperClass}>
                                        <div className={inputIconClass}>
                                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">calendar_today</span>
                                        </div>
                                        <input type="date" value={new Date().toISOString().split('T')[0]} readOnly disabled className={`${inputFieldClass} bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed`}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Entrega Esperada</label>
                                     <div className={inputWrapperClass}>
                                        <div className={inputIconClass}>
                                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">event</span>
                                        </div>
                                        <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className={inputFieldClass}/>
                                    </div>
                                </div>
                            </FormRow>
                        </FormBlock>

                        <FormBlock title="Productos">
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                                        <div className="col-span-5">
                                            {item.isCustom ? (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Insumo</label>
                                                    <div className="flex gap-1">
                                                        <input 
                                                            type="text" 
                                                            value={item.productName || ''} 
                                                            onChange={e => handleItemChange(item.id, 'productName', e.target.value)}
                                                            placeholder="Ej: Costales, Papelería..."
                                                            className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isCustom: false, productName: '' } : i))} className="p-2 text-slate-500 hover:text-slate-700" title="Volver a lista">
                                                            <span className="material-symbols-outlined !text-base">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <CustomSelect label="Producto" options={productOptions} value={item.productId || ''} onChange={val => handleProductSelectionChange(item.id, val)} placeholder="Seleccionar..."/>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cant.</label>
                                            <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-sm text-right bg-white dark:bg-slate-900" />
                                        </div>
                                        <div className="col-span-2">
                                            <CustomSelect label="Unidad" options={unitOptions} value={item.unit} onChange={val => handleItemChange(item.id, 'unit', val as Unit)} />
                                        </div>
                                        <div className="col-span-2">
                                             <label className="block text-xs font-medium text-slate-500 mb-1">Costo Unit.</label>
                                            <input type="number" step="0.01" value={item.unitCost} onChange={e => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)} className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-sm text-right bg-white dark:bg-slate-900" />
                                        </div>
                                        <div className="col-span-1 flex items-end justify-end">
                                             <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                        <div className="col-span-12 text-right text-sm pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                            <span className="text-slate-500 mr-2">Subtotal:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">${item.subtotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddItem} className="w-full mt-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all flex items-center justify-center gap-2 font-medium">
                                <span className="material-symbols-outlined">add_circle</span> Añadir Producto
                            </button>
                        </FormBlock>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <FormBlock title="Resumen">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal:</span><span className="font-semibold text-slate-900 dark:text-white">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>IVA ({(TAX_RATE * 100).toFixed(0)}%):</span><span className="font-semibold text-slate-900 dark:text-white">${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-4 mt-2 text-indigo-600 dark:text-indigo-400"><span>Total:</span><span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                        </FormBlock>
                        <FormBlock title="Notas">
                             <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                rows={4} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                placeholder="Instrucciones de entrega, términos de pago, etc."
                            />
                        </FormBlock>
                    </div>
                </div>
            )}

            <Drawer isOpen={isProductDrawerOpen} onClose={() => setIsProductDrawerOpen(false)} title="Crear Nuevo Producto">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Producto *</label>
                        <input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU *</label>
                        <input type="text" value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800" />
                    </div>
                    <CustomSelect label="Unidad *" options={unitOptions} value={newProduct.unitDefault} onChange={val => setNewProduct(p => ({ ...p, unitDefault: val as Unit }))} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsProductDrawerOpen(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleSaveNewProduct} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar Producto</button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default NewPurchaseOrderPage;
