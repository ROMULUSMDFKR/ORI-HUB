import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Prospect, Note, ActivityLog, Contact } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';
import ActivityDrawer from '../components/crm/ActivityDrawer';
import { GoogleGenAI } from '@google/genai';


// --- Reusable UI Components ---

const WavyBg: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full opacity-10">
      <path d="M-50,20 C100,100 200,-50 350,50 L350,150 L-50,150 Z" fill="currentColor" />
      <path d="M-50,50 C100,-50 200,100 350,20 L350,150 L-50,150 Z" fill="currentColor" opacity="0.5"/>
    </svg>
);

const SuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Cerrar">
                        <span className="material-symbols-outlined">close</span>
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
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-yellow-500">warning</span>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700 font-semibold">Alertas Inteligentes</p>
                    <ul className="list-disc ml-5 mt-1">
                        {alerts.map((alert, index) => (
                           <li key={index} className="text-sm text-yellow-700">{alert}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold border-b pb-3 mb-4 text-text-main">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100 last:border-b-0">
        <dt className="font-medium text-text-secondary">{label}</dt>
        <dd className="col-span-2 text-text-main font-semibold text-right">{value}</dd>
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

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const user = MOCK_USERS[note.userId];

    return (
        <div className="bg-light-bg p-4 rounded-lg relative">
            <p className="text-sm text-text-main whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center justify-between text-xs text-text-secondary mt-2">
                <div className="flex items-center">
                    {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                    <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
                </div>
            </div>
            <div className="absolute top-2 right-2">
                <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
                    <span className="material-symbols-outlined text-base">more_vert</span>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border">
                        <button onClick={() => alert('Editando nota...')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><span className="material-symbols-outlined text-base mr-2">edit</span>Editar</button>
                        <button onClick={() => alert('Eliminando nota...')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"><span className="material-symbols-outlined text-base mr-2">delete</span>Eliminar</button>
                    </div>
                )}
            </div>
        </div>
    );
};


const NotesSection: React.FC<{ prospectId: string }> = ({ prospectId }) => {
    const { data: allNotes } = useCollection<Note>('notes');
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (allNotes) {
            const prospectNotes = allNotes
                .filter(n => n.prospectId === prospectId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(prospectNotes);
        }
    }, [allNotes, prospectId]);

    const handleAddNote = () => {
        if (newNote.trim() === '') return;
        const note: Note = {
            id: `note-${Date.now()}`,
            prospectId: prospectId,
            text: newNote,
            userId: 'natalia', // Assuming current user is Natalia
            createdAt: new Date().toISOString(),
        };
        setNotes([note, ...notes]);
        setNewNote('');
    };

    return (
        <InfoCard title="Notas">
            <div className="space-y-4">
                <div>
                    <textarea
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-container-bg text-text-main"
                        placeholder="Escribe una nueva nota..."
                    />
                    <div className="text-right mt-2">
                        <button onClick={handleAddNote} className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:opacity-90">
                            Agregar Nota
                        </button>
                    </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notes.length > 0 ? notes.map(note => (
                       <NoteCard key={note.id} note={note} />
                    )) : <p className="text-sm text-gray-500 text-center py-4">No hay notas para este prospecto.</p>}
                </div>
            </div>
        </InfoCard>
    );
};

const ActivityFeed: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call', 'Email': 'email', 'Reunión': 'groups', 'Cotización': 'request_quote', 'Nota': 'note',
        'Email Sincronizado': 'mark_email_read', 'Reunión Sincronizada': 'calendar_month'
    };
    
    if (!activities.length) {
        return (
            <InfoCard title="Actividad Reciente">
                <p className="text-sm text-gray-500 text-center py-4">No hay actividades registradas.</p>
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
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-light-bg flex items-center justify-center ring-8 ring-white">
                                            <span className="material-symbols-outlined text-text-secondary">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                {activity.description} por <span className="font-medium text-gray-900">{MOCK_USERS[activity.userId]?.name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
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
    const { data: prospect, loading, error } = useDoc<Prospect>('prospects', id || '');
    const { data: allContacts } = useCollection<Contact>('contacts');
    const { data: initialActivities } = useCollection<ActivityLog>('activities');
    
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestionError, setSuggestionError] = useState('');


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

    const involvedContacts = useMemo(() => {
        return allContacts?.filter(c => c.prospectId === id) || [];
    }, [allContacts, id]);

    const prospectAnalysis = useMemo(() => {
        if (!prospect || !activities) return null;
        
        const lastActivityDays = prospect.lastInteraction ? (new Date().getTime() - new Date(prospect.lastInteraction.date).getTime()) / (1000 * 3600 * 24) : 999;
        
        // Engagement Score Calculation
        const recencyScore = Math.max(0, 100 - lastActivityDays * 5); 
        const frequencyScore = Math.min(50, activities.length * 5);
        const engagementScoreValue = Math.round((recencyScore * 0.7) + (frequencyScore * 0.3));
        const engagementScoreLabel = engagementScoreValue > 75 ? 'Caliente' : engagementScoreValue > 40 ? 'Tibio' : 'Frío';

        // Alerts Calculation
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
                Eres un asistente experto en ventas para un CRM. Basado en el siguiente resumen de un prospecto, sugiere una única, clara y accionable "próxima acción" para el vendedor.
                La sugerencia debe ser concisa (máximo 2-3 frases), directa y en español. No añadas introducciones como "Claro..." o saludos. Empieza directamente con la acción.

                Contexto del Prospecto:
                ${context}

                Próxima acción sugerida:
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


    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !prospect) return <div className="text-center p-12">Prospecto no encontrado</div>;
    
    const owner = Object.values(MOCK_USERS).find(u => u.id === prospect.ownerId);
    const creator = Object.values(MOCK_USERS).find(u => u.id === prospect.createdById);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-primary text-on-primary p-5 rounded-xl relative overflow-hidden shadow-lg">
                    <div className="text-on-primary"><WavyBg /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold">{prospect.name}</h3>
                                <p className="text-xs text-on-primary/80">ID: {prospect.id}</p>
                            </div>
                            <Badge text={prospect.stage} color="blue" />
                        </div>
                        <p className="mt-4 text-sm text-on-primary/80">Valor Estimado</p>
                        <p className="text-4xl font-bold mt-1">${prospect.estValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                {prospectAnalysis && <AlertsPanel alerts={prospectAnalysis.alerts} />}
                
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Datos Generales</h3>
                    <div className="space-y-1">
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow label="Creado por" value={`${creator?.name} el ${new Date(prospect.createdAt).toLocaleDateString()}`} />
                        <InfoRow label="Industria" value={prospect.industry || 'N/A'} />
                        <InfoRow label="Origen" value={prospect.origin || 'N/A'} />
                        {prospect.priority && <InfoRow label="Prioridad" value={<Badge text={prospect.priority} color={getPriorityBadgeColor(prospect.priority)} />} />}
                        {prospectAnalysis && <InfoRow label="Puntuación de Engagement" value={<span className="font-semibold">{`${prospectAnalysis.engagementScore.score}/100 (${prospectAnalysis.engagementScore.label})`}</span>} />}
                    </div>
                    <div className="pt-4 mt-4 border-t space-y-2">
                         <div className="flex items-center gap-3">
                            <Link to={`/crm/prospects/${prospect.id}/edit`} className="flex-1 text-center bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                                Editar
                            </Link>
                             <Link to="/hubs/quotes/new" className="flex-1 text-center bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors">
                                Cotizar
                            </Link>
                        </div>
                        <button 
                            onClick={handleSuggestAction}
                            disabled={suggestionLoading}
                            className="w-full text-center bg-green-50 border border-green-200 text-green-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-100 transition-colors flex items-center justify-center disabled:bg-gray-200 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined mr-2">{suggestionLoading ? 'hourglass_top' : 'lightbulb'}</span>
                            {suggestionLoading ? 'Analizando...' : 'Acción Sugerida'}
                        </button>
                    </div>
                </div>

                <InfoCard title="Estado y Acciones">
                     {prospect.nextAction ? (
                        <div>
                            <p className="font-semibold">{prospect.nextAction.description}</p>
                            <p className="text-sm text-red-600">Vence: {new Date(prospect.nextAction.dueDate).toLocaleDateString()}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No hay acciones programadas.</p>
                    )}
                    <div className="border-t pt-3 mt-3 space-y-3">
                        {prospect.pausedInfo && (
                            <InfoRow label="Pausado" value={`${prospect.pausedInfo.reason} (Revisar en ${new Date(prospect.pausedInfo.reviewDate).toLocaleDateString()})`} />
                        )}
                        {prospect.lostInfo && (
                            <InfoRow label="Perdido" value={`${prospect.lostInfo.reason} (en etapa ${prospect.lostInfo.stageLost})`} />
                        )}
                    </div>
                     <button onClick={() => setIsActivityDrawerOpen(true)} className="w-full mt-2 text-accent font-semibold text-sm flex items-center justify-center">
                        <span className="material-symbols-outlined mr-1">add_comment</span>
                        Registrar Actividad
                    </button>
                </InfoCard>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <InfoCard title="Contactos Involucrados">
                    {involvedContacts.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {involvedContacts.map(contact => (
                                <li key={contact.id} className="py-3 flex items-center space-x-4">
                                    <span className="material-symbols-outlined text-gray-400">person</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                                        <p className="text-sm text-gray-500">{contact.role}</p>
                                    </div>
                                    <a href={`mailto:${contact.email}`} className="text-sm text-accent hover:underline">{contact.email}</a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No hay contactos asociados.</p>
                    )}
                    <button onClick={() => alert('Funcionalidad para añadir contacto en desarrollo.')} className="text-sm font-semibold text-accent flex items-center mt-2">
                        <span className="material-symbols-outlined mr-1 text-lg">add_circle</span>
                        Añadir Contacto
                    </button>
                </InfoCard>

                <ActivityFeed activities={activities} />
                <NotesSection prospectId={prospect.id} />
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
                title="Acción Sugerida por IA"
            >
                {suggestionLoading ? (
                    <div className="flex flex-col items-center justify-center h-32">
                        <Spinner />
                        <p className="mt-2 text-text-secondary">Analizando datos del prospecto...</p>
                    </div>
                ) : suggestionError ? (
                    <div className="text-red-600">
                        <p className="font-semibold">Error al generar sugerencia:</p>
                        <p>{suggestionError}</p>
                    </div>
                ) : (
                    <p className="text-text-main whitespace-pre-wrap">{suggestion}</p>
                )}
            </SuggestionModal>
        </div>
    );
};

export default ProspectDetailPage;