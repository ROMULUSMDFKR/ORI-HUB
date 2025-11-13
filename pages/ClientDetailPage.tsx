
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Company, Note, ActivityLog, Contact, SalesOrder, SalesOrderStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';
import { GoogleGenAI } from '@google/genai';


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

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const user = MOCK_USERS[note.userId];
    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};

const NotesSection: React.FC<{ companyId: string }> = ({ companyId }) => {
    const { data: allNotes } = useCollection<Note>('notes');
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (allNotes) {
            const companyNotes = allNotes
                .filter(n => n.companyId === companyId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(companyNotes);
        }
    }, [allNotes, companyId]);

    const handleAddNote = () => {
        if (newNote.trim() === '') return;
        const note: Note = {
            id: `note-${Date.now()}`,
            companyId: companyId,
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
                        placeholder="Escribe una nueva nota..."
                    />
                    <div className="text-right mt-2">
                        <button onClick={handleAddNote} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-indigo-700">
                            Agregar Nota
                        </button>
                    </div>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notes.length > 0 ? notes.map(note => (
                       <NoteCard key={note.id} note={note} />
                    )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay notas para esta empresa.</p>}
                </div>
            </div>
        </InfoCard>
    );
};

const ActivityFeed: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
    // FIX: Corrected iconMap to align with ActivityLog['type'] and prevent type errors.
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

const ClientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: company, loading, error } = useDoc<Company>('companies', id || '');
    const { data: allContacts } = useCollection<Contact>('contacts');
    const { data: allSalesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: allActivities } = useCollection<ActivityLog>('activities');

    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestionError, setSuggestionError] = useState('');

    const { activities, contacts, salesOrders, totalRevenue, lastActivityDate } = useMemo(() => {
        if (!id) return { activities: [], contacts: [], salesOrders: [], totalRevenue: 0, lastActivityDate: null };
        const filteredActivities = (allActivities || [])
            .filter(a => a.companyId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const filteredContacts = (allContacts || []).filter(c => c.companyId === id);

        const filteredSalesOrders = (allSalesOrders || [])
            .filter(so => so.companyId === id && so.status !== SalesOrderStatus.Cancelada)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const revenue = filteredSalesOrders.reduce((sum, so) => sum + so.total, 0);
        const lastActivity = filteredActivities[0]?.createdAt ? new Date(filteredActivities[0].createdAt) : null;

        return { activities: filteredActivities, contacts: filteredContacts, salesOrders: filteredSalesOrders, totalRevenue: revenue, lastActivityDate: lastActivity };
    }, [id, allActivities, allContacts, allSalesOrders]);

    const companyAnalysis = useMemo(() => {
        if (!company || !lastActivityDate) return null;
        
        const lastActivityDays = (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24);
        const healthScore = company.healthScore?.score || 50;

        const alerts: string[] = [];
        if (lastActivityDays > 30) alerts.push(`Sin contacto en más de ${Math.floor(lastActivityDays)} días.`);
        if (healthScore < 50) alerts.push(`Puntuación de salud en riesgo (${healthScore}/100).`);

        return { alerts };
    }, [company, lastActivityDate]);


     const handleSuggestAction = async () => {
        if (!company || !companyAnalysis) return;
        setIsSuggestionModalOpen(true);
        setSuggestionLoading(true);
        setSuggestion('');
        setSuggestionError('');

        try {
            const context = `
                Cliente: ${company.name} (${company.shortName})
                Etapa: ${company.stage}
                Puntuación de Salud: ${company.healthScore?.score}/100 (${company.healthScore?.label})
                Valor Total (Ventas): $${totalRevenue.toLocaleString()}
                Alertas Actuales: ${companyAnalysis.alerts.join(', ') || 'Ninguna'}
                Últimas 3 actividades:
                ${activities.slice(0, 3).map(a => `- ${new Date(a.createdAt).toLocaleDateString()}: ${a.type} - ${a.description}`).join('\n')}
                Perfil de Compra: ${company.profile?.purchaseProcess?.purchaseType}, Frecuencia ${company.profile?.useCase?.frequency}.
            `;
            const prompt = `
                Eres un asistente de IA experto en gestión de cuentas para un CRM. Tu nombre es "Studio AI".
                Basado en el siguiente contexto de un cliente, proporciona un análisis para el vendedor. Tu respuesta debe estar en español y formateada en Markdown. Incluye:
                1. **Resumen Ejecutivo:** Un párrafo corto resumiendo el estado actual de la cuenta, su valor y si requiere atención.
                2. **Puntos de Oportunidad:** Una lista de 2-3 oportunidades o riesgos basados en su historial y perfil.
                3. **Próxima Acción Sugerida:** Una sugerencia clara y accionable para mantener o crecer la cuenta.

                Contexto del Cliente:
                ${context}

                Análisis de la Cuenta:
            `;

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });
            
            // FIX: The `text` property on the response should be accessed directly, not called as a function.
            setSuggestion(response.text);

        } catch (error) {
            console.error("Error fetching suggestion:", error);
            setSuggestionError('No se pudo contactar al servicio de IA. Inténtalo de nuevo.');
        } finally {
            setSuggestionLoading(false);
        }
    };


    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !company) return <div className="text-center p-12">Cliente no encontrado</div>;
    
    const owner = MOCK_USERS[company.ownerId];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-indigo-600 text-white p-5 rounded-xl relative overflow-hidden shadow-lg">
                    <div className="text-white"><WavyBg /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold">{company.shortName || company.name}</h3>
                                <p className="text-xs text-white/80">{company.name}</p>
                            </div>
                            <Badge text={company.stage} color="blue" />
                        </div>
                        <p className="mt-4 text-sm text-white/80">Valor Total</p>
                        <p className="text-4xl font-bold mt-1">${totalRevenue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                {companyAnalysis && <AlertsPanel alerts={companyAnalysis.alerts} />}
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Datos Generales</h3>
                    <div className="space-y-1">
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow label="Industria" value={company.industry || 'N/A'} />
                        <InfoRow label="Prioridad" value={<Badge text={company.priority} color={company.priority === 'Alta' ? 'red' : company.priority === 'Media' ? 'yellow' : 'gray'} />} />
                        <InfoRow label="Salud de Cuenta" value={<span className="font-semibold">{company.healthScore?.score}/100 ({company.healthScore?.label})</span>} />
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                         <div className="flex items-center gap-3">
                            <Link to={`/crm/clients/${company.id}/edit`} className="flex-1 text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                Editar
                            </Link>
                             <Link to="/hubs/quotes/new" className="flex-1 text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                                Cotizar
                            </Link>
                        </div>
                        <button 
                            onClick={handleSuggestAction}
                            disabled={suggestionLoading}
                            className="w-full text-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined mr-2">{suggestionLoading ? 'hourglass_top' : 'auto_awesome'}</span>
                            {suggestionLoading ? 'Analizando...' : 'Análisis con IA'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                 <InfoCard title="Contactos">
                    {contacts.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {contacts.map(contact => (
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
                </InfoCard>

                <ActivityFeed activities={activities} />
                <NotesSection companyId={company.id} />
            </div>
            
            <SuggestionModal
                isOpen={isSuggestionModalOpen}
                onClose={() => setIsSuggestionModalOpen(false)}
                title="Análisis con IA por Studio AI"
            >
                {suggestionLoading ? (
                    <div className="flex flex-col items-center justify-center h-32">
                        <Spinner />
                        <p className="mt-2 text-slate-500 dark:text-slate-400">Analizando datos del cliente...</p>
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
    );
};

export default ClientDetailPage;
