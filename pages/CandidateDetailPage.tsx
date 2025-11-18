import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Candidate, Note, ActivityLog, CandidateStatus, CandidateTag, CandidateAiAnalysis, RejectionReason, BlacklistReason, Prospect, ProspectStage, User } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
// FIX: Removed MOCK_USERS import and will use useCollection to fetch users.
import { api } from '../data/mockData';
import { GoogleGenAI, Type } from '@google/genai';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
// FIX: Added useCollection to fetch user data.
import { useCollection } from '../hooks/useCollection';


const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let iconName = 'public';
    if (!url) return <span className="material-symbols-outlined !text-2xl text-slate-500">{iconName}</span>;
    
    const icons: Record<string, { path: string; brandColor: string }> = {
        linkedin: { path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z", brandColor: 'text-blue-700 dark:text-blue-500' },
        facebook: { path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z", brandColor: 'text-blue-600 dark:text-blue-400' },
    };

    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        if (hostname.includes('linkedin.com')) iconName = 'linkedin';
        else if (hostname.includes('facebook.com')) iconName = 'facebook';
    } catch (e) { /* Invalid URL */ }

    if (icons[iconName]) {
        return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity"><svg className={`w-6 h-6 ${icons[iconName].brandColor}`} fill="currentColor" viewBox="0 0 24 24"><path d={icons[iconName].path} /></svg></a>;
    }

    return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity"><span className="material-symbols-outlined !text-2xl text-slate-500">{iconName}</span></a>;
}

const InfoCard: React.FC<{ title?: string; children: React.ReactNode; icon?: string; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        {title && (
            <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
                {title}
            </h3>
        )}
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const ActionModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; reasons: string[]; onConfirm: (reason: string, notes?: string) => void; }> = ({ isOpen, onClose, title, reasons, onConfirm }) => {
    const [reason, setReason] = useState(reasons[0] || '');
    const [notes, setNotes] = useState('');

    useEffect(() => { if (isOpen) { setReason(reasons[0] || ''); setNotes(''); } }, [isOpen, reasons]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700"><h3 className="text-lg font-semibold">{title}</h3></div>
                <div className="p-6 space-y-4">
                    <CustomSelect label="Motivo *" options={reasons.map(r => ({ value: r, name: r }))} value={reason} onChange={setReason} />
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas (Opcional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full" /></div>
                </div>
                <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg space-x-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={() => onConfirm(reason, notes)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-indigo-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const CompletenessCriteria: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
    const criteria = [
        { name: 'Email', met: !!(candidate.email || candidate.aiAnalysis?.additionalEmails?.length) },
        { name: 'Teléfono', met: !!(candidate.phone || candidate.aiAnalysis?.additionalPhones?.length) },
        { name: 'Sitio Web', met: !!candidate.website },
        { name: 'Redes Sociales', met: !!(candidate.aiAnalysis?.socialMediaLinks?.length) },
        { name: 'Análisis con IA', met: !!candidate.aiAnalysis },
    ];

    return (
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
            {criteria.map(item => (
                <div key={item.name} className="flex items-center">
                    <span className={`material-symbols-outlined !text-sm mr-1.5 ${item.met ? 'text-green-500' : 'text-slate-400'}`}>
                        {item.met ? 'check_circle' : 'cancel'}
                    </span>
                    {item.name}
                </div>
            ))}
        </div>
    );
};

const ActivityFeed: React.FC<{ activities: ActivityLog[], usersMap: Map<string, User> }> = ({ activities, usersMap }) => {
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

    return (
        <InfoCard title="Actividad Reciente" icon="history">
            {activities.length > 0 ? (
                 <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                     {activities.map(activity => {
                        const author = usersMap.get(activity.userId);
                        return (
                            <li key={activity.id} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 !text-base">{iconMap[activity.type]}</span>
                                </div>
                                <div className="flex-1 text-sm">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {author?.name} &bull; {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        )
                     })}
                 </ul>
            ) : (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No hay actividades para este candidato.</p>
            )}
        </InfoCard>
    );
};

const CandidateDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: candidate, loading: candidateLoading, error } = useDoc<Candidate>('candidates', id || '');
    // FIX: Fetch users to replace mock data.
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    // FIX: Get current user from fetched data.
    const currentUser = useMemo(() => users?.find(u => u.id === 'user-1'), [users]);
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<CandidateStatus>();
    const [aiScriptTab, setAiScriptTab] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp');
    
    useEffect(() => {
        if (candidate && currentUser) {
            setCurrentCandidate(candidate);
            setNewStatus(candidate.status);
            const hasViewed = candidate.activityLog.some(log => log.type === 'Vista de Perfil' && log.userId === currentUser.id);
            if (!hasViewed) addActivityLog('Vista de Perfil', 'Perfil visto', candidate.id);
        }
    }, [candidate, currentUser]);
    
    const addActivityLog = async (type: ActivityLog['type'], description: string, candidateId: string) => {
        if (!currentUser) return;
        const log: ActivityLog = { id: `log-${Date.now()}`, candidateId, type, description, userId: currentUser.id, createdAt: new Date().toISOString() };
        await api.addDoc('activities', log);
        setCurrentCandidate(prev => prev ? { ...prev, activityLog: [log, ...prev.activityLog] } : null);
    };

    const handleNoteAdded = (note: Note) => {
         setCurrentCandidate(prev => prev ? { ...prev, notes: [note, ...prev.notes] } : null);
    };

    const handleStatusChange = async (status: CandidateStatus, description: string) => {
        if (!currentCandidate) return;
        const oldStatus = currentCandidate.status;
        await api.updateDoc('candidates', currentCandidate.id, { status });
        setCurrentCandidate(prev => prev ? { ...prev, status } : null);
        addActivityLog('Cambio de Estado', `cambió el estado de "${oldStatus}" a "${description}"`, currentCandidate.id);
    };
    
    const handleSaveStatus = () => {
        if (!currentCandidate || !newStatus || newStatus === currentCandidate.status) return;
        if (newStatus === CandidateStatus.Aprobado) handleApprove();
        else if (newStatus === CandidateStatus.Rechazado) setIsRejectModalOpen(true);
        else if (newStatus === CandidateStatus.ListaNegra) setIsBlacklistModalOpen(true);
        else handleStatusChange(newStatus, `cambió el estado a "${newStatus}"`);
    };
    
    const handleApprove = async () => {
        if (!currentCandidate || !currentUser) return;
        const newProspect: Prospect = { id: `prospect-${Date.now()}`, name: currentCandidate.name, stage: ProspectStage.Nueva, ownerId: currentUser.id, createdById: currentUser.id, estValue: 0, createdAt: new Date().toISOString(), origin: 'Prospección IA' };
        await api.addDoc('prospects', newProspect);
        await handleStatusChange(CandidateStatus.Aprobado, 'Aprobado y convertido en prospecto');
        alert('Candidato Aprobado. Redirigiendo al nuevo prospecto...');
        navigate(`/crm/prospects/${newProspect.id}`);
    };

    const handleReject = (reason: string, notes?: string) => {
        handleStatusChange(CandidateStatus.Rechazado, `Rechazado (Motivo: ${reason})` + (notes ? ` - ${notes}` : ''));
        setIsRejectModalOpen(false);
    };

    const handleBlacklist = (reason: string, notes?: string) => {
        handleStatusChange(CandidateStatus.ListaNegra, `Añadido a Lista Negra (Motivo: ${reason})` + (notes ? ` - ${notes}` : ''));
        setIsBlacklistModalOpen(false);
    };
    
    const allEmails = useMemo(() => Array.from(new Set([currentCandidate?.email, ...(currentCandidate?.aiAnalysis?.additionalEmails || [])].filter(Boolean))), [currentCandidate]);
    const allPhones = useMemo(() => Array.from(new Set([currentCandidate?.phone, ...(currentCandidate?.aiAnalysis?.additionalPhones || [])].filter(Boolean))), [currentCandidate]);

    const profileCompleteness = useMemo(() => {
        if (!currentCandidate) return 0;
        let score = 0;
        if (currentCandidate.email || currentCandidate.aiAnalysis?.additionalEmails?.length) score += 20;
        if (currentCandidate.phone || currentCandidate.aiAnalysis?.additionalPhones?.length) score += 20;
        if (currentCandidate.website) score += 20;
        if (currentCandidate.aiAnalysis?.socialMediaLinks?.length) score += 10;
        if (currentCandidate.aiAnalysis) score += 30;
        return Math.min(100, score);
    }, [currentCandidate]);

    const handleRunAiAnalysis = async () => {
        if (!currentCandidate) return;
        setIsLoadingAI(true);
        setAiError('');

        try {
            const prompt = `Analiza el siguiente perfil de un candidato de negocio y genera un JSON con la siguiente estructura:
            - profileSummary: Un resumen conciso del perfil del negocio.
            - suggestedCategory: Una categoría sugerida para este negocio (ej. "Industrial", "Agricultura", "Transporte").
            - nextActionSuggestion: Una sugerencia clara de la próxima acción a tomar con este candidato.
            - communicationScripts: Un objeto con guiones para contactar al candidato a través de "whatsapp", "phone", y "email".
            - socialMediaLinks: Un array de strings con URLs a perfiles de redes sociales (LinkedIn, Facebook, etc.) si las encuentras.
            
            Datos del Candidato:
            Nombre: ${currentCandidate.name}
            Dirección: ${currentCandidate.address || 'No disponible'}
            Categorías Originales: ${currentCandidate.rawCategories?.join(', ') || 'No disponible'}
            Sitio Web: ${currentCandidate.website || 'No disponible'}`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            profileSummary: { type: Type.STRING },
                            suggestedCategory: { type: Type.STRING },
                            nextActionSuggestion: { type: Type.STRING },
                            communicationScripts: {
                                type: Type.OBJECT,
                                properties: {
                                    whatsapp: { type: Type.STRING },
                                    phone: { type: Type.STRING },
                                    email: { type: Type.STRING },
                                },
                                required: ['whatsapp', 'phone', 'email']
                            },
                            socialMediaLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                         required: ['profileSummary', 'suggestedCategory', 'nextActionSuggestion', 'communicationScripts']
                    },
                },
            });
            
            const jsonStr = response.text.trim();
            const analysisResult: CandidateAiAnalysis = JSON.parse(jsonStr);

            await api.updateDoc('candidates', currentCandidate.id, { aiAnalysis: analysisResult });
            setCurrentCandidate(prev => prev ? { ...prev, aiAnalysis: analysisResult } : null);
            addActivityLog('Análisis IA', 'Análisis de perfil ejecutado', currentCandidate.id);
        } catch (err) {
            console.error("Error with Gemini AI:", err);
            setAiError("No se pudo completar el análisis. Inténtalo de nuevo.");
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const loading = candidateLoading || usersLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentCandidate) return <div className="text-center p-12">Candidato no encontrado</div>;
    
    const googleMapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.API_KEY}&q=${encodeURIComponent(currentCandidate.googlePlaceId || currentCandidate.name + ',' + currentCandidate.address)}`;

    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, name: s }));

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{currentCandidate.name}</h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                    <div className="w-full md:w-40">
                       <CustomSelect options={statusOptions} value={newStatus || ''} onChange={(val) => setNewStatus(val as CandidateStatus)} />
                    </div>
                    <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title="Contacto y Enlaces" icon="contact_page">
                         <div className="space-y-3">
                            {currentCandidate.website && (
                                <a href={currentCandidate.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <span className="material-symbols-outlined text-xl text-slate-500">language</span>
                                    {currentCandidate.website}
                                </a>
                            )}
                             {allEmails.map(email => (
                                <a key={email} href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <span className="material-symbols-outlined text-xl text-slate-500">email</span>
                                    {email}
                                </a>
                            ))}
                             {allPhones.map(phone => (
                                <a key={phone} href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <span className="material-symbols-outlined text-xl text-slate-500">phone</span>
                                    {phone}
                                </a>
                            ))}
                        </div>
                        {currentCandidate.aiAnalysis?.socialMediaLinks && currentCandidate.aiAnalysis.socialMediaLinks.length > 0 && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 flex items-center gap-4">
                                <span className="material-symbols-outlined text-xl text-slate-500">groups</span>
                                {currentCandidate.aiAnalysis.socialMediaLinks.map(link => <SocialIcon key={link} url={link} />)}
                            </div>
                        )}
                    </InfoCard>

                    <InfoCard title="Análisis con IA" icon="auto_awesome">
                        {isLoadingAI ? <div className="flex justify-center items-center h-48"><Spinner /></div> : 
                         aiError ? <p className="text-red-500 text-sm text-center">{aiError}</p> :
                         currentCandidate.aiAnalysis ? (
                            <div className="space-y-4 text-sm">
                                <div><h4 className="font-semibold text-slate-500 dark:text-slate-400">Resumen del Perfil</h4><p>{currentCandidate.aiAnalysis.profileSummary}</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><h4 className="font-semibold text-slate-500 dark:text-slate-400">Categoría Sugerida</h4><p><Badge text={currentCandidate.aiAnalysis.suggestedCategory} color="blue"/></p></div>
                                    <div><h4 className="font-semibold text-slate-500 dark:text-slate-400">Próxima Acción</h4><p>{currentCandidate.aiAnalysis.nextActionSuggestion}</p></div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-500 dark:text-slate-400 mb-2">Guiones de Comunicación</h4>
                                    <div className="border-b border-slate-200 dark:border-slate-700"><nav className="-mb-px flex space-x-4"><button onClick={()=>setAiScriptTab('whatsapp')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${aiScriptTab==='whatsapp'?'border-indigo-500 text-indigo-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>WhatsApp</button><button onClick={()=>setAiScriptTab('phone')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${aiScriptTab==='phone'?'border-indigo-500 text-indigo-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>Llamada</button><button onClick={()=>setAiScriptTab('email')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${aiScriptTab==='email'?'border-indigo-500 text-indigo-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>Email</button></nav></div>
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md text-xs"><p className="whitespace-pre-wrap font-mono">{currentCandidate.aiAnalysis.communicationScripts[aiScriptTab]}</p></div>
                                </div>
                            </div>
                         ) :
                         <div className="text-center py-4">
                             <p className="text-sm text-slate-500 mb-4">No se ha ejecutado un análisis para este candidato.</p>
                             <button onClick={handleRunAiAnalysis} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700"><span className="material-symbols-outlined mr-2">psychology</span>Calificar con IA</button>
                         </div>
                        }
                    </InfoCard>
                    <ActivityFeed activities={currentCandidate.activityLog} usersMap={usersMap} />
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {currentCandidate.imageUrl && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <img src={currentCandidate.imageUrl} alt={`${currentCandidate.name} logo`} className="rounded-lg object-contain max-h-40 w-full" />
                        </div>
                    )}

                    <InfoCard>
                        <h4 className="font-semibold text-slate-500 dark:text-slate-400">Puntuación de Perfil</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${profileCompleteness}%` }}></div></div>
                            <span className="font-bold text-lg">{profileCompleteness}%</span>
                        </div>
                        <CompletenessCriteria candidate={currentCandidate} />
                    </InfoCard>

                    <InfoCard title="Ubicación" icon="location_on">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{currentCandidate.address}</p>
                        <div className="h-48 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                             <iframe title={`Mapa de ${currentCandidate.name}`} width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={googleMapEmbedUrl} allowFullScreen></iframe>
                        </div>
                    </InfoCard>

                    <InfoCard title="Etiquetas" icon="label">
                         <div className="flex flex-wrap gap-2">
                             {currentCandidate.tags.map(tag => <Badge key={tag} text={tag} color="blue" />)}
                             <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Añadir etiqueta</button>
                         </div>
                    </InfoCard>
                    
                    <NotesSection
                        entityId={currentCandidate.id}
                        entityType="candidate"
                        notes={currentCandidate.notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
            </div>
            
            <ActionModal isOpen={isRejectModalOpen} onClose={() => { setIsRejectModalOpen(false); setNewStatus(currentCandidate.status); }} title="Rechazar Candidato" reasons={Object.values(RejectionReason)} onConfirm={handleReject}/>
            <ActionModal isOpen={isBlacklistModalOpen} onClose={() => { setIsBlacklistModalOpen(false); setNewStatus(currentCandidate.status); }} title="Añadir a Lista Negra" reasons={Object.values(BlacklistReason)} onConfirm={handleBlacklist}/>
        </>
    );
};

export default CandidateDetailPage;