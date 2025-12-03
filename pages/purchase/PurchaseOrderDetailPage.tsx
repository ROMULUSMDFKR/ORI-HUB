
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { useCollection } from '../../hooks/useCollection';
import { PurchaseOrder, Supplier, PurchaseOrderStatus, User, Attachment, InternalCompany, PurchasePayment, Note, Notification, Task, TaskStatus, Priority } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { api } from '../../api/firebaseApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { PURCHASE_ORDERS_PIPELINE_COLUMNS } from '../../constants';
import NotesSection from '../../components/shared/NotesSection';
import CustomSelect from '../../components/ui/CustomSelect';
import Drawer from '../../components/ui/Drawer';

// Helper components
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-slate-800 dark:text-slate-200 text-right font-medium">{value}</dd>
    </div>
);

const PurchaseOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    
    const { data: initialOrder, loading: orderLoading, error } = useDoc<PurchaseOrder>('purchaseOrders', id || '');
    const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: internalCompanies } = useCollection<InternalCompany>('internalCompanies');
    const { data: allNotes } = useCollection<Note>('notes');

    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null); // Ref for sidebar invoice upload
    
    // Payment Drawer State
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'Transferencia', reference: '', notes: '' });

    // Invoice Modal State (For Status Change Interception)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const modalInvoiceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialOrder) setOrder(initialOrder);
    }, [initialOrder]);

    const loading = orderLoading || suppliersLoading || usersLoading;

    const supplier = useMemo(() => suppliers?.find(s => s.id === order?.supplierId), [order, suppliers]);
    const responsible = useMemo(() => users?.find(u => u.id === order?.responsibleId), [order, users]);
    const approver = useMemo(() => users?.find(u => u.id === order?.approverId), [order, users]);
    const issuingCompany = useMemo(() => internalCompanies?.find(c => c.id === order?.issuingCompanyId), [order, internalCompanies]);

    // Notes logic - reuse salesOrderId field for ID
    const notesForSection = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes.filter(n => n.salesOrderId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);
    
    const allInvoices = useMemo(() => {
        const list = order?.invoiceAttachments || [];
        // Legacy support: if invoiceAttachment exists but isn't in the list, include it.
        if (order?.invoiceAttachment && !list.some(a => a.id === order.invoiceAttachment!.id)) {
            return [order.invoiceAttachment, ...list];
        }
        return list;
    }, [order]);


    // --- STATUS MANAGEMENT ---
    const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
        if (!order || !id) return;

        // Requirement: Request Invoice when changing to Facturada
        if (newStatus === PurchaseOrderStatus.Facturada && (!order.invoiceAttachments || order.invoiceAttachments.length === 0) && !order.invoiceAttachment) {
            setIsInvoiceModalOpen(true);
            return;
        }

        try {
            await api.updateDoc('purchaseOrders', id, { status: newStatus });
            setOrder({ ...order, status: newStatus });
            
            // --- AUTOMATION: APPROVAL REQUEST ---
            if (newStatus === PurchaseOrderStatus.PorAprobar && order.approverId) {
                
                // 1. Create Task for Approver
                const approvalTask: Omit<Task, 'id'> = {
                    title: `Aprobar Orden de Compra ${order.id}`,
                    description: `Se requiere tu aprobación para la OC del proveedor ${supplier?.name || 'N/A'}.\nMonto Total: $${order.total.toLocaleString()}.\nEnlace: #/purchase/orders/${id}`,
                    status: TaskStatus.PorHacer,
                    priority: Priority.Alta,
                    assignees: [order.approverId],
                    watchers: [currentUser?.id || ''],
                    createdById: currentUser?.id,
                    createdAt: new Date().toISOString(),
                    dueAt: new Date().toISOString(), // Due Today
                    links: { purchaseOrderId: id }
                };
                await api.addDoc('tasks', approvalTask);

                // 2. Create Notification for Approver
                const notification: Omit<Notification, 'id'> = {
                    userId: order.approverId,
                    title: 'Solicitud de Aprobación',
                    message: `Se requiere tu aprobación para la Orden de Compra ${order.id}`,
                    type: 'task',
                    link: `/purchase/orders/${id}`,
                    isRead: false,
                    createdAt: new Date().toISOString()
                };
                await api.addDoc('notifications', notification);

                showToast('success', 'Solicitud de aprobación enviada (Tarea y Notificación creadas).');
            } else {
                showToast('success', `Estado actualizado a: ${newStatus}`);
            }

        } catch (error) {
            console.error("Error updating status:", error);
            showToast('error', "Error al actualizar el estado.");
        }
    };

    // --- INVOICE UPLOAD LOGIC (SIDEBAR & MODAL) ---
    
    // Generic uploader
    const uploadInvoiceFile = async (file: File) => {
        if(!id) return;
        setIsUploading(true);
        try {
            const url = await api.uploadFile(file, `purchase_orders/${id}/invoice`);
            const attachment: Attachment = {
                id: `inv-${Date.now()}`,
                name: file.name,
                size: file.size,
                url: url
            };

            // Update order with new attachment in array
            const currentAttachments = order?.invoiceAttachments || (order?.invoiceAttachment ? [order.invoiceAttachment] : []) || [];
            const updatedAttachments = [...currentAttachments, attachment];

            await api.updateDoc('purchaseOrders', id, { 
                invoiceAttachments: updatedAttachments,
                // Update legacy field for backward compatibility if needed, or just keep the first one
                invoiceAttachment: updatedAttachments[0] 
            });
            
            setOrder(prev => prev ? ({ 
                ...prev, 
                invoiceAttachments: updatedAttachments,
                invoiceAttachment: updatedAttachments[0]
            }) : null);
            
            showToast('success', 'Factura fiscal subida correctamente.');
            return attachment;
        } catch (error) {
             console.error("Error uploading invoice:", error);
             showToast('error', 'Error al subir la factura.');
             throw error;
        } finally {
            setIsUploading(false);
        }
    };

    // 1. Sidebar Upload Handler
    const handleSidebarInvoiceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await uploadInvoiceFile(e.target.files[0]);
            e.target.value = ''; // Reset
        }
    };

    // 2. Modal Upload & Close Handler
    const handleInvoiceUploadAndClose = async () => {
        if (!invoiceFile || !order || !id) {
            showToast('warning', 'Debes seleccionar el archivo de la factura.');
            return;
        }
        try {
            const attachment = await uploadInvoiceFile(invoiceFile);
             // Also update status to Facturada since it came from the modal
            await api.updateDoc('purchaseOrders', id, { status: PurchaseOrderStatus.Facturada });
            setOrder(prev => prev ? ({ ...prev, status: PurchaseOrderStatus.Facturada }) : null);
            
            setIsInvoiceModalOpen(false);
            setInvoiceFile(null);
            showToast('success', 'Orden marcada como Facturada.');
        } catch (e) {
            // Error handled in uploadInvoiceFile
        }
    };


    // --- APPROVAL LOGIC ---
    const isApprover = currentUser?.id === order?.approverId || currentUser?.role === 'Admin';
    const needsApproval = order?.status === PurchaseOrderStatus.PorAprobar;

    const handleApprove = () => handleStatusChange(PurchaseOrderStatus.Ordenada);
    const handleReject = () => {
        if (window.confirm('¿Estás seguro de rechazar esta orden?')) {
            handleStatusChange(PurchaseOrderStatus.Borrador); // Send back to draft
        }
    };

    // --- QUOTE FILE UPLOAD ---
    const handleQuoteFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !order || !id) return;
        const file = e.target.files[0];
        
        setIsUploading(true);
        try {
            const url = await api.uploadFile(file, `purchase_orders/${id}/quotes`);
            const newAttachment: Attachment = {
                id: `att-${Date.now()}`,
                name: file.name,
                size: file.size,
                url: url
            };
            
            // Combine legacy attachment with new array if needed
            const currentAttachments = order.quoteAttachments || [];
            if (order.quoteAttachment && currentAttachments.length === 0) {
                currentAttachments.push(order.quoteAttachment);
            }

            const updatedAttachments = [...currentAttachments, newAttachment];
            
            await api.updateDoc('purchaseOrders', id, { quoteAttachments: updatedAttachments });
            setOrder(prev => prev ? ({ ...prev, quoteAttachments: updatedAttachments }) : null);
            showToast('success', 'Cotización añadida correctamente.');
        } catch (error) {
            console.error("Error uploading file:", error);
            showToast('error', 'Error al subir el documento.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    };

    // --- PAYMENT LOGIC ---
    const handleAddPayment = async () => {
        if (!order || !id || !paymentForm.amount) return;
        
        const newPayment: PurchasePayment = {
            id: `pay-${Date.now()}`,
            amount: Number(paymentForm.amount),
            date: paymentForm.date,
            method: paymentForm.method,
            reference: paymentForm.reference,
            notes: paymentForm.notes,
            registeredBy: currentUser?.name || 'Sistema'
        };

        const updatedPayments = [...(order.payments || []), newPayment];
        const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Determine new status
        let newStatus = order.status;
        if (newPaidAmount >= order.total) {
            newStatus = PurchaseOrderStatus.Pagada;
        } else if (newPaidAmount > 0) {
            newStatus = PurchaseOrderStatus.PagoParcial;
        }

        try {
            await api.updateDoc('purchaseOrders', id, { 
                payments: updatedPayments,
                paidAmount: newPaidAmount,
                status: newStatus
            });
            
            setOrder(prev => prev ? ({ 
                ...prev, 
                payments: updatedPayments, 
                paidAmount: newPaidAmount,
                status: newStatus 
            }) : null);

            setIsPaymentDrawerOpen(false);
            setPaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'Transferencia', reference: '', notes: '' });
            showToast('success', 'Pago registrado correctamente.');

        } catch (error) {
            console.error("Error adding payment:", error);
            showToast('error', 'Error al registrar el pago.');
        }
    };

    // --- NOTES LOGIC ---
    const handleNoteAdded = async (note: Note) => {
        try {
            const noteWithId = { ...note, salesOrderId: id }; // Reuse field as per schema constraint
            await api.addDoc('notes', noteWithId);
            showToast('success', 'Nota agregada.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error al guardar nota.');
        }
    };
    
    // --- PIPELINE VISUALIZATION ---
    const currentStageIndex = PURCHASE_ORDERS_PIPELINE_COLUMNS.findIndex(col => col.stage === order?.status);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !order) return <div className="text-center p-12">Orden de Compra no encontrada.</div>;
    
    // Determine quote list for display
    const allQuoteAttachments = order.quoteAttachments ? [...order.quoteAttachments] : [];
    if (order.quoteAttachment && allQuoteAttachments.length === 0) {
        allQuoteAttachments.push(order.quoteAttachment);
    }

    return (
        <div className="max-w-6xl mx-auto pb-12 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Orden {order.id}</h1>
                        <Badge text={order.status} />
                    </div>
                    <Link to="/purchase/orders" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Volver al pipeline
                    </Link>
                </div>
                
                {/* Action Buttons based on Status */}
                <div className="flex gap-2">
                    {needsApproval && isApprover ? (
                        <>
                            <button onClick={handleReject} className="bg-white border border-red-200 text-red-600 font-semibold py-2 px-4 rounded-lg hover:bg-red-50 transition-colors">Rechazar</button>
                            <button onClick={handleApprove} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">check</span> Aprobar Orden
                            </button>
                        </>
                    ) : (
                         order.status === PurchaseOrderStatus.Borrador && (
                             <button onClick={() => handleStatusChange(PurchaseOrderStatus.PorAprobar)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                                Solicitar Aprobación
                             </button>
                         )
                    )}
                     {!needsApproval && order.status !== PurchaseOrderStatus.Facturada && order.status !== PurchaseOrderStatus.Cancelada && (
                         <div className="relative group z-50">
                             <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2">
                                 Cambiar Estado <span className="material-symbols-outlined">expand_more</span>
                             </button>
                             <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 hidden group-hover:block z-50">
                                 {Object.values(PurchaseOrderStatus).map(s => (
                                     <button 
                                        key={s} 
                                        onClick={() => handleStatusChange(s)}
                                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                                     >
                                         {s}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>
            </div>

            {/* Pipeline Visualizer */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <div className="flex justify-between min-w-[600px]">
                    {PURCHASE_ORDERS_PIPELINE_COLUMNS.map((col, index) => {
                        const isActive = index === currentStageIndex;
                        const isPast = index < currentStageIndex;
                        return (
                            <div key={col.stage} className="flex flex-col items-center gap-2 flex-1 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border-2 transition-colors ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : (isPast ? 'bg-indigo-100 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400')}`}>
                                    {isPast ? <span className="material-symbols-outlined text-sm">check</span> : index + 1}
                                </div>
                                <span className={`text-xs font-medium text-center px-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>{col.stage}</span>
                                {index !== PURCHASE_ORDERS_PIPELINE_COLUMNS.length - 1 && (
                                    <div className={`absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 -z-0 ${index < currentStageIndex ? 'bg-indigo-200' : 'bg-slate-100'}`}></div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">factory</span>
                            Detalles
                        </h3>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Proveedor</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-base mt-1">{supplier?.name || 'Desconocido'}</p>
                                <p className="text-slate-600 dark:text-slate-400">{supplier?.address?.city}, {supplier?.address?.state}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Empresa Compradora</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1 font-medium">{issuingCompany?.name || 'No especificada'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Responsable</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1">{responsible?.name || 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Entrega Estimada</p>
                                <p className="text-slate-800 dark:text-slate-200 mt-1">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Pendiente'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">list_alt</span>
                            Productos
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Producto</th>
                                        <th className="p-3 text-right">Cant.</th>
                                        <th className="p-3 text-right">Costo Unit.</th>
                                        <th className="p-3 rounded-r-lg text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {order.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.productName || 'Producto'}</td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">{item.qty} {item.unit}</td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">${item.unitCost.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">${item.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                     {/* Payments Section */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">payments</span>
                                Historial de Pagos
                            </h3>
                            <button onClick={() => setIsPaymentDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-base">add</span> Registrar Pago
                            </button>
                        </div>
                        
                        {order.payments && order.payments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-500 dark:text-slate-400 uppercase text-xs">
                                        <tr>
                                            <th className="p-3 rounded-l-lg">Fecha</th>
                                            <th className="p-3">Método</th>
                                            <th className="p-3">Referencia</th>
                                            <th className="p-3 rounded-r-lg text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {order.payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="p-3 text-slate-700 dark:text-slate-300">{new Date(payment.date).toLocaleDateString()}</td>
                                                <td className="p-3 text-slate-700 dark:text-slate-300">{payment.method}</td>
                                                <td className="p-3 text-slate-500 dark:text-slate-400">{payment.reference || '-'}</td>
                                                <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">${payment.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                                <p className="text-sm">No se han registrado pagos.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Financial Summary */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Resumen</h3>
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                            <span>Subtotal</span>
                            <span>${(order.subtotal || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                            <span>IVA</span>
                            <span>${(order.tax || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-indigo-600 dark:text-indigo-400 border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                            <span>Total</span>
                            <span>${(order.total || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                         <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold pt-2">
                            <span>Pagado</span>
                            <span>${(order.paidAmount || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                         <div className="flex justify-between text-sm text-red-500 dark:text-red-400 font-semibold">
                            <span>Por Pagar</span>
                            <span>${((order.total || 0) - (order.paidAmount || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    
                     {/* Invoice Upload Section */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">receipt_long</span>
                            FACTURA FISCAL
                        </h3>
                         <div 
                            className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
                            onClick={() => invoiceInputRef.current?.click()}
                         >
                            <input 
                                type="file" 
                                ref={invoiceInputRef}
                                className="hidden" 
                                accept="image/*,.pdf,.xml"
                                onChange={handleSidebarInvoiceChange}
                                disabled={isUploading}
                            />
                             {isUploading ? (
                                 <Spinner />
                             ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl text-slate-400">upload_file</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                        Subir Factura (PDF/XML)
                                    </span>
                                </>
                             )}
                         </div>
                         
                         {/* Display Attachments */}
                         {allInvoices.length > 0 && (
                             <div className="mt-3 space-y-2">
                                 {allInvoices.map((att, index) => (
                                    <div key={att.id || index} className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="material-symbols-outlined text-blue-600">description</span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{att.name}</span>
                                                <span className="text-xs text-slate-500">{(att.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                        <a 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-medium"
                                        >
                                            Ver
                                        </a>
                                    </div>
                                 ))}
                             </div>
                         )}
                     </div>

                    {/* Quote Attachments (Multiple) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">COTIZACIONES DEL PROVEEDOR</h3>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {allQuoteAttachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="material-symbols-outlined text-red-500 text-lg">picture_as_pdf</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</p>
                                            <p className="text--[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <a 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 text-xs font-semibold text-indigo-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                    >
                                        Ver
                                    </a>
                                </div>
                            ))}
                            {allQuoteAttachments.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">No hay cotizaciones adjuntas.</p>
                            )}
                        </div>

                         {/* Add Button */}
                         <div className="mt-4 text-center">
                             <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleQuoteFileUpload}
                                disabled={isUploading}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex flex-col items-center w-full p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                                {isUploading ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-2xl mb-1">cloud_upload</span>
                                        Añadir Cotización
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <NotesSection 
                        entityId={id || ''}
                        entityType="salesOrder" // Reusing type for notes
                        notes={notesForSection}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
            </div>

             {/* Drawers / Modals */}
            
            {/* Payment Drawer */}
            <Drawer isOpen={isPaymentDrawerOpen} onClose={() => setIsPaymentDrawerOpen(false)} title="Registrar Pago">
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto</label>
                         <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">attach_money</span>
                            </div>
                            <input 
                                type="number" 
                                value={paymentForm.amount} 
                                onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Pago</label>
                        <input 
                            type="date" 
                            value={paymentForm.date} 
                            onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Método</label>
                             <select 
                                value={paymentForm.method} 
                                onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                             >
                                 <option>Transferencia</option>
                                 <option>Cheque</option>
                                 <option>Tarjeta Crédito</option>
                                 <option>Efectivo</option>
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referencia</label>
                             <input 
                                type="text" 
                                value={paymentForm.reference} 
                                onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
                                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                                placeholder="Folio bancario..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
                         <textarea 
                            value={paymentForm.notes} 
                            onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                            rows={3}
                            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsPaymentDrawerOpen(false)} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg">Cancelar</button>
                        <button onClick={handleAddPayment} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">Guardar Pago</button>
                    </div>
                 </div>
            </Drawer>

            {/* Invoice Upload Modal (Confirm & Close) */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-3xl">receipt_long</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Cerrar Orden (Facturada)</h3>
                            <p className="text-sm text-slate-500 mt-2">Para mover a <strong>Facturada</strong>, la orden debe estar pagada y es obligatorio adjuntar el archivo fiscal.</p>
                        </div>
                        
                        <div 
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                            onClick={() => modalInvoiceInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={modalInvoiceInputRef}
                                className="hidden" 
                                accept=".pdf,.xml"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setInvoiceFile(e.target.files[0]);
                                    }
                                }}
                            />
                             {invoiceFile ? (
                                 <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                                     <span className="material-symbols-outlined">check_circle</span>
                                     {invoiceFile.name}
                                 </div>
                             ) : (
                                 <div className="text-slate-500">
                                     <span className="material-symbols-outlined text-3xl mb-2">upload_file</span>
                                     <p className="text-sm font-medium">Haz clic para seleccionar archivo</p>
                                 </div>
                             )}
                         </div>

                         <div className="flex gap-3 mt-6">
                             <button 
                                onClick={() => { setIsInvoiceModalOpen(false); setInvoiceFile(null); }}
                                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleInvoiceUploadAndClose}
                                disabled={!invoiceFile || isUploading}
                                className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isUploading && <Spinner />}
                                {isUploading ? 'Subiendo...' : 'Guardar y Cerrar'}
                            </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderDetailPage;
