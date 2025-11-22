
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Sample, SampleStatus, Prospect, Company, Product, Note, ActivityLog, User } from '../types';
import { SAMPLES_PIPELINE_COLUMNS } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Drawer from '../components/ui/Drawer';

// Reusable components from other detail pages
const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-slate-800 dark:text-slate-200 text-right">{value}</dd>
    </div>
);

const SampleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: sample, loading: sampleLoading, error } = useDoc<Sample>('samples', id || '');
    const [currentSample, setCurrentSample] = useState<Sample | null>(null);
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    // Shipping States
    const [isShippingDrawerOpen, setIsShippingDrawerOpen] = useState(false);
    const [shippingData, setShippingData] = useState({
        deliveryType: 'Paquetería' as 'Local' | 'Paquetería',
        carrier: '',
        trackingNumber: '',
        trackingUrl: ''
    });

    // Closure/Approval Reason States
    const [isClosureDrawerOpen, setIsClosureDrawerOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<SampleStatus | null>(null);
    const [closureReason, setClosureReason] = useState('');


    // Fetch related data
    const { data: prospects, loading: prospectsLoading } = useCollection<Prospect>('prospects');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    const { data: allActivities, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (sample) {
            setCurrentSample(sample);
            // Try to find feedback in existing notes
            const feedbackNote = allNotes?.find(n => n.sampleId === sample.id && n.text.startsWith("Feedback:"));
            if(feedbackNote) setFeedback(feedbackNote.text.replace("Feedback:", "").trim());
        }
    }, [sample, allNotes]);
    
    const addActivityLog = async (type: ActivityLog['type'], description: string, sampleId: string) => {
        if (!currentUser) return;
        const log: Omit<ActivityLog, 'id'> = { sampleId, type, description, userId: currentUser.id, createdAt: new Date().toISOString() };
        try {
            await api.addDoc('activities', log);
        } catch (error) {
            console.error("Error adding activity log:", error);
        }
    };

    const handleSaveStatus = async () => {
         if (!currentSample || !id || currentSample.status === sample?.status) return;
         
         // Intercept if changing to Enviada to ask for tracking details
         if (currentSample.status === SampleStatus.Enviada && sample?.status !== SampleStatus.Enviada) {
             setIsShippingDrawerOpen(true);
             return;
         }
         
         // Intercept for Closure or Approval to ask for reason
         if (currentSample.status === SampleStatus.Cerrada || currentSample.status === SampleStatus.Aprobada) {
             if (sample?.status !== currentSample.status) {
                 setPendingStatus(currentSample.status);
                 setClosureReason('');
                 setIsClosureDrawerOpen(true);
                 return;
             }
         }

         try {
            await api.updateDoc('samples', id, { status: currentSample.status });
            addActivityLog('Cambio de Estado', `Estado de la muestra actualizado a "${currentSample.status}"`, id);
            showToast('success', `Estado de la muestra actualizado a: ${currentSample.status}`);
         } catch (error) {
             console.error("Error updating sample status:", error);
             showToast('error', "Error al actualizar el estado.");
         }
    }
    
    const handleConfirmClosure = async () => {
        if (!currentSample || !id || !pendingStatus) return;
        if (!closureReason.trim()) {
            showToast('warning', 'Debes indicar un motivo.');
            return;
        }

        try {
            const updates = {
                status: pendingStatus,
                closureReason: closureReason,
                closureDate: new Date().toISOString()
            };
            await api.updateDoc('samples', id, updates);
            
            const actionText = pendingStatus === SampleStatus.Aprobada ? 'aprobada' : 'cerrada';
            addActivityLog('Cambio de Estado', `Muestra ${actionText}. Motivo: ${closureReason}`, id);
            
            setCurrentSample(prev => prev ? ({...prev, ...updates}) : null);
            showToast('success', `Muestra ${actionText} correctamente. Se archivará en 24 horas.`);
            setIsClosureDrawerOpen(false);
        } catch (error) {
            console.error("Error confirming closure:", error);
            showToast('error', "Error al guardar la información de cierre.");
        }
    };

    const handleConfirmShipping = async () => {
        if (!currentSample || !id) return;

        // Validate
        if (shippingData.deliveryType === 'Paquetería') {
            if (!shippingData.carrier.trim() || !shippingData.trackingNumber.trim()) {
                showToast('warning', 'Para envíos por paquetería, debes indicar la empresa y el número de guía.');
                return;
            }
        }

        try {
            const updates = {
                status: SampleStatus.Enviada,
                deliveryType: shippingData.deliveryType,
                carrier: shippingData.deliveryType === 'Paquetería' ? shippingData.carrier : '',
                trackingNumber: shippingData.deliveryType === 'Paquetería' ? shippingData.trackingNumber : '',
                trackingUrl: shippingData.deliveryType === 'Paquetería' ? shippingData.trackingUrl : ''
            };

            await api.updateDoc('samples', id, updates);
            addActivityLog('Cambio de Estado', `Muestra enviada vía ${shippingData.deliveryType}. ${shippingData.carrier ? `(${shippingData.carrier})` : ''}`, id);
            
            // Update local state completely
            setCurrentSample(prev => prev ? ({...prev, ...updates}) : null);
            
            showToast('success', 'Muestra marcada como enviada con detalles de rastreo.');
            setIsShippingDrawerOpen(false);

        } catch (error) {
            console.error("Error saving shipping details:", error);
            showToast('error', "Error al guardar detalles de envío.");
        }
    };

    const handleSaveFeedback = async () => {
        if(!currentSample || !feedback.trim() || !currentUser) return;
        
        try {
            const note: Omit<Note, 'id'> = {
                sampleId: currentSample.id,
                text: `Feedback: ${feedback}`,
                userId: currentUser.id,
                createdAt: new Date().toISOString(),
            } as Omit<Note, 'id'>;

            await api.addDoc('notes', note);
            showToast('success', "Feedback guardado correctamente.");
        } catch (error) {
            console.error("Error saving feedback:", error);
            showToast('error', "Error al guardar el feedback.");
        }
    }

    const handleNoteAdded = (note: Note) => {
        // Optimistic update is handled by useCollection listening to 'notes'
    };

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const { recipient, product, owner, creator, notes, activities } = useMemo(() => {
        if (!currentSample) return { recipient: null, product: null, owner: null, creator: null, notes: [], activities: [] };

        const rec = currentSample.prospectId 
            ? prospects?.find(p => p.id === currentSample.prospectId) 
            : companies?.find(c => c.id === currentSample.companyId);
        
        const prod = products?.find(p => p.id === currentSample.productId);
        const ownr = usersMap.get(currentSample.ownerId);
        const crtr = currentSample.createdById ? usersMap.get(currentSample.createdById) : null;

        const sampleNotes = (allNotes || []).filter(n => n.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const sampleActivities = (allActivities || []).filter(a => a.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { recipient: rec, product: prod, owner: ownr, creator: crtr, notes: sampleNotes, activities: sampleActivities };
    }, [currentSample, prospects, companies, products, allNotes, allActivities, usersMap]);
    
    const loading = sampleLoading || prospectsLoading || companiesLoading || productsLoading || notesLoading || activitiesLoading || usersLoading;
    
    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentSample) return <div className="text-center p-12">Muestra no encontrada</div>;
    
    const statusOptions = SAMPLES_PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Muestra: {currentSample.name}</h1>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-full md:w-48">
                         <CustomSelect options={statusOptions} value={currentSample.status || ''} onChange={val => setCurrentSample(s => s ? {...s, status: val as SampleStatus} : null)} />
                    </div>
                     <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar Estado</button>
                </div>
            </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Closure/Approval Info - Visible if closed/approved */}
                    {(currentSample.status === SampleStatus.Cerrada || currentSample.status === SampleStatus.Aprobada) && currentSample.closureReason && (
                         <div className={`p-4 rounded-xl border ${currentSample.status === SampleStatus.Aprobada ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                             <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${currentSample.status === SampleStatus.Aprobada ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                <span className="material-symbols-outlined">{currentSample.status === SampleStatus.Aprobada ? 'check_circle' : 'cancel'}</span>
                                Muestra {currentSample.status}
                             </h3>
                             <p className="text-sm font-semibold">Motivo:</p>
                             <p className="text-sm mb-2">{currentSample.closureReason}</p>
                             <p className="text-xs opacity-70">Fecha: {new Date(currentSample.closureDate || '').toLocaleString()}</p>
                             <p className="text-xs opacity-70 mt-1 italic">Esta muestra se archivará automáticamente 24 horas después de la fecha de cierre.</p>
                         </div>
                    )}

                    {/* Shipping Info Card - Visible when Sent */}
                    {(currentSample.status === SampleStatus.Enviada || currentSample.status === SampleStatus.Recibida || currentSample.status === SampleStatus.ConFeedback || currentSample.status === SampleStatus.Cerrada || currentSample.status === SampleStatus.Aprobada) && (
                         <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl shadow-sm">
                             <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined">local_shipping</span>
                                Información de Envío
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <InfoRow label="Tipo de Entrega" value={currentSample.deliveryType || 'No especificado'} />
                                {currentSample.deliveryType === 'Paquetería' && (
                                    <>
                                        <InfoRow label="Paquetería" value={currentSample.carrier || '-'} />
                                        <InfoRow label="No. Guía" value={currentSample.trackingNumber ? <span className="font-mono font-bold">{currentSample.trackingNumber}</span> : '-'} />
                                        {currentSample.trackingUrl && (
                                             <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-sm md:col-span-2">
                                                <dt className="font-medium text-slate-500 dark:text-slate-400">Rastreo</dt>
                                                <dd className="text-right">
                                                    <a href={currentSample.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                                        Ver estado del envío <span className="material-symbols-outlined !text-sm">open_in_new</span>
                                                    </a>
                                                </dd>
                                            </div>
                                        )}
                                    </>
                                )}
                             </div>
                             {currentSample.status === SampleStatus.Enviada && (
                                 <div className="mt-4 text-right">
                                     <button 
                                        onClick={() => setIsShippingDrawerOpen(true)}
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                     >
                                         Editar detalles de envío
                                     </button>
                                 </div>
                             )}
                         </div>
                    )}

                    <InfoCard title="Feedback de la Muestra">
                        <textarea
                            rows={5}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Añade aquí los comentarios del cliente sobre la muestra..."
                            className="w-full"
                        />
                         <div className="text-right">
                            <button onClick={handleSaveFeedback} className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg text-sm shadow-sm hover:bg-indigo-700">Guardar Feedback</button>
                        </div>
                    </InfoCard>

                    <NotesSection 
                        entityId={currentSample.id}
                        entityType="sample"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />

                    <InfoCard title="Actividad Reciente">
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {activities.length > 0 ? activities.map(activity => {
                                const user = usersMap.get(activity.userId);
                                const iconMap: Record<ActivityLog['type'], string> = { 'Llamada': 'call', 'Email': 'email', 'Reunión': 'groups', 'Nota': 'note', 'Vista de Perfil': 'visibility', 'Análisis IA': 'auto_awesome', 'Cambio de Estado': 'change_circle', 'Sistema': 'dns' };
                                return (
                                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                                        <span className="material-symbols-outlined text-slate-500 mt-1">{iconMap[activity.type]}</span>
                                        <div className="flex-1">
                                            <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.name || 'Sistema'} &bull; {new Date(activity.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )
                            }) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No hay actividad registrada para esta muestra.</p>}
                        </div>
                    </InfoCard>

                </div>

                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Detalles">
                        <InfoRow 
                            label="Destinatario" 
                            value={
                                recipient ? (
                                    <Link 
                                        to={currentSample.prospectId ? `/hubs/prospects/${recipient.id}` : `/crm/clients/${recipient.id}`}
                                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        {(recipient as any).shortName || recipient.name}
                                    </Link>
                                ) : 'N/A'
                            }
                        />
                        <InfoRow 
                            label="Producto"
                            value={product ? <Link to={`/products/${product.id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{product.name}</Link> : 'N/A'}
                        />
                        <InfoRow label="Fecha Solicitud" value={new Date(currentSample.requestDate).toLocaleDateString()} />
                    </InfoCard>
                    
                    <InfoCard title="Responsables">
                        <InfoRow label="Responsable Envío" value={
                            owner ? (
                                <div className="flex items-center justify-end gap-2">
                                    <img src={owner.avatarUrl} className="w-5 h-5 rounded-full"/>
                                    {owner.name}
                                </div>
                            ) : 'N/A'
                        } />
                        <InfoRow label="Creado por" value={creator?.name || 'Desconocido'} />
                    </InfoCard>
                </div>
             </div>

             {/* Shipping Details Drawer */}
             <Drawer isOpen={isShippingDrawerOpen} onClose={() => setIsShippingDrawerOpen(false)} title="Registrar Envío">
                 <div className="space-y-6">
                     <p className="text-sm text-slate-600 dark:text-slate-400">
                         La muestra se marcará como <strong>Enviada</strong>. Por favor, ingresa los detalles de logística.
                     </p>
                     
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Entrega</label>
                        <div className="flex gap-4">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="radio" 
                                    name="deliveryType" 
                                    checked={shippingData.deliveryType === 'Local'} 
                                    onChange={() => setShippingData(prev => ({...prev, deliveryType: 'Local'}))}
                                    className="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                 />
                                 <span className="text-sm text-slate-700 dark:text-slate-200">Entrega Local / Personal</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="radio" 
                                    name="deliveryType" 
                                    checked={shippingData.deliveryType === 'Paquetería'} 
                                    onChange={() => setShippingData(prev => ({...prev, deliveryType: 'Paquetería'}))}
                                    className="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                 />
                                 <span className="text-sm text-slate-700 dark:text-slate-200">Paquetería Externa</span>
                             </label>
                        </div>
                     </div>

                     {shippingData.deliveryType === 'Paquetería' && (
                         <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Paquetería / Transportista <span className="text-red-500">*</span></label>
                                 <input 
                                    type="text" 
                                    value={shippingData.carrier} 
                                    onChange={e => setShippingData(prev => ({...prev, carrier: e.target.value}))}
                                    className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg py-2 px-3 text-sm"
                                    placeholder="Ej. DHL, FedEx, Estafeta"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de Guía / Tracking <span className="text-red-500">*</span></label>
                                 <input 
                                    type="text" 
                                    value={shippingData.trackingNumber} 
                                    onChange={e => setShippingData(prev => ({...prev, trackingNumber: e.target.value}))}
                                    className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg py-2 px-3 text-sm"
                                    placeholder="Ej. 1234567890"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vínculo de Rastreo (Opcional)</label>
                                 <input 
                                    type="url" 
                                    value={shippingData.trackingUrl} 
                                    onChange={e => setShippingData(prev => ({...prev, trackingUrl: e.target.value}))}
                                    className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg py-2 px-3 text-sm"
                                    placeholder="https://..."
                                 />
                             </div>
                         </div>
                     )}

                     <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsShippingDrawerOpen(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleConfirmShipping} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Confirmar Envío</button>
                     </div>
                 </div>
             </Drawer>

             {/* Closure / Approval Reason Drawer */}
             <Drawer 
                isOpen={isClosureDrawerOpen} 
                onClose={() => { setIsClosureDrawerOpen(false); setPendingStatus(null); }}
                title={pendingStatus === SampleStatus.Aprobada ? "Aprobar Muestra" : "Cerrar / Rechazar Muestra"}
             >
                 <div className="space-y-6">
                     <p className="text-sm text-slate-600 dark:text-slate-400">
                         {pendingStatus === SampleStatus.Aprobada 
                            ? "Al marcar la muestra como aprobada, confirma que el cliente está satisfecho y se archivará en 24 horas." 
                            : "Al cerrar la muestra (no aprobada), indica el motivo del rechazo o cancelación. Se archivará en 24 horas."}
                     </p>
                     
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {pendingStatus === SampleStatus.Aprobada ? "Comentarios de Aprobación" : "Motivo de Cierre / Rechazo"} <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            rows={4}
                            value={closureReason}
                            onChange={(e) => setClosureReason(e.target.value)}
                            placeholder={pendingStatus === SampleStatus.Aprobada ? "Ej: Cliente validó calidad y precio..." : "Ej: No cumplió con especificación técnica..."}
                            className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                     </div>
                     
                     <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => { setIsClosureDrawerOpen(false); setPendingStatus(null); }} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleConfirmClosure} className={`text-white font-semibold py-2 px-4 rounded-lg shadow-sm ${pendingStatus === SampleStatus.Aprobada ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            Confirmar {pendingStatus === SampleStatus.Aprobada ? 'Aprobación' : 'Cierre'}
                        </button>
                     </div>
                 </div>
             </Drawer>
        </div>
    );
};

export default SampleDetailPage;