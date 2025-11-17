import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Sample, SampleStatus, Prospect, Company, Product, Note, ActivityLog } from '../types';
import { SAMPLES_PIPELINE_COLUMNS } from '../constants';
import { MOCK_USERS } from '../data/mockData';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';

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

    // Fetch related data
    const { data: prospects, loading: prospectsLoading } = useCollection<Prospect>('prospects');
    const { data: companies, loading: companiesLoading } = useCollection<Company>('companies');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    const { data: allActivities, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
    
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (sample) {
            setCurrentSample(sample);
            // Assuming feedback might be stored in a note with a specific tag/type in a real app
            const feedbackNote = allNotes?.find(n => n.sampleId === sample.id && n.text.startsWith("Feedback:"));
            if(feedbackNote) setFeedback(feedbackNote.text.replace("Feedback:", "").trim());
        }
    }, [sample, allNotes]);

    const handleStatusChange = (newStatus: SampleStatus) => {
        if (!currentSample) return;
        setCurrentSample(prev => prev ? { ...prev, status: newStatus } : null);
    };
    
    const handleSaveStatus = () => {
         if (!currentSample) return;
         // Here you would call an API to save the status change
         alert(`Estado de la muestra guardado como: ${currentSample.status}`);
    }

    const handleSaveFeedback = () => {
        if(!currentSample || !feedback.trim()) return;
        alert(`Feedback guardado: "${feedback}"`);
        // In a real app, you would likely save this as a special note or activity
    }

    const handleNoteAdded = (note: Note) => {
        // This is a hack for mock data. In a real app, a state management library or context would handle this.
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
            // Trigger a re-render of useMemo by creating a new object reference
            setCurrentSample(prev => prev ? { ...prev } : null);
        }
    };

    const { recipient, product, owner, notes, activities } = useMemo(() => {
        if (!currentSample) return { recipient: null, product: null, owner: null, notes: [], activities: [] };

        const rec = currentSample.prospectId 
            ? prospects?.find(p => p.id === currentSample.prospectId) 
            : companies?.find(c => c.id === currentSample.companyId);
        
        const prod = products?.find(p => p.id === currentSample.productId);
        const ownr = MOCK_USERS[currentSample.ownerId];

        const sampleNotes = (allNotes || []).filter(n => n.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const sampleActivities = (allActivities || []).filter(a => a.sampleId === currentSample.id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { recipient: rec, product: prod, owner: ownr, notes: sampleNotes, activities: sampleActivities };
    }, [currentSample, prospects, companies, products, allNotes, allActivities]);
    
    const loading = sampleLoading || prospectsLoading || companiesLoading || productsLoading || notesLoading || activitiesLoading;
    
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
                         <CustomSelect options={statusOptions} value={currentSample.status || ''} onChange={val => handleStatusChange(val as SampleStatus)} />
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
                                const user = MOCK_USERS[activity.userId];
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
                                        to={currentSample.prospectId ? `/crm/prospects/${recipient.id}` : `/crm/clients/${recipient.id}`}
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