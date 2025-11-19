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
         try {
            await api.updateDoc('samples', id, { status: currentSample.status });
            addActivityLog('Cambio de Estado', `Estado de la muestra actualizado a "${currentSample.status}"`, id);
            showToast('success', `Estado de la muestra actualizado a: ${currentSample.status}`);
         } catch (error) {
             console.error("Error updating sample status:", error);
             showToast('error', "Error al actualizar el estado.");
         }
    }

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
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
            setCurrentSample(prev => prev ? { ...prev } : null);
        }
    };

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const { recipient, product, owner, notes, activities } = useMemo(() => {
        if (!currentSample) return { recipient: null, product: null, owner: null, notes: [], activities: [] };

        const rec = currentSample.prospectId 
            ? prospects?.find(p => p.id === currentSample.prospectId) 
            : companies?.find(c => c.id === currentSample.companyId);
        
        const prod = products?.find(p => p.id === currentSample.productId);
        const ownr = usersMap.get(currentSample.ownerId);

        const sampleNotes = (allNotes || []).filter(n => n.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const sampleActivities = (allActivities || []).filter(a => a.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { recipient: rec, product: prod, owner: ownr, notes: sampleNotes, activities: sampleActivities };
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
                     <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                </div>
            </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
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
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.name} &bull; {new Date(activity.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )
                            }) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No hay actividad para esta muestra.</p>}
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
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow label="Fecha Solicitud" value={new Date(currentSample.requestDate).toLocaleDateString()} />
                    </InfoCard>
                </div>
             </div>
        </div>
    );
};

export default SampleDetailPage;