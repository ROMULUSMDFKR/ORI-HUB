
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../../hooks/useDoc';
import { useCollection } from '../../hooks/useCollection';
import { PurchaseOrder, Supplier, PurchaseOrderStatus, User, Attachment, InternalCompany, PurchasePayment, Note, Notification } from '../../types';
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
    const quoteInputRef = useRef<HTMLInputElement>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null); // Ref for Invoice Upload
    
    // Payment Drawer State
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'Transferencia', reference: '', notes: '' });

    // Invoice Upload Modal State
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Active Tab
    const [activeTab, setActiveTab] = useState<'General' | 'Pagos'>('General');

    useEffect(() => {
        if (initialOrder) setOrder(initialOrder);
    }, [initialOrder]);

    const loading = orderLoading || suppliersLoading || usersLoading;

    const supplier = useMemo(() => suppliers?.find(s => s.id === order?.supplierId), [order, suppliers]);
    const responsible = useMemo(() => users?.find(u => u.id === order?.responsibleId), [order, users]);
    const approver = useMemo(() => users?.find(u => u.id === order?.approverId), [order, users]);
    const issuingCompany = useMemo(() => internalCompanies?.find(c => c.id === order?.issuingCompanyId), [order, internalCompanies]);

    // Hack: Using salesOrderId field in Note for purchase order ID to reuse NotesSection
    const notesForSection = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes.filter(n => n.salesOrderId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);


    // --- STATUS MANAGEMENT ---
    const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
        if (!order || !id) return;

        // Requirement: Request Invoice when changing to Facturada
        if (newStatus === PurchaseOrderStatus.Facturada && !order.invoiceAttachment) {
            setIsInvoiceModalOpen(true);
            return;
        }

        try {
            await api.updateDoc('purchaseOrders', id, { status: newStatus });
            setOrder({ ...order, status: newStatus });
            showToast('success', `Estado actualizado a: ${newStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            showToast('error', "Error al actualizar el estado.");
        }
    };

    // --- INVOICE UPLOAD & CLOSE ---
    const handleInvoiceUploadAndClose = async () => {
        if (!invoiceFile || !order || !id) {
            showToast('warning', 'Debes seleccionar el archivo de la factura.');
            return;
        }

        setIsUploading(true);
        try {
            const url = await api.uploadFile(invoiceFile, `purchase_orders/${id}/invoice`);
            const attachment: Attachment = {
                id: `inv-${Date.now()}`,
                name: invoiceFile.name,
                size: invoiceFile.size,
                url: url
            };

            // Update order with Invoice AND Status
            await api.updateDoc('purchaseOrders', id, { 
                invoiceAttachment: attachment,
                status: PurchaseOrderStatus.Facturada
            });

            setOrder(prev => prev ? ({ 
                ...prev, 
                invoiceAttachment: attachment, 
                status: PurchaseOrderStatus.Facturada 
            }) : null);

            showToast('success', 'Factura subida y orden cerrada exitosamente.');
            setIsInvoiceModalOpen(false);
            setInvoiceFile(null);

        } catch (error) {
            console.error("Error uploading invoice:", error);
            showToast('error', 'Error al subir la factura.');
        } finally {
            setIsUploading(false);
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

    // --- QUOTE FILE UPLOAD (Multiple) ---
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

    // --- NOTES LOGIC WITH MENTIONS ---
    const handleNoteAdded = async (note: Note) => {
        try {
            const noteWithId = { ...note, salesOrderId: id }; // Reuse field
            await api.addDoc('notes', noteWithId);
            
            // Check for mentions
            const mentionMatch = note.text.match(/@(\w+)/g);
            if (mentionMatch && users) {
                const mentionedNames = mentionMatch.map(m => m.substring(1).toLowerCase());
                const mentionedUsers = users.filter(u => mentionedNames.includes(u.name.toLowerCase().split(' ')[0].toLowerCase()) || mentionedNames.includes(u.name.toLowerCase()));
                
                for (const user of mentionedUsers) {
                     if (user.id === currentUser?.id) continue;
                     const notification: Omit<Notification, 'id'> = {
                        userId: user.id,
                        title: 'Mención en Orden de Compra',
                        message: `${currentUser?.name} te mencionó en la OC ${order?.id}`,
                        type: 'message',
                        link: `/purchase/orders/${id}`,
                        isRead: false,
                        createdAt: new Date().toISOString()
                     };
                     await api.addDoc('notifications', notification);
                }
            }

            showToast('success', 'Nota agregada.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error al guardar nota.');
        }
    };
    
    const handleNoteUpdated = async (noteId: string, newText: string) => {
         try {
            await api.updateDoc('notes', noteId, { text: newText });
            showToast('success', 'Nota actualizada.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error al actualizar nota.');
        }
    }


    // --- PIPELINE VISUALIZATION ---
    const currentStageIndex = PURCHASE_ORDERS_PIPELINE_COLUMNS.findIndex(col => col.stage === order?.status);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !order) return <div className="text-center p-12">Orden de Compra no encontrada.</div>;
    
    const balance = order.total - order.paidAmount;
    
    // Normalize quotes for display (legacy + new array)
    const allQuoteAttachments = order.quoteAttachments ? [...order.quoteAttachments] : [];
    if (order.quoteAttachment && allQuoteAttachments.length === 0) {
        allQuoteAttachments.push(order.quoteAttachment);
    }

    return (
        <div className="max-w-5xl mx-auto pb-12 space-y-6">
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
                             <button onClick={() => handleStatusChange(PurchaseOrderStatus.PorAprobar)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm">
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

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('General')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'General' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>General</button>
                    <button onClick={() => setActiveTab('Pagos')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Pagos' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Pagos y Anticipos</button>
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {activeTab === 'General' ? (
                        <>
                            {/* Supplier & Details Card */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">factory</span>
                                    Detalles de la Orden
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
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Responsable Interno</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-1">{responsible?.name || 'N/A'}</p>
                                    </div>
                                     <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Entrega Estimada</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-1">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Pendiente'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
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
                        </>
                    ) : (
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
                                                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">${payment.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">account_balance_wallet</span>
                                    <p className="text-slate-500 dark:text-slate-400">No se han registrado pagos para esta orden.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                         <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Resumen Financiero</h3>
                            <div className="space-y-2 text-sm text-indigo-100">
                                <div className="flex justify-between"><span>Subtotal</span> <span>${(order.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                                <div className="flex justify-between"><span>Impuestos</span> <span>${(order.tax || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                                <div className="flex justify-between text-lg font-bold border-t border-indigo-700/50 pt-3 mt-2 text-white">
                                    <span>Total</span>
                                    <span>${(order.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-emerald-300 pt-2">
                                    <span>Pagado</span>
                                    <span>${(order.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-indigo-700/50 mt-2">
                                    <span>Por Pagar</span>
                                    <span>${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative blob */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                    </div>
                    
                    {/* Approver Info */}
                    {approver && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Aprobación Requerida</h3>
                             <div className="flex items-center gap-3">
                                <img src={approver.avatarUrl} alt={approver.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{approver.name}</p>
                                    <p className="text-xs text-slate-500">Aprobador asignado</p>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {/* Invoice Attachment */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                         <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2">
                             <span className="material-symbols-outlined text-base">receipt</span> Factura Fiscal
                         </h3>
                         {order.invoiceAttachment ? (
                              <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                                 <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="material-symbols-outlined text-green-600">description</span>
                                     <div className="flex flex-col min-w-0">
                                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{order.invoiceAttachment.name}</span>
                                         <span className="text-xs text-slate-500">{(order.invoiceAttachment.size / 1024).toFixed(1)} KB</span>
                                     </div>
                                 </div>
                                 <a href={order.invoiceAttachment.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Ver</a>
                             </div>
                         ) : (
                             <p className="text-sm text-slate-400 italic">Pendiente de facturación</p>
                         )}
                     </div>

                    {/* Quote Attachment Card */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">COTIZACIONES DEL PROVEEDOR</h3>
                        
                        <div className="space-y-2 flex-1 mb-4">
                            {allQuoteAttachments.map((att, index) => (
                                <div key={att.id || index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2 rounded-lg">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                         <span className="material-symbols-outlined text-red-500 text-2xl">picture_as_pdf</span>
                                         <div className="flex flex-col min-w-0">
                                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{att.name}</span>
                                             <span className="text-[10px] text-slate-500">{(att.size / 1024).toFixed(1)} KB</span>
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
                             {/* Placeholder for empty state to maintain height */}
                             {allQuoteAttachments.length === 0 && (
                                 <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
                                     <p className="text-xs text-slate-400">No hay cotizaciones.</p>
                                 </div>
                             )}
                        </div>

                        <div className="flex justify-center">
                             <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleQuoteFileUpload}
                                disabled={isUploading}
                                ref={quoteInputRef} 
                            />
                             <button 
                                onClick={() => quoteInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex flex-col items-center text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                                {isUploading ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-3xl mb-1">cloud_upload</span>
                                        <span className="text-sm font-medium">Añadir Cotización</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Notes Section (Updated to allow editing and mentions) */}
                    <NotesSection 
                        entityId={id || ''}
                        entityType="salesOrder" // Reusing this for simplicity, see Note logic above
                        notes={notesForSection}
                        onNoteAdded={handleNoteAdded}
                        onNoteUpdated={handleNoteUpdated}
                    />
                </div>
            </div>
            
            {/* Payment Drawer */}
            <Drawer isOpen={isPaymentDrawerOpen} onClose={() => setIsPaymentDrawerOpen(false)} title="Registrar Pago">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">attach_money</span>
                            </div>
                            <input 
                                type="number" 
                                value={paymentForm.amount} 
                                onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})} 
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Saldo pendiente: ${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                        <input 
                            type="date" 
                            value={paymentForm.date} 
                            onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                            className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 sm:text-sm"
                        />
                    </div>
                    
                    <CustomSelect 
                        label="Método de Pago"
                        options={[{value: 'Transferencia', name: 'Transferencia'}, {value: 'Cheque', name: 'Cheque'}, {value: 'Efectivo', name: 'Efectivo'}, {value: 'Tarjeta', name: 'Tarjeta'}]}
                        value={paymentForm.method}
                        onChange={val => setPaymentForm({...paymentForm, method: val})}
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referencia / Comprobante</label>
                        <input 
                            type="text" 
                            value={paymentForm.reference} 
                            onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} 
                            className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 sm:text-sm"
                            placeholder="# Autorización o folio"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
                        <textarea 
                            rows={3}
                            value={paymentForm.notes} 
                            onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} 
                            className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 sm:text-sm"
                            placeholder="Comentarios adicionales..."
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsPaymentDrawerOpen(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                        <button onClick={handleAddPayment} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar Pago</button>
                    </div>
                </div>
            </Drawer>

            {/* Invoice Upload Drawer */}
             <Drawer isOpen={isInvoiceModalOpen} onClose={() => { setIsInvoiceModalOpen(false); setInvoiceFile(null); }} title="Subir Factura para Cerrar Orden">
                 <div className="space-y-6">
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                         <div className="flex gap-3">
                             <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                             <p className="text-sm text-blue-800 dark:text-blue-300">
                                 Para marcar esta orden como <strong>Facturada</strong> y cerrarla administrativamente, es necesario adjuntar el archivo fiscal (PDF o XML) proporcionado por el proveedor.
                             </p>
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Archivo de Factura *</label>
                         <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer relative">
                             <input 
                                 type="file" 
                                 ref={invoiceInputRef}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                 accept=".pdf,.xml,image/*"
                                 onChange={(e) => { if(e.target.files) setInvoiceFile(e.target.files[0]); }}
                             />
                             <div className="flex flex-col items-center justify-center pointer-events-none">
                                 {invoiceFile ? (
                                     <>
                                         <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                                         <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{invoiceFile.name}</p>
                                         <p className="text-xs text-slate-500">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                                     </>
                                 ) : (
                                     <>
                                         <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                                         <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Haz clic o arrastra el archivo aquí</p>
                                         <p className="text-xs text-slate-500 mt-1">PDF, XML o Imagen</p>
                                     </>
                                 )}
                             </div>
                         </div>
                     </div>

                     <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                         <button 
                            onClick={() => { setIsInvoiceModalOpen(false); setInvoiceFile(null); }} 
                            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg"
                        >
                            Cancelar
                        </button>
                         <button 
                            onClick={handleInvoiceUploadAndClose} 
                            disabled={!invoiceFile || isUploading}
                            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUploading ? <Spinner /> : <span className="material-symbols-outlined">check</span>}
                            Subir y Finalizar
                        </button>
                     </div>
                 </div>
             </Drawer>
        </div>
    );
};

export default PurchaseOrderDetailPage;
