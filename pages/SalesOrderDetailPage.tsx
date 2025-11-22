
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, SalesOrderStatus, Note, ActivityLog, Company, Product, Quote, User, Sample, Delivery, DeliveryStatus, Attachment, InventoryMove } from '../types';
import { SALES_ORDERS_PIPELINE_COLUMNS, TAX_RATE } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import NoteCard from '../components/shared/NoteCard';
import Badge from '../components/ui/Badge';

// Reusable UI Components
const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className = '', icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</dd>
    </div>
);

const SalesOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialOrder, loading, error } = useDoc<SalesOrder>('salesOrders', id || '');
    
    // Related Collections
    const { data: companies } = useCollection<Company>('companies');
    const { data: products } = useCollection<Product>('products');
    const { data: quotes } = useCollection<Quote>('quotes');
    const { data: samples } = useCollection<Sample>('samples'); 
    const { data: allNotes } = useCollection<Note>('notes');
    const { data: users } = useCollection<User>('users');
    const { data: allDeliveries } = useCollection<Delivery>('deliveries');
    
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    // Local State
    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Quick Delivery State
    const [newDeliveryQty, setNewDeliveryQty] = useState<number>(0);
    const [newDeliveryDate, setNewDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialOrder) {
            setOrder(initialOrder);
        }
    }, [initialOrder]);

    // Derived Data
    const client = useMemo(() => companies?.find(c => c.id === order?.companyId), [companies, order]);
    const relatedQuote = useMemo(() => quotes?.find(q => q.id === order?.quoteId), [quotes, order]);
    const responsible = useMemo(() => {
        if (!order) return null;
        const userId = (order as any).salespersonId || client?.ownerId;
        return users?.find(u => u.id === userId);
    }, [users, order, client]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    // --- DELIVERY LOGIC ---
    const orderDeliveries = useMemo(() => {
        if (!allDeliveries || !id) return [];
        return allDeliveries.filter(d => d.salesOrderId === id).sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }, [allDeliveries, id]);

    const deliveryStats = useMemo(() => {
        if (!order) return { totalOrdered: 0, totalDelivered: 0, progress: 0, countDelivered: 0, countTotal: 0 };
        
        // Sum of all product quantities in the order
        const totalOrdered = order.items.reduce((sum, item) => sum + item.qty, 0);
        
        // Assuming deliveries track qty. If deliveries are generic, we might need a different logic.
        // Here we assume the 'qty' in Delivery interface matches the order unit roughly.
        const totalDelivered = orderDeliveries
            .filter(d => d.status === DeliveryStatus.Entregada)
            .reduce((sum, d) => sum + (d.qty || 0), 0); // Assuming Delivery type has qty, if not check type def
            
        const countTotal = orderDeliveries.length;
        const countDelivered = orderDeliveries.filter(d => d.status === DeliveryStatus.Entregada).length;

        return {
            totalOrdered,
            totalDelivered,
            progress: totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0,
            countTotal,
            countDelivered
        };
    }, [order, orderDeliveries]);


    // --- NOTES LOGIC ---
    const salesOrderNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.salesOrderId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    // Context Notes (Quote & Sample)
    const quoteNotes = useMemo(() => {
        if (!allNotes || !order?.quoteId) return [];
        return allNotes
            .filter(n => n.quoteId === order.quoteId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, order?.quoteId]);

    const relatedSample = useMemo(() => {
        if(!samples || !relatedQuote) return null;
        return samples.find(s => 
            (s.companyId === relatedQuote.companyId || s.prospectId === relatedQuote.prospectId) && 
            s.productId === relatedQuote.items[0]?.productId
        );
    }, [samples, relatedQuote]);

    const sampleNotes = useMemo(() => {
        if (!allNotes || !relatedSample) return [];
        return allNotes
            .filter(n => n.sampleId === relatedSample.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, relatedSample]);


    // Handlers
    const handleStatusChange = (newStatus: SalesOrderStatus) => {
        if (order) setOrder({ ...order, status: newStatus });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        if (!order) return;
        const newItems = [...order.items];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
            newItems[index].subtotal = newItems[index].qty * newItems[index].unitPrice;
        }
        setOrder({ ...order, items: newItems });
    };

    const handleSaveChanges = async () => {
        if (!order || !id) return;
        setIsSaving(true);
        
        // Recalculate total
        const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
        // Use order.taxRate if exists, otherwise default to 16 (legacy support)
        const taxRate = order.taxRate !== undefined ? (order.taxRate / 100) : TAX_RATE;
        const newTotal = subtotal + (subtotal * taxRate);
        
        const updatedOrder = { ...order, total: newTotal };

        try {
            await api.updateDoc('salesOrders', id, updatedOrder);
            
            if (initialOrder && initialOrder.status !== order.status) {
                 const log: Omit<ActivityLog, 'id'> = { 
                    salesOrderId: id, 
                    type: 'Cambio de Estado', 
                    description: `Estado actualizado a "${order.status}"`, 
                    userId: currentUser?.id || 'system', 
                    createdAt: new Date().toISOString() 
                };
                await api.addDoc('activities', log);
                
                // --- AUTOMATIC INVENTORY DEDUCTION ---
                // Trigger when status changes to 'Entregada'
                if (order.status === SalesOrderStatus.Entregada && initialOrder.status !== SalesOrderStatus.Entregada) {
                    const inventoryPromises = order.items.map(item => {
                        const move: Omit<InventoryMove, 'id'> = {
                            type: 'out',
                            productId: item.productId,
                            lotId: item.lotId,
                            qty: -Math.abs(item.qty), // Negative for deduction
                            unit: item.unit,
                            note: `Salida por Orden de Venta: ${order.folio || order.id}`,
                            userId: currentUser?.id || 'system',
                            createdAt: new Date().toISOString()
                        };
                        return api.addDoc('inventoryMoves', move);
                    });
                    
                    await Promise.all(inventoryPromises);
                    showToast('success', 'Inventario descontado automáticamente.');
                }
            }
            showToast('success', 'Orden de Venta actualizada.');
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating sales order:", error);
            showToast('error', "Error al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDeliveryFile(e.target.files[0]);
        }
    };

    const handleAddDelivery = async () => {
        if (!newDeliveryQty || !order || !id) return;
        setIsUploadingFile(true);
        
        let proofOfDelivery: Attachment | undefined = undefined;

        try {
            if (deliveryFile) {
                const url = await api.uploadFile(deliveryFile, `deliveries/${id}`);
                proofOfDelivery = {
                    id: `pod-${Date.now()}`,
                    name: deliveryFile.name,
                    size: deliveryFile.size,
                    url: url
                };
            }

            // Create a new delivery record
            const deliveryData: any = {
                salesOrderId: id,
                companyId: order.companyId,
                carrierId: '', // To be filled or handled
                destination: 'Recolección / Entrega Parcial', // Default
                status: DeliveryStatus.Programada,
                scheduledDate: newDeliveryDate,
                deliveryNumber: `DEL-${orderDeliveries.length + 1}`,
                qty: newDeliveryQty, // Adding quantity to delivery logic
                notes: [],
                proofOfDelivery: proofOfDelivery
            };

            await api.addDoc('deliveries', deliveryData);
            showToast('success', 'Entrega registrada.');
            
            // Reset form
            setNewDeliveryQty(0);
            setDeliveryFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (e) {
            console.error(e);
            showToast('error', 'Error al crear entrega.');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleNoteAdded = (note: Note) => {
        // Optimistic update
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !order) return <div className="text-center p-12">Orden de Venta no encontrada</div>;
    
    const statusOptions = SALES_ORDERS_PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));
    const standardInputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500";

    // Priority identifier: Folio > Abbreviated ID
    const displayTitle = order.folio || `OV-${order.id.slice(-6).toUpperCase()}`;
    const currencyLabel = order.currency || 'MXN'; // Default to MXN if not present for legacy records
    
    // Determine effective tax rate for display calculation
    const effectiveTaxRate = order.taxRate !== undefined ? (order.taxRate / 100) : TAX_RATE;
    const subtotalValue = (order.total || 0) / (1 + effectiveTaxRate);
    const taxValue = (order.total || 0) - subtotalValue;
    const taxLabel = effectiveTaxRate === 0 ? '0%' : `${(effectiveTaxRate * 100).toFixed(0)}%`;


    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {displayTitle}
                    </h1>
                    {/* Secondary ID display - small and gray */}
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {order.id}</p>

                    <div className="flex items-center gap-2 mt-2">
                         <p className="text-slate-500 dark:text-slate-400">
                            Cliente: <Link to={`/crm/clients/${order.companyId}`} className="text-indigo-600 hover:underline font-semibold">{client?.shortName || client?.name || 'Cargando...'}</Link>
                         </p>
                         {relatedQuote && (
                             <>
                                <span className="text-slate-300">•</span>
                                <Link to={`/hubs/quotes/${relatedQuote.id}`} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100">
                                    Cotización: {relatedQuote.folio}
                                </Link>
                             </>
                         )}
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                            <div className="w-48">
                                <CustomSelect options={statusOptions} value={order.status} onChange={val => handleStatusChange(val as SalesOrderStatus)} />
                            </div>
                            <button onClick={() => setIsEditing(true)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 h-[42px] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">edit</span> Editar
                            </button>
                            <button onClick={handleSaveChanges} disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">
                                {isSaving ? 'Guardando...' : 'Guardar Estado'}
                            </button>
                        </>
                    ) : (
                         <>
                            <button onClick={() => { setIsEditing(false); setOrder(initialOrder); }} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                            <button onClick={handleSaveChanges} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700">Guardar Cambios</button>
                         </>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* General Info */}
                    <SectionCard title="Información General" icon="info">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoRow label="Fecha Creación" value={new Date(order.createdAt).toLocaleDateString()} />
                            <InfoRow label="Responsable" value={responsible?.name || 'N/A'} />
                            <InfoRow label="Cotización Origen" value={relatedQuote ? relatedQuote.folio : 'N/A'} />
                            <InfoRow label="Moneda" value={currencyLabel} />
                        </div>
                    </SectionCard>

                    {/* CONTEXTO OPERATIVO (Notes from Quote/Sample) */}
                    {(relatedQuote || relatedSample) && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-xl shadow-sm">
                            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 pb-3 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined">history_edu</span>
                                Contexto y Antecedentes (Cotización)
                            </h3>
                            <div className="space-y-4">
                                {/* Notas Generales de la Cotización */}
                                {relatedQuote?.notes && (
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-amber-100 dark:border-amber-900/50">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notas / Términos de Cotización</p>
                                        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{relatedQuote.notes}</p>
                                    </div>
                                )}
                                
                                {/* Historial de Notas de la Cotización */}
                                {quoteNotes.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Historial de Chat (Cotización)</p>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {quoteNotes.map(note => (
                                                <NoteCard key={note.id} note={note} usersMap={usersMap} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sampleNotes.length > 0 && (
                                     <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Historial de Muestras</p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {sampleNotes.map(note => (
                                                <NoteCard key={note.id} note={note} usersMap={usersMap} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {!relatedQuote?.notes && quoteNotes.length === 0 && sampleNotes.length === 0 && (
                                    <p className="text-sm text-amber-700 dark:text-amber-400 italic">No hay notas adicionales.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products Table */}
                    <SectionCard title="Productos y Servicios" icon="inventory_2">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-2">Producto</th>
                                        <th className="p-2 text-right">Cant.</th>
                                        <th className="p-2">Unidad</th>
                                        <th className="p-2 text-right">P. Unit</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {order.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-medium">
                                                {(products?.find(p => p.id === item.productId)?.name) || 'Producto desconocido'}
                                            </td>
                                            <td className="p-2 text-right w-24">
                                                {isEditing ? (
                                                    <input 
                                                        type="number" 
                                                        value={item.qty} 
                                                        onChange={e => handleItemChange(idx, 'qty', parseFloat(e.target.value))}
                                                        className={standardInputClasses + " text-right"}
                                                    />
                                                ) : item.qty}
                                            </td>
                                            <td className="p-2 w-20">{item.unit}</td>
                                            <td className="p-2 text-right w-32">
                                                {isEditing ? (
                                                    <input 
                                                        type="number" 
                                                        value={item.unitPrice} 
                                                        onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                                                        className={standardInputClasses + " text-right"}
                                                    />
                                                ) : `$${(item.unitPrice || 0).toLocaleString()}`}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                ${((item.qty || 0) * (item.unitPrice || 0)).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    {/* Logistics & Deliveries Section (Enhanced) */}
                    <SectionCard title="Logística y Avance de Entregas" icon="local_shipping">
                        {/* Progress Bar */}
                        <div className="mb-6 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Progreso de Entrega</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {deliveryStats.totalDelivered} <span className="text-sm text-slate-500 font-normal">/ {deliveryStats.totalOrdered}</span>
                               