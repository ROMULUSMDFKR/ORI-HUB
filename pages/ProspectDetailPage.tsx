import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Prospect, Note, ActivityLog, Contact, Company, CompanyPipelineStage, ProspectStage, Quote, Sample, Priority } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS, api } from '../data/mockData';
import ActivityDrawer from '../components/crm/ActivityDrawer';
import { GoogleGenAI } from '@google/genai';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { PIPELINE_COLUMNS } from '../constants';


// --- Reusable UI Components ---

const WavyBg: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full opacity-10">
      <path d="M-50,20 C100,100 200,-50 350,50 L350,150 L-50,150 Z" fill="currentColor" />
      <path d="M-50,50 C100,-50 200,100 350,20 L350,150 L-50,150 Z" fill="currentColor" opacity="0.5"/>
    </svg>
);

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').map((line, i) => {
        const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('### ')) return <h3 key={i} className="text-md font-semibold mt-4 mb-2">{boldedLine.substring(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{boldedLine.substring(3)}</h2>;
        if (line.startsWith('- ')) return <li key={i} className="list-disc ml-5" dangerouslySetInnerHTML={{ __html: boldedLine.substring(2) }}></li>;
        if (line.match(/^\d+\. /)) return <li key={i} className="list-decimal ml-5" dangerouslySetInnerHTML={{ __html: boldedLine.substring(line.indexOf(' ') + 1) }}></li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: boldedLine }} />;
    });

    return <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 space-y-2">{lines}</div>;
};

const SuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Cerrar">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const AlertsPanel: React.FC<{ alerts: string[] }> = ({ alerts }) => {
    if (alerts.length === 0) return null;
    return (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-yellow-500">warning</span>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">Alertas Inteligentes</p>
                    <ul className="list-disc ml-5 mt-1">
                        {alerts.map((alert, index) => (
                           <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">{alert}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</dd>
    </div>
);

const getPriorityBadgeColor = (priority?: Prospect['priority']) => {
    switch (priority) {
        case 'Alta': return 'red';
        case 'Media': return 'yellow';
        case 'Baja': return 'gray';
        default: return 'gray';
    }
};

const ActivityFeed: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call',
        'Email': 'email',
        'Reunión': 'groups',
        'Nota': 'note',
        'Vista de Perfil': 'visibility',
        'Análisis IA': 'auto_awesome',
        'Cambio de Estado': 'change_circle',
        'Sistema': 'dns'
    };
    
    if (!activities.length) {
        return (
            <InfoCard title="Actividad Reciente">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay actividades registradas.</p>
            </InfoCard>
        );
    }
    
    return (
        <InfoCard title="Actividad Reciente">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-8 ring-white dark:ring-slate-800">
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {activity.description} por <span className="font-medium text-slate-900 dark:text-slate-200">{MOCK_USERS[activity.userId]?.name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
                                            <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleDateString()}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </InfoCard>
    );
};

const ProspectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: initialProspect, loading, error } = useDoc<Prospect>('prospects', id || '');
    const { data: allContacts } = useCollection<Contact>('contacts');
    const { data: initialActivities } = useCollection<ActivityLog>('activities');
    const { data: quotes } = useCollection<Quote>('quotes');
    const { data: samples } = useCollection<Sample>('samples');
    const { data: allNotes } = useCollection<Note>('notes');
    
    const [prospect, setProspect] = useState<Prospect | null>(null);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestionError, setSuggestionError] = useState('');
    const [currentStage, setCurrentStage] = useState<ProspectStage | undefined>();

    useEffect(() => {
        if(initialProspect) {
            setProspect(initialProspect);
            setCurrentStage(initialProspect.stage);
        }
    }, [initialProspect]);


    useEffect(() => {
        if (initialActivities && id) {
            const filtered = initialActivities
                .filter(a => a.prospectId === id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActivities(filtered);
        }
    }, [initialActivities, id]);

    const handleAddActivity = (newActivity: ActivityLog) => {
        setActivities(prev => [newActivity, ...prev]);
    };

    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
            setProspect(prev => prev ? { ...prev } : null);
        }
    };
    
    const handleSaveStatus = () => {
        if (currentStage && prospect) {
            setProspect(p => p ? { ...p, stage: currentStage } : null);
            alert('Estado del prospecto guardado.');
        }
    };

    const prospectNotes = useMemo(() => {
        return (allNotes || [])
            .filter(n => n.prospectId === id)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const involvedContacts = useMemo(() => {
        return allContacts?.filter(c => c.prospectId === id) || [];
    }, [allContacts, id]);

    const prospectAnalysis = useMemo(() => {
        if (!prospect || !activities) return null;
        
        const lastActivityDays = prospect.lastInteraction ? (new Date().getTime() - new Date(prospect.lastInteraction.date).getTime()) / (1000 * 3600 * 24) : 999;
        
        const recencyScore = Math.max(0, 100 - lastActivityDays * 5); 
        const frequencyScore = Math.min(50, activities.length * 5);
        const engagementScoreValue = Math.round((recencyScore * 0.7) + (frequencyScore * 0.3));
        const engagementScoreLabel = engagementScoreValue > 75 ? 'Caliente' : engagementScoreValue > 40 ? 'Tibio' : 'Frío';

        const alerts: string[] = [];
        if (lastActivityDays > 15) alerts.push(`Sin contacto en ${Math.floor(lastActivityDays)} días.`);
        if (!prospect.nextAction) alerts.push(`No hay una próxima acción programada.`);
        else if (new Date(prospect.nextAction.dueDate) < new Date()) alerts.push(`La próxima acción está vencida.`);

        return {
            engagementScore: { score: engagementScoreValue, label: engagementScoreLabel },
            alerts,
        }
    }, [prospect, activities]);

    const handleSuggestAction = async () => {
        if (!prospect || !prospectAnalysis) return;
        setIsSuggestionModalOpen(true);
        setSuggestionLoading(true);
        setSuggestion('');
        setSuggestionError('');

        try {
            const context = `
                Prospecto: ${prospect.name}
                Etapa: ${prospect.stage}
                Valor Estimado: $${prospect.estValue}
                Prioridad: ${prospect.priority}
                Puntuación de Engagement: ${prospectAnalysis.engagementScore.score}/100 (${prospectAnalysis.engagementScore.label})
                Alertas Actuales: ${prospectAnalysis.alerts.join(', ') || 'Ninguna'}
                Últimas 3 actividades:
                ${activities.slice(0, 3).map(a => `- ${new Date(a.createdAt).toLocaleDateString()}: ${a.type} - ${a.description}`).join('\n')}
                Notas relevantes: ${prospect.notes || 'Sin notas principales.'}
            `;
            const prompt = `
                Eres un asistente de IA experto en análisis de datos para un CRM. Tu nombre es "Studio AI".
                Basado en el siguiente contexto de un prospecto, proporciona un análisis completo para el vendedor. Tu respuesta debe estar en español y formateada en Markdown. Incluye las siguientes secciones:
                1. **Resumen Ejecutivo (TL;DR):** Un párrafo corto que resuma el estado actual, el valor y la temperatura del prospecto (frío, tibio, caliente).
                2. **Puntos Clave:** Una lista de 2-3 puntos importantes extraídos del historial de notas y actividades.
                3. **Próxima Acción Sugerida:** Una sugerencia clara, accionable y con un "porqué".

                Contexto del Prospecto:
                ${context}

                Análisis del Prospecto:
            `;

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setSuggestion(response.text);

        } catch (error) {
            console.error("Error fetching suggestion:", error);
            setSuggestionError('No se pudo contactar al servicio de IA. Inténtalo de nuevo.');
        } finally {
            setSuggestionLoading(false);
        }
    };

    const handleConvertToClient = async () => {
        if (!prospect) return;
        if (!window.confirm(`¿Estás seguro de que quieres convertir a "${prospect.name}" en un cliente? Esta acción creará una nueva entidad de empresa.`)) {
            return;
        }

        const newCompany: Company = {
            id: `comp-${Date.now()}`,
            name: prospect.name,
            shortName: prospect.name,
            rfc: '',
            isActive: true,
            stage: CompanyPipelineStage.ClienteActivo,
            ownerId: prospect.ownerId,
            createdById: prospect.createdById,
            createdAt: new Date().toISOString(),
            priority: Priority.Media,
            industry: prospect.industry,
            productsOfInterest: prospect.productsOfInterest || [],
            deliveryAddresses: [],
        };
        
        await api.addDoc('companies', newCompany);

        const prospectQuotes = (quotes || []).filter(q => q.prospectId === prospect.id);
        for (const quote of prospectQuotes) {
            await api.updateDoc('quotes', quote.id, { companyId: newCompany.id, prospectId: undefined });
        }
        
        const prospectSamples = (samples || []).filter(s => s.prospectId === prospect.id);
        for (const sample of prospectSamples) {
             await api.updateDoc('samples', sample.id, { companyId: newCompany.id, prospectId: undefined });
        }
        
        await api.updateDoc('prospects', prospect.id, { stage: ProspectStage.Ganado });

        alert(`${prospect.name} ha sido convertido a cliente. Se ha transferido su historial.`);
        navigate(`/crm/clients/${newCompany.id}`);
    };


    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !prospect) return <div className="text-center p-12">Prospecto no encontrado</div>;
    
    const owner = Object.values(MOCK_USERS).find(u => u.id === prospect.ownerId);
    const creator = Object.values(MOCK_USERS).find(u => u.id === prospect.createdById);
    const stageOptions = PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{prospect.name}</h1>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mt-1">ID: {prospect.id}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-48">
                        <CustomSelect 
                            options={stageOptions}
                            value={currentStage || ''}
                            onChange={(newStage) => setCurrentStage(newStage as ProspectStage)}
                        />
                    </div>
                    <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">
                        Guardar
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    <div className="bg-indigo-600 text-white p-5 rounded-xl relative overflow-hidden shadow-lg">
                        <div className="text-white"><WavyBg /></div>
                        <div className="relative z-10">
                            <p className="mt-4 text-sm text-white/80">Valor Estimado</p>
                            <p className="text-4xl font-bold mt-1">${prospect.estValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                        </div>
                    </div>

                    {prospectAnalysis && <AlertsPanel alerts={prospectAnalysis.alerts} />}
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Datos Generales</h3>
                        <div className="space-y-1">
                            <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                            <InfoRow label="Creado por" value={`${creator?.name} el ${new Date(prospect.createdAt).toLocaleDateString()}`} />
                            <InfoRow label="Industria" value={prospect.industry || 'N/A'} />
                            <InfoRow label="Origen" value={prospect.origin || 'N/A'} />
                            {prospect.priority && <InfoRow label="Prioridad" value={<Badge text={prospect.priority} color={getPriorityBadgeColor(prospect.priority)} />} />}
                            {prospectAnalysis && <InfoRow label="Puntuación de Engagement" value={<span className="font-semibold">{`${prospectAnalysis.engagementScore.score}/100 (${prospectAnalysis.engagementScore.label})`}</span>} />}
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                             <div className="flex items-center gap-3">
                                <Link to={`/crm/prospects/${prospect.id}/edit`} className="flex-1 text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    Editar
                                </Link>
                                 <Link to="/hubs/quotes/new" className="flex-1 text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors">
                                    Cotizar
                                </Link>
                            </div>
                            <button 
                                onClick={handleConvertToClient}
                                className="w-full text-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined mr-2">star</span>
                                Convertir en Cliente
                            </button>
                        </div>
                    </div>

                    <InfoCard title="Estado y Acciones">
                         {prospect.nextAction ? (
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{prospect.nextAction.description}</p>
                                <p className="text-sm text-red-600">Vence: {new Date(prospect.nextAction.dueDate).toLocaleDateString()}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay acciones programadas.</p>
                        )}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 space-y-3">
                            {prospect.pausedInfo && (
                                <InfoRow label="Pausado" value={`${prospect.pausedInfo.reason} (Revisar en ${new Date(prospect.pausedInfo.reviewDate).toLocaleDateString()})`} />
                            )}
                            {prospect.lostInfo && (
                                <InfoRow label="Perdido" value={`${prospect.lostInfo.reason} (en etapa ${prospect.lostInfo.stageLost})`} />
                            )}
                        </div>
                         <button onClick={() => setIsActivityDrawerOpen(true)} className="w-full mt-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm flex items-center justify-center">
                            <span className="material-symbols-outlined mr-1">add_comment</span>
                            Registrar Actividad
                        </button>
                    </InfoCard>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    <InfoCard title="Contactos Involucrados">
                        {involvedContacts.length > 0 ? (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {involvedContacts.map(contact => (
                                    <li key={contact.id} className="py-3 flex items-center space-x-4">
                                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">person</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{contact.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{contact.role}</p>
                                        </div>
                                        <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay contactos asociados.</p>
                        )}
                        <button onClick={() => alert('Funcionalidad para añadir contacto en desarrollo.')} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center mt-2">
                            <span className="material-symbols-outlined mr-1 text-lg">add_circle</span>
                            Añadir Contacto
                        </button>
                    </InfoCard>

                    <ActivityFeed activities={activities} />
                    <NotesSection 
                        entityId={prospect.id}
                        entityType="prospect"
                        notes={prospectNotes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>

                <ActivityDrawer 
                    isOpen={isActivityDrawerOpen}
                    onClose={() => setIsActivityDrawerOpen(false)}
                    prospectId={prospect.id}
                    onAddActivity={handleAddActivity}
                />
                <SuggestionModal
                    isOpen={isSuggestionModalOpen}
                    onClose={() => setIsSuggestionModalOpen(false)}
                    title="Análisis con IA por Studio AI"
                >
                    {suggestionLoading ? (
                        <div className="flex flex-col items-center justify-center h-32">
                            <Spinner />
                            <p className="mt-2 text-slate-500 dark:text-slate-400">Analizando datos del prospecto...</p>
                        </div>
                    ) : suggestionError ? (
                        <div className="text-red-600">
                            <p className="font-semibold">Error al generar sugerencia:</p>
                            <p>{suggestionError}</p>
                        </div>
                    ) : (
                        <SimpleMarkdown text={suggestion} />
                    )}
                </SuggestionModal>
            </div>
        </div>
    );
};

export default ProspectDetailPage;