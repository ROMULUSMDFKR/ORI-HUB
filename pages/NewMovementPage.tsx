
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InventoryMove, Product, ProductLot, User, Unit } from '../types';
import { api } from '../api/firebaseApi';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

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

const NewMovementPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();

    const { data: products, loading: pLoading } = useCollection<Product>('products');
    const { data: locations, loading: lLoading } = useCollection<any>('locations');
    const { data: users, loading: uLoading } = useCollection<User>('users');

    const [formState, setFormState] = useState({
        type: 'in' as InventoryMove['type'],
        productId: '',
        lotId: '',
        qty: 0,
        fromLocationId: '',
        toLocationId: '',
        note: '',
        reference: '',
        reasonCode: '',
        operatorId: '',
        urgency: 'Media' as 'Baja' | 'Media' | 'Alta'
    });
    
    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);
    const [currentStock, setCurrentStock] = useState(0);
    const [selectedLot, setSelectedLot] = useState<ProductLot | null>(null);

    useEffect(() => {
        if (currentUser && !formState.operatorId) {
            setFormState(prev => ({...prev, operatorId: currentUser.id}));
        }
    }, [currentUser]);

    useEffect(() => {
        const fetchLots = async () => {
            if (formState.productId) {
                const lots = await api.getLotsForProduct(formState.productId);
                setAvailableLots(lots);
            } else {
                setAvailableLots([]);
            }
            setFormState(prev => ({ ...prev, lotId: '' }));
        };
        fetchLots();
    }, [formState.productId]);

    useEffect(() => {
        if (formState.lotId) {
            const lot = availableLots.find(l => l.id === formState.lotId);
            if (lot) {
                setSelectedLot(lot);
                // Calculate total stock for this lot
                const stock = lot.stock.reduce((sum, s) => sum + s.qty, 0);
                setCurrentStock(stock);
            }
        } else {
            setSelectedLot(null);
            setCurrentStock(0);
        }
    }, [formState.lotId, availableLots]);

    const handleChange = (field: keyof typeof formState, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formState.productId || !formState.qty) {
            showToast('warning', 'Producto y cantidad son requeridos.');
            return;
        }
        if ((formState.type === 'out' || formState.type === 'transfer') && !formState.fromLocationId) {
             showToast('warning', 'La ubicación de origen es requerida.');
            return;
        }
        if ((formState.type === 'in' || formState.type === 'transfer') && !formState.toLocationId) {
             showToast('warning', 'La ubicación de destino es requerida.');
            return;
        }
        if (formState.qty > currentStock && (formState.type === 'out' || formState.type === 'transfer')) {
             showToast('warning', `Stock insuficiente en el lote seleccionado (Disponible: ${currentStock}).`);
             return;
        }

        const product = products?.find(p => p.id === formState.productId);
        if (!product || !currentUser) return;

        const movementData: Omit<InventoryMove, 'id'> = {
            type: formState.type,
            productId: formState.productId,
            lotId: formState.lotId,
            qty: formState.type === 'out' ? -Math.abs(formState.qty) : Math.abs(formState.qty),
            unit: product.unitDefault,
            fromLocationId: (formState.type === 'out' || formState.type === 'transfer') ? formState.fromLocationId : undefined,
            toLocationId: (formState.type === 'in' || formState.type === 'transfer') ? formState.toLocationId : undefined,
            note: formState.note,
            reference: formState.reference,
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
            reasonCode: formState.reasonCode,
            operatorId: formState.operatorId,
            urgency: formState.urgency
        };

        try {
            await api.addDoc('inventoryMoves', movementData);
            showToast('success', 'Movimiento registrado correctamente.');
            navigate('/inventory/movements');
        } catch (error) {
            console.error("Error saving movement:", error);
            showToast('error', 'Error al registrar el movimiento.');
        }
    };

    const productOptions = (products || []).map(p => ({ value: p.id, name: p.name }));
    const locationOptions = (locations || []).map((l: any) => ({ value: l.id, name: l.name }));
    const lotOptions = (availableLots || []).map(l => ({ value: l.id, name: `${l.code} (Stock: ${l.stock.reduce((a,b)=>a+b.qty,0)})` }));
    const userOptions = (users || []).map(u => ({ value: u.id, name: u.name }));
    
    const reasonOptions = [
        { value: 'Compra', name: 'Recepción de Compra' },
        { value: 'Venta', name: 'Despacho de Venta' },
        { value: 'Transferencia', name: 'Reubicación Interna' },
        { value: 'Merma', name: 'Merma / Daño' },
        { value: 'Ajuste', name: 'Ajuste de Inventario' },
        { value: 'Muestra', name: 'Muestra Comercial' },
    ];

    const loading = pLoading || lLoading || uLoading;

    if(loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Movimiento de Inventario</h2>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/inventory/movements')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Registrar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-8 space-y-6">
                    <FormBlock title="¿Qué vamos a mover?" icon="inventory_2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomSelect label="Producto *" options={productOptions} value={formState.productId} onChange={val => handleChange('productId', val)} placeholder="Buscar producto..." enableSearch/>
                            <CustomSelect label="Lote Específico" options={lotOptions} value={formState.lotId} onChange={val => handleChange('lotId', val)} placeholder="Seleccionar lote..." />
                        </div>
                        
                        {selectedLot && (
                             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                                 <span className="material-symbols-outlined text-blue-600 text-2xl">info</span>
                                 <div>
                                     <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Stock Actual en Lote: {currentStock}</p>
                                     <p className="text-xs text-blue-600 dark:text-blue-400">Costo Unitario: ${selectedLot.unitCost}</p>
                                 </div>
                             </div>
                        )}
                    </FormBlock>

                    <FormBlock title="Detalle del Movimiento" icon="swap_horiz">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Operación</label>
                            <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                {['in', 'out', 'transfer', 'adjust'].map((t) => (
                                    <button 
                                        key={t} 
                                        onClick={() => handleChange('type', t)} 
                                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${formState.type === t ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {t === 'in' ? 'Entrada' : t === 'out' ? 'Salida' : t === 'transfer' ? 'Traspaso' : 'Ajuste'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Dynamic Source/Dest Fields */}
                            {(formState.type === 'out' || formState.type === 'transfer') && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
                                    <CustomSelect label="Origen (Desde)" options={locationOptions} value={formState.fromLocationId} onChange={val => handleChange('fromLocationId', val)} placeholder="Seleccionar origen..." />
                                </div>
                            )}
                            {(formState.type === 'in' || formState.type === 'transfer') && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900">
                                    <CustomSelect label="Destino (Hacia)" options={locationOptions} value={formState.toLocationId} onChange={val => handleChange('toLocationId', val)} placeholder="Seleccionar destino..." />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <Input label="Cantidad *" type="number" value={formState.qty} onChange={val => handleChange('qty', parseFloat(val))} icon="scale" />
                            <Input label="Referencia (Doc)" value={formState.reference} onChange={val => handleChange('reference', val)} placeholder="OC-123, Factura #..." icon="receipt" />
                        </div>
                    </FormBlock>
                </div>

                {/* Right Column: Context */}
                <div className="lg:col-span-4 space-y-6">
                    <FormBlock title="Contexto Operativo" icon="settings">
                        <CustomSelect label="Motivo / Razón" options={reasonOptions} value={formState.reasonCode} onChange={val => handleChange('reasonCode', val)} />
                        <div className="mt-4">
                             <CustomSelect label="Operador Responsable" options={userOptions} value={formState.operatorId} onChange={val => handleChange('operatorId', val)} />
                        </div>
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nivel de Urgencia</label>
                             <select 
                                value={formState.urgency} 
                                onChange={(e) => handleChange('urgency', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                             >
                                 <option value="Baja">Baja</option>
                                 <option value="Media">Media</option>
                                 <option value="Alta">Alta</option>
                             </select>
                        </div>
                    </FormBlock>

                    <FormBlock title="Evidencia y Notas" icon="attach_file">
                        <div className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                            <span className="material-symbols-outlined text-3xl mb-1">cloud_upload</span>
                            <span className="text-xs">Subir fotos o documentos</span>
                        </div>
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Adicionales</label>
                             <textarea 
                                rows={3}
                                value={formState.note}
                                onChange={(e) => handleChange('note', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm"
                                placeholder="Detalles sobre el estado físico, condiciones, etc."
                             />
                        </div>
                    </FormBlock>
                </div>
            </div>
        </div>
    );
};

export default NewMovementPage;
