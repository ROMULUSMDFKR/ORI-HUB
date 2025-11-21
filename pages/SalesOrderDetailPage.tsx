
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, SalesOrderStatus, Note, ActivityLog, Company, Product, Quote, User, Sample, Delivery, DeliveryStatus, Attachment } from '../types';
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
        const newTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
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
                                                ) : `$${item.unitPrice.toLocaleString()}`}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                ${(item.qty * item.unitPrice).toLocaleString()}
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
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Entregas Realizadas: <strong>{deliveryStats.countDelivered} / {deliveryStats.countTotal}</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div 
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(deliveryStats.progress, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-right text-slate-500 mt-1">Pendiente: {deliveryStats.totalOrdered - deliveryStats.totalDelivered}</p>
                        </div>

                        {/* List of Deliveries */}
                        {orderDeliveries.length > 0 ? (
                             <div className="space-y-3">
                                {orderDeliveries.map((del: Delivery, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${del.status === DeliveryStatus.Entregada ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                <span className="material-symbols-outlined text-sm">{del.status === DeliveryStatus.Entregada ? 'check' : 'schedule'}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {del.status} - {del.qty} {order.items[0]?.unit || 'unidades'}
                                                </p>
                                                <p className="text-xs text-slate-500">{new Date(del.scheduledDate).toLocaleDateString()} - {del.destination}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {del.proofOfDelivery && (
                                                <a 
                                                    href={del.proofOfDelivery.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                                                    title={del.proofOfDelivery.name}
                                                >
                                                    <span className="material-symbols-outlined !text-sm">description</span>
                                                    Ver Talón
                                                </a>
                                            )}
                                            <Link to="/logistics/deliveries" className="text-sm text-slate-500 hover:text-indigo-600 hover:underline">Detalle</Link>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="text-center py-4 text-slate-500 italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                No hay entregas registradas aún.
                            </div>
                        )}

                        {/* Add Delivery Form */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Registrar Entrega / Recolección Parcial</h4>
                            <div className="flex flex-col md:flex-row gap-3 items-end">
                                <div className="w-full md:flex-1">
                                    <label className="text-xs text-slate-500 mb-1 block">Cantidad</label>
                                    <input 
                                        type="number" 
                                        value={newDeliveryQty} 
                                        onChange={e => setNewDeliveryQty(parseFloat(e.target.value))} 
                                        className={standardInputClasses} 
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="w-full md:flex-1">
                                    <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                                    <input 
                                        type="date" 
                                        value={newDeliveryDate} 
                                        onChange={e => setNewDeliveryDate(e.target.value)} 
                                        className={standardInputClasses} 
                                    />
                                </div>
                                <div className="w-full md:w-auto flex items-center gap-2">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*,.pdf"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex-1 md:flex-none h-[38px] px-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors ${deliveryFile ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                        title={deliveryFile ? deliveryFile.name : "Adjuntar Talón"}
                                    >
                                        <span className="material-symbols-outlined !text-lg">{deliveryFile ? 'check_circle' : 'attach_file'}</span>
                                        {deliveryFile ? 'Talón Adjunto' : 'Adjuntar Talón'}
                                    </button>
                                    {deliveryFile && (
                                        <button 
                                            onClick={() => { setDeliveryFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            title="Quitar archivo"
                                        >
                                            <span className="material-symbols-outlined !text-lg">close</span>
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={handleAddDelivery}
                                    disabled={newDeliveryQty <= 0 || isUploadingFile}
                                    className="w-full md:w-auto bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed h-[38px] flex items-center justify-center gap-2"
                                >
                                    {isUploadingFile ? <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span> : <span className="material-symbols-outlined !text-sm">add</span>}
                                    Registrar
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                    
                    {/* Notes Section - Active Order Notes */}
                    <NotesSection 
                        entityId={order.id}
                        entityType="salesOrder"
                        notes={salesOrderNotes}
                        onNoteAdded={handleNoteAdded}
                    />

                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Financial Summary */}
                     <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden sticky top-6">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${(order.total / (1 + TAX_RATE)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>IVA (16%)</span>
                                    <span>${(order.total - (order.total / (1 + TAX_RATE))).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                </div>
                                
                                <div className="pt-4 mt-2 border-t-2 border-indigo-600 flex justify-between items-end">
                                    <span className="text-lg font-medium opacity-80">Total</span>
                                    <span className="text-3xl font-bold tracking-tight">${order.total.toLocaleString()}</span>
                                </div>
                                <p className="text-right text-xs text-indigo-300 mt-1">{currencyLabel}</p>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Acciones Rápidas</h4>
                         <button onClick={() => showToast('info', 'Generando Factura...')} className="w-full text-left flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <span className="material-symbols-outlined mr-3 text-slate-400">receipt_long</span>
                            Generar Factura
                        </button>
                         <button onClick={() => showToast('info', 'Enviando confirmación...')} className="w-full text-left flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <span className="material-symbols-outlined mr-3 text-slate-400">mail</span>
                            Enviar Confirmación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDetailPage;
