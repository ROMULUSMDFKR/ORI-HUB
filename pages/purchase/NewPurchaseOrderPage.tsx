
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Supplier, Product, User, Unit, PurchaseOrder, PurchaseOrderItem, Currency } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import CustomSelect from '../../components/ui/CustomSelect';
import { TAX_RATE, UNITS, INCOTERM_OPTIONS, PAYMENT_TERM_OPTIONS } from '../../constants';
import Drawer from '../../components/ui/Drawer';

// --- Reusable Components ---
const FormBlock: React.FC<{ title: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const Input: React.FC<{ label: string; value: string | number; onChange: (val: any) => void; type?: string, placeholder?: string, icon?: string }> = ({ label, value, onChange, type = 'text', placeholder, icon }) => (
    <div>
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {icon && <span className="material-symbols-outlined text-sm mr-1 text-slate-400">{icon}</span>}
            {label}
        </label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
        />
    </div>
);

interface POItemForm extends PurchaseOrderItem {
    id: number;
    isCustom?: boolean;
}

const NewPurchaseOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const [supplierId, setSupplierId] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItemForm[]>([]);
    
    // New Fields
    const [incoterm, setIncoterm] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [priority, setPriority] = useState<'Baja' | 'Media' | 'Alta'>('Media');
    const [warehouseId, setWarehouseId] = useState('');
    
    const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');
    const { data: initialProducts, loading: pLoading } = useCollection<Product>('products');
    const [products, setProducts] = useState<Product[] | null>(null);
    const { data: users, loading: uLoading } = useCollection<User>('users');
    const { data: locations, loading: locLoading } = useCollection<any>('locations');

    // Drawer state
    const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', sku: '', unitDefault: 'kg' as Unit });
    const [creatingProductForRow, setCreatingProductForRow] = useState<number | null>(null);

    useEffect(() => {
        if (initialProducts) {
            setProducts(initialProducts);
        }
    }, [initialProducts]);

    const loading = sLoading || !products || uLoading || locLoading;
    
    const supplierOptions = useMemo(() => (suppliers || []).map(s => ({ value: s.id, name: s.name })), [suppliers]);
    const productOptions = useMemo(() => [
        { value: 'CUSTOM_ITEM', name: 'Otro (Insumo/Gasto...)' },
        { value: 'CREATE_NEW', name: 'Crear Nuevo Producto (Catálogo)...' },
        ...(products || []).map(p => ({ value: p.id, name: `${p.name} (${p.sku})` }))
    ], [products]);
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);
    const unitOptions = useMemo(() => UNITS.map(u => ({ value: u, name: u })), []);
    const locationOptions = useMemo(() => (locations || []).map((l: any) => ({ value: l.id, name: l.name })), [locations]);
    const priorityOptions = [{value: 'Baja', name: 'Baja'}, {value: 'Media', name: 'Media'}, {value: 'Alta', name: 'Alta'}];

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
            setItems(prev => prev.map(item => item.id === itemId ? { ...item, isCustom: false } : item));
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
            categoryId: 'cat-root-ind',
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
            // New fields
            incoterm,
            paymentTerms,
            warehouseDestinationId: warehouseId,
            priority
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
    
    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Compra</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/purchase/orders')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar OC
                    </button>
                </div>
            </div>

            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <FormBlock title="Información General" icon="fact_check">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomSelect label="Proveedor *" options={supplierOptions} value={supplierId} onChange={setSupplierId} placeholder="Seleccionar..." enableSearch/>
                                <CustomSelect label="Responsable" options={userOptions} value={responsibleId} onChange={setResponsibleId} placeholder="Seleccionar..."/>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Emisión</label>
                                    <input type="date" value={new Date().toISOString().split('T')[0]} readOnly disabled className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm" />
                                </div>
                                <Input label="Fecha de Entrega Estimada" type="date" value={expectedDeliveryDate} onChange={setExpectedDeliveryDate} />
                            </div>
                        </FormBlock>

                        <FormBlock title="Productos" icon="shopping_cart">
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="col-span-4">
                                            {item.isCustom ? (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                                                    <div className="flex gap-1">
                                                        <input type="text" value={item.productName || ''} onChange={e => handleItemChange(item.id, 'productName', e.target.value)} placeholder="Descripción..." className="w-full rounded border-slate-300 p-1 text-sm" autoFocus />
                                                        <button onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isCustom: false, productName: '' } : i))} className="text-slate-500"><span className="material-symbols-outlined !text-base">close</span></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <CustomSelect label="Producto" options={productOptions} value={item.productId || ''} onChange={val => handleProductSelectionChange(item.id, val)} placeholder="Seleccionar..." buttonClassName="w-full text-sm py-1.5 px-2 border rounded text-left" enableSearch/>
                                            )}
                                        </div>
                                        <div className="col-span-2"><label className="text-xs text-slate-500">Cant.</label><input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full rounded border-slate-300 p-1.5 text-sm" /></div>
                                        <div className="col-span-2"><CustomSelect label="Unidad" options={unitOptions} value={item.unit} onChange={val => handleItemChange(item.id, 'unit', val as Unit)} buttonClassName="w-full text-sm py-1.5 px-2 border rounded text-left"/></div>
                                        <div className="col-span-2"><label className="text-xs text-slate-500">Costo</label><input type="number" step="0.01" value={item.unitCost} onChange={e => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full rounded border-slate-300 p-1.5 text-sm" /></div>
                                        <div className="col-span-1"><label className="text-xs text-slate-500">Total</label><div className="text-sm font-bold py-1.5">${item.subtotal.toFixed(0)}</div></div>
                                        <div className="col-span-1 flex items-end justify-center"><button onClick={() => handleRemoveItem(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><span className="material-symbols-outlined !text-lg">delete</span></button></div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-4 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors">
                                <span className="material-symbols-outlined mr-1 text-lg">add_circle</span> Añadir Producto
                            </button>
                        </FormBlock>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <FormBlock title="Logística y Finanzas" icon="local_shipping">
                            <div className="space-y-4">
                                <CustomSelect label="Prioridad" options={priorityOptions} value={priority} onChange={val => setPriority(val as any)} />
                                <CustomSelect label="Almacén de Destino" options={[{value: '', name: 'Sin asignar'}, ...locationOptions]} value={warehouseId} onChange={setWarehouseId} placeholder="Seleccionar almacén..." />
                                <CustomSelect label="Términos de Pago" options={PAYMENT_TERM_OPTIONS.map(t => ({value: t, name: t}))} value={paymentTerms} onChange={setPaymentTerms} placeholder="Ej: 30 días" />
                                <CustomSelect label="Incoterm" options={INCOTERM_OPTIONS.map(t => ({value: t, name: t}))} value={incoterm} onChange={setIncoterm} placeholder="Ej: EXW" />
                            </div>
                        </FormBlock>

                        <FormBlock title="Resumen" icon="receipt">
                            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex justify-between"><span>Subtotal:</span><span className="font-semibold text-slate-800 dark:text-slate-200">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span>IVA (16%):</span><span className="font-semibold text-slate-800 dark:text-slate-200">${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 text-slate-800 dark:text-slate-200"><span>Total:</span><span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Internas</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm" placeholder="Instrucciones especiales..." />
                            </div>
                        </FormBlock>
                    </div>
                </div>
            )}

            <Drawer isOpen={isProductDrawerOpen} onClose={() => setIsProductDrawerOpen(false)} title="Crear Nuevo Producto">
                <div className="space-y-4">
                    <Input label="Nombre del Producto *" value={newProduct.name} onChange={val => setNewProduct(p => ({ ...p, name: val }))} />
                    <Input label="SKU *" value={newProduct.sku} onChange={val => setNewProduct(p => ({ ...p, sku: val }))} />
                    <CustomSelect label="Unidad *" options={unitOptions} value={newProduct.unitDefault} onChange={val => setNewProduct(p => ({ ...p, unitDefault: val as Unit }))} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsProductDrawerOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleSaveNewProduct} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default NewPurchaseOrderPage;
