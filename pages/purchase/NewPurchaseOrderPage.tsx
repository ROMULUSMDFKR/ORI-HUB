import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Supplier, Product, User, Unit, PurchaseOrder, PurchaseOrderItem } from '../../types';
import { api } from '../../api/firebaseApi';
import Spinner from '../../components/ui/Spinner';
import CustomSelect from '../../components/ui/CustomSelect';
import { TAX_RATE, UNITS } from '../../constants';

const FormBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

interface POItemForm extends PurchaseOrderItem {
    id: number; // Internal ID for React keys
}

const NewPurchaseOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const [supplierId, setSupplierId] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItemForm[]>([]);
    
    const { data: suppliers, loading: sLoading } = useCollection<Supplier>('suppliers');
    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: users, loading: uLoading } = useCollection<User>('users');

    const loading = sLoading || pLoading || uLoading;
    
    const supplierOptions = useMemo(() => (suppliers || []).map(s => ({ value: s.id, name: s.name })), [suppliers]);
    const productOptions = useMemo(() => (products || []).map(p => ({ value: p.id, name: `${p.name} (${p.sku})` })), [products]);
    const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, name: u.name })), [users]);
    const unitOptions = useMemo(() => UNITS.map(u => ({ value: u, name: u })), []);

    const { subtotal, tax, total } = useMemo(() => {
        const sub = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const taxAmount = sub * TAX_RATE;
        const totalAmount = sub + taxAmount;
        return { subtotal: sub, tax: taxAmount, total: totalAmount };
    }, [items]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), productId: '', qty: 1, unit: 'kg', unitCost: 0, subtotal: 0 }]);
    };
    
    const handleRemoveItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id: number, field: keyof POItemForm, value: any) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'qty' || field === 'unitCost') {
                    updatedItem.subtotal = (Number(updatedItem.qty) || 0) * (Number(updatedItem.unitCost) || 0);
                }
                if (field === 'productId') {
                    const product = products?.find(p => p.id === value);
                    updatedItem.unit = product?.unitDefault || 'kg';
                }
                return updatedItem;
            }
            return item;
        }));
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
            items: items.map(({ id, ...rest }) => rest),
            status: 'Borrador',
            createdAt: new Date().toISOString(),
            subtotal,
            tax,
            total,
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nueva Orden de Compra</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/purchase/orders')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar OC</button>
                </div>
            </div>

            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <FormBlock title="Información General">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CustomSelect label="Proveedor *" options={supplierOptions} value={supplierId} onChange={setSupplierId} placeholder="Seleccionar..."/>
                                <CustomSelect label="Responsable" options={userOptions} value={responsibleId} onChange={setResponsibleId} placeholder="Seleccionar..."/>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Emisión</label>
                                    <input type="date" value={new Date().toISOString().split('T')[0]} readOnly disabled className="mt-1 w-full bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de Entrega Esperada</label>
                                    <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className="mt-1 w-full"/>
                                </div>
                            </div>
                        </FormBlock>

                        <FormBlock title="Productos">
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="col-span-4"><CustomSelect label="Producto" options={productOptions} value={item.productId} onChange={val => handleItemChange(item.id, 'productId', val)} placeholder="Seleccionar..."/></div>
                                        <div className="col-span-2"><label className="text-xs">Cantidad</label><input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} /></div>
                                        <div className="col-span-2"><CustomSelect label="Unidad" options={unitOptions} value={item.unit} onChange={val => handleItemChange(item.id, 'unit', val as Unit)} /></div>
                                        <div className="col-span-2"><label className="text-xs">Costo Unit.</label><input type="number" step="0.01" value={item.unitCost} onChange={e => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)} /></div>
                                        <div className="col-span-1"><label className="text-xs">Subtotal</label><input type="text" value={`$${item.subtotal.toFixed(2)}`} disabled className="bg-slate-200 dark:bg-slate-700"/></div>
                                        <div className="col-span-1 flex items-end"><button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-500 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button></div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddItem} className="text-sm font-semibold text-indigo-600 flex items-center mt-4">
                                <span className="material-symbols-outlined mr-1">add_circle</span> Añadir Producto
                            </button>
                        </FormBlock>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <FormBlock title="Resumen y Notas">
                            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex justify-between"><span>Subtotal:</span><span className="font-semibold text-slate-800 dark:text-slate-200">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span>IVA ({(TAX_RATE * 100).toFixed(0)}%):</span><span className="font-semibold text-slate-800 dark:text-slate-200">${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 text-slate-800 dark:text-slate-200"><span>Total:</span><span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="mt-1 w-full" placeholder="Instrucciones de entrega, términos de pago, etc."/>
                            </div>
                        </FormBlock>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewPurchaseOrderPage;
