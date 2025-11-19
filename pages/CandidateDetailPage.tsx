import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { Candidate, Note, ActivityLog, CandidateStatus, CandidateAiAnalysis, RejectionReason, BlacklistReason, Prospect, ProspectStage, User, Brand, WebResult, ReviewsTag, PeopleAlsoSearch, ReviewsDistribution } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { api } from '../api/firebaseApi';
import { GoogleGenAI, Type } from '@google/genai';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';


const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let iconName = 'public';
    if (!url) return <span className="material-symbols-outlined !text-2xl text-slate-500">{iconName}</span>;
    
    const icons: Record<string, { path: string; brandColor: string }> = {
        linkedin: { path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z", brandColor: 'text-blue-700 dark:text-blue-500' },
        facebook: { path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z", brandColor: 'text-blue-600 dark:text-blue-400' },
        instagram: { path: "M12 2.163c3.204 0 3.584.012 4.85.07 1.272.058 2.164.332 2.923.644.802.321 1.455.787 2.122 1.455.666.666 1.134 1.32 1.455 2.122.312.759.586 1.651.644 2.923.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.058 1.272-.332 2.164-.644 2.923-.321.802-.787 1.455-1.455 2.122-.666.666-1.32 1.134-2.122 1.455-.759.312-1.651.586-2.923.644-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.272-.058-2.164-.332-2.923-.644-.802-.321-1.455-.787-2.122-1.455-.666-.666-1.134-1.32-1.455-2.122-.312-.759-.586-1.651-.644-2.923-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.058-1.272.332-2.164.644-2.923.321.802.787 1.455 1.455-2.122.666.666 1.32-1.134 2.122-1.455.759-.312 1.651-.586 2.923-.644 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.356.06-2.305.328-3.122.656-.843.334-1.594.8-2.313 1.523-.718.72-1.189 1.47-1.522 2.313-.328.817-.596 1.766-.656 3.122-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.06 1.356.328 2.305.656 3.122.334.843.8 1.594 1.522 2.313.72.718 1.47 1.189 2.313 1.522.817.328 1.766.596 3.122.656 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.356-.06 2.305-.328 3.122-.656.843-.334 1.594-.8 2.313-1.522.718-.72 1.189-1.47 1.522-2.313.328-.817-.596-1.766-.656-3.122.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.06-1.356-.328-2.305-.656-3.122-.334-.843-.8-1.594-1.522-2.313-.72-.718-1.47-1.189-2.313-1.522-.817-.328-1.766-.596-3.122-.656-1.28-.058-1.688-.072-4.947-.072z", brandColor: 'text-pink-600 dark:text-pink-400'},
        twitter: { path: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616v.063c0 2.238 1.591 4.098 3.693 4.523-.623.169-1.28.216-1.942.175.586 1.83 2.28 3.166 4.285 3.201-1.815 1.423-4.093 2.223-6.502 2.223-.423 0-.84-.025-1.25-.073 2.348 1.503 5.143 2.38 8.14 2.38 9.771 0 15.12-8.12 15.01-15.13v-.681c1.041-.748 1.944-1.68 2.663-2.766z", brandColor: 'text-sky-500 dark:text-sky-400' },
    };

    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        if (hostname.includes('linkedin.com')) iconName = 'linkedin';
        else if (hostname.includes('facebook.com')) iconName = 'facebook';
        else if (hostname.includes('instagram.com')) iconName = 'instagram';
        else if (hostname.includes('twitter.com') || hostname.includes('x.com')) iconName = 'twitter';

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
        { name: 'Email', met: !!(candidate.email || candidate.emails?.length) },
        { name: 'Teléfono', met: !!(candidate.phone || candidate.phones?.length) },
        { name: 'Sitio Web', met: !!candidate.website },
        { name: 'Redes Sociales', met: !!(candidate.linkedIns?.length || candidate.facebooks?.length || candidate.instagrams?.length) },
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

const ReviewDistributionChart: React.FC<{ dist: ReviewsDistribution }> = ({ dist }) => {
    const total = dist.oneStar + dist.twoStar + dist.threeStar + dist.fourStar + dist.fiveStar;
    if (total === 0) return null;

    const data = [
        { label: '5★', value: dist.fiveStar, color: 'bg-green-500' },
        { label: '4★', value: dist.fourStar, color: 'bg-lime-500' },
        { label: '3★', value: dist.threeStar, color: 'bg-yellow-500' },
        { label: '2★', value: dist.twoStar, color: 'bg-orange-500' },
        { label: '1★', value: dist.oneStar, color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-1">
            {data.map(item => (
                 <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-6">{item.label}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.value / total) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-8 text-right">{item.value}</span>
                </div>
            ))}
        </div>
    );
};

const CandidateDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: candidate, loading: candidateLoading, error } = useDoc<Candidate>('candidates', id || '');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: brands, loading: brandsLoading } = useCollection<Brand>('brands');
    const { showToast } = useToast();
    
    const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    
    const { user: currentUser, loading: authLoading } = useAuth();
    
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const brand = useMemo(() => {
        if (!currentCandidate?.brandId || !brands) return null;
        return brands.find(b => b.id === currentCandidate.brandId);
    }, [currentCandidate, brands]);

    // FIX: Define allEmails and allPhones by combining the singular and plural fields from the candidate object.
    const { allEmails, allPhones } = useMemo(() => {
        if (!currentCandidate) return { allEmails: [], allPhones: [] };
        
        const emails = new Set<string>();
        if (currentCandidate.email) emails.add(currentCandidate.email);
        if (currentCandidate.emails) currentCandidate.emails.forEach(e => e && emails.add(e));

        const phones = new Set<string>();
        if (currentCandidate.phone) phones.add(currentCandidate.phone);
        if (currentCandidate.phones) currentCandidate.phones.forEach(p => p && phones.add(p));

        return { allEmails: Array.from(emails), allPhones: Array.from(phones) };
    }, [currentCandidate]);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<CandidateStatus>();
    const [aiScriptTab, setAiScriptTab] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp');
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    
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
        
        const candidateNotes = (currentCandidate.notes || [])
            .map(n => `- ${n.text} (por ${usersMap.get(n.userId)?.name || 'Desconocido'} el ${new Date(n.createdAt).toLocaleDateString()})`)
            .join('\n');
    
        const combinedNotes = `Prospecto creado desde Candidato.\n\n--- Historial de Notas del Candidato ---\n${candidateNotes}`;
    
        const newProspectData: Omit<Prospect, 'id'> = { 
            name: currentCandidate.name, 
            stage: ProspectStage.Nueva, 
            ownerId: currentUser.id, 
            createdById: currentUser.id, 
            estValue: 0, 
            createdAt: new Date().toISOString(), 
            origin: 'Prospección IA',
            industry: currentCandidate.aiAnalysis?.suggestedCategory || '',
            candidateId: currentCandidate.id,
            website: currentCandidate.website || undefined,
            phone: currentCandidate.phone || (currentCandidate.phones && currentCandidate.phones[0]) || undefined,
            email: currentCandidate.email || (currentCandidate.emails && currentCandidate.emails[0]) || undefined,
            address: currentCandidate.address || undefined,
            notes: combinedNotes,
        };
    
        const newProspect = await api.addDoc('prospects', newProspectData);
        await handleStatusChange(CandidateStatus.Aprobado, 'Aprobado y convertido en prospecto');
        
        showToast('success', 'Candidato aprobado. Redirigiendo al nuevo prospecto...');
        navigate(`/hubs/prospects/${newProspect.id}`);
    };

    const handleReject = (reason: string, notes?: string) => {
        handleStatusChange(CandidateStatus.Rechazado, `Rechazado (Motivo: ${reason})` + (notes ? ` - ${notes}` : ''));
        setIsRejectModalOpen(false);
    };

    const handleBlacklist = (reason: string, notes?: string) => {
        handleStatusChange(CandidateStatus.ListaNegra, `Añadido a Lista Negra (Motivo: ${reason})` + (notes ? ` - ${notes}` : ''));
        setIsBlacklistModalOpen(false);
    };

    const profileCompleteness = useMemo(() => {
        if (!currentCandidate) return 0;
        let score = 0;
        if (currentCandidate.email || (currentCandidate.emails && currentCandidate.emails.length > 0)) score += 20;
        if (currentCandidate.phone || (currentCandidate.phones && currentCandidate.phones.length > 0)) score += 20;
        if (currentCandidate.website) score += 20;
        if ((currentCandidate.linkedIns && currentCandidate.linkedIns.length > 0) || (currentCandidate.facebooks && currentCandidate.facebooks.length > 0) || (currentCandidate.instagrams && currentCandidate.instagrams.length > 0)) score += 10;
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

    const handleSuggestTags = async () => {
        if (!currentCandidate) return;
        try {
             const prompt = `Basado en la información de este candidato (nombre: "${currentCandidate.name}", categorías: "${currentCandidate.rawCategories?.join(', ')}"), sugiere 3 etiquetas relevantes de la siguiente lista: "Alto Potencial", "Potencial Distribuidor", "Consumidor Directo", "Para seguimiento", "No Relevante". Devuelve solo un array JSON de strings.`;
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
             const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
             const tags = JSON.parse(response.text);
             setSuggestedTags(tags.filter((t: string) => !currentCandidate.tags.includes(t)));
        } catch (e) {
            console.error("Tag suggestion error", e);
        }
    };
    
    const handleAddTag = async (tag: string) => {
        if (!currentCandidate) return;
        const newTags = [...currentCandidate.tags, tag];
        await api.updateDoc('candidates', currentCandidate.id, { tags: newTags });
        setCurrentCandidate(prev => prev ? { ...prev, tags: newTags } : null);
        setSuggestedTags(prev => prev.filter(t => t !== tag));
    };
    
    const loading = candidateLoading || usersLoading || authLoading || brandsLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentCandidate) return <div className="text-center p-12">Candidato no encontrado</div>;
    
    // FIX: Robust map query logic with clear priority
    let mapQuery = '';
    if (currentCandidate.googlePlaceId) {
        mapQuery = `place_id:${currentCandidate.googlePlaceId}`;
    } else if (currentCandidate.address) {
        mapQuery = currentCandidate.address;
    } else {
        const parts = [
            currentCandidate.name,
            currentCandidate.city,
            currentCandidate.state
        ].filter(Boolean);
        mapQuery = parts.join(', ');
    }
        
    const googleMapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.API_KEY}&q=${encodeURIComponent(mapQuery)}`;

    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, name: s }));

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{currentCandidate.name}</h1>
                     {brand && (
                        <div className="flex items-center gap-2 mt-2">
                            <img src={brand.logoUrl} alt={brand.name} className="w-6 h-6 object-contain" />
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{brand.name}</span>
                        </div>
                    )}
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
                            {currentCandidate.website && <a href={currentCandidate.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><span className="material-symbols-outlined text-xl text-slate-500">language</span>{currentCandidate.website}</a>}
                            {allEmails.map(email => <a key={email} href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><span className="material-symbols-outlined text-xl text-slate-500">email</span>{email}</a>)}
                            {allPhones.map(phone => <a key={phone} href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><span className="material-symbols-outlined text-xl text-slate-500">phone</span>{phone}</a>)}
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 flex items-center gap-4">
                            <span className="material-symbols-outlined text-xl text-slate-500">groups</span>
                            {currentCandidate.facebooks?.map(link => <SocialIcon key={link} url={link} />)}
                            {currentCandidate.linkedIns?.map(link => <SocialIcon key={link} url={link} />)}
                             {currentCandidate.instagrams?.map(link => <SocialIcon key={link} url={link} />)}
                              {currentCandidate.twitters?.map(link => <SocialIcon key={link} url={link} />)}
                        </div>
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
                    <InfoCard title="Etiquetas" icon="label">
                         <div className="flex flex-wrap gap-2">
                             {currentCandidate.tags.map(tag => <Badge key={tag} text={tag} color="blue" />)}
                             <button onClick={handleSuggestTags} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"><span className="material-symbols-outlined !text-sm mr-1">auto_awesome</span>Sugerir con IA</button>
                         </div>
                         {suggestedTags.length > 0 && <div className="border-t mt-4 pt-4 flex flex-wrap gap-2">{suggestedTags.map(t => <button key={t} onClick={() => handleAddTag(t)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-200">+ {t}</button>)}</div>}
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
