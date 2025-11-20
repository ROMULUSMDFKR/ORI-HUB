


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

const DetailTabButton: React.FC<{ active: boolean, onClick: () => void, label: string, icon: string }> = ({ active, onClick, label, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            active 
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'
        }`}
    >
        <span className="material-symbols-outlined !text-lg">{icon}</span>
        {label}
    </button>
);

const RatingStars: React.FC<{ rating: number, count?: number }> = ({ rating, count }) => {
    return (
        <div className="flex items-center gap-1" title={`${rating} de 5 estrellas`}>
            <span className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="material-symbols-outlined !text-lg" style={{ fontVariationSettings: `'FILL' ${star <= Math.round(rating) ? 1 : 0}` }}>star</span>
                ))}
            </span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{rating.toFixed(1)}</span>
            {count !== undefined && <span className="text-xs text-slate-500 dark:text-slate-400">({count.toLocaleString()} reseñas)</span>}
        </div>
    );
};

const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let iconName = 'public';
    if (!url) return null;
    
    const icons: Record<string, { path: string; brandColor: string }> = {
        linkedin: { path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z", brandColor: 'text-blue-700 dark:text-blue-500' },
        facebook: { path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z", brandColor: 'text-blue-600 dark:text-blue-400' },
        instagram: { path: "M12 2.163c3.204 0 3.584.012 4.85.07 1.272.058 2.164.332 2.923.644.802.321 1.455.787 2.122 1.455.666.666 1.134 1.32 1.455 2.122.312.759.586 1.651.644 2.923.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.058 1.272-.332 2.164-.644 2.923-.321.802-.787 1.455-1.455 2.122-.666.666-1.32 1.134-2.122 1.455-.759.312-1.651.586-2.923.644-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.272-.058-2.164-.332-2.923-.644-.802-.321-1.455-.787-2.122-1.455-.666-.666-1.134-1.32-1.455-2.122-.312-.759-.586-1.651-.644-2.923-.058-1.646-.07-4.85s.012-3.584.07-4.85c.058-1.272.332-2.164.644-2.923.321.802.787 1.455 1.455-2.122.666.666 1.32-1.134 2.122-1.455.759-.312 1.651-.586 2.923-.644 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.356.06-2.305.328-3.122.656-.843.334-1.594.8-2.313 1.523-.718.72-1.189 1.47-1.522 2.313-.328.817-.596 1.766-.656 3.122-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.06 1.356.328 2.305.656 3.122.334.843.8 1.594 1.522 2.313.72.718 1.47 1.189 2.313 1.522.817.328 1.766.596 3.122.656 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.356-.06 2.305-.328 3.122-.656.843-.334 1.594-.8 2.313-1.522.718-.72 1.189-1.47 1.522-2.313.328-.817-.596-1.766-.656-3.122.058-1.688.072-4.947s-.014-3.667-.072-4.947c-.06-1.356-.328-2.305-.656-3.122-.334-.843-.8-1.594-1.522-2.313-.72-.718-1.47-1.189-2.313-1.522-.817-.328-1.766-.596-3.122-.656-1.28-.058-1.688-.072-4.947-.072z", brandColor: 'text-pink-600 dark:text-pink-400'},
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
        return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity inline-block"><svg className={`w-6 h-6 ${icons[iconName].brandColor}`} fill="currentColor" viewBox="0 0 24 24"><path d={icons[iconName].path} /></svg></a>;
    }

    return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity inline-block"><span className="material-symbols-outlined !text-2xl text-slate-500">{iconName}</span></a>;
}

const InfoCard: React.FC<{ title?: string; children: React.ReactNode; icon?: string; className?: string, action?: React.ReactNode }> = ({ title, icon, children, className, action }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        {title && (
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
                    {title}
                </h3>
                {action}
            </div>
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

const OpeningHours: React.FC<{ hours: { day: string, hours: string }[] }> = ({ hours }) => {
    if (!hours || hours.length === 0) return <p className="text-sm text-slate-500 italic">Horario no disponible</p>;

    const daysMap: Record<string, string> = {
        'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles', 'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
    };

    // Reorder to start from Monday if needed, currently usually sorted by Google
    
    return (
        <div className="text-sm space-y-1">
            {hours.map((h, idx) => (
                <div key={idx} className="flex justify-between">
                    <span className="font-medium text-slate-600 dark:text-slate-400 w-24">{daysMap[h.day] || h.day}</span>
                    <span className="text-slate-800 dark:text-slate-200">{h.hours}</span>
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
    
    // Fetch notes from the global notes collection, filtered by candidateId
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    const [notes, setNotes] = useState<Note[]>([]);

    const { showToast } = useToast();
    
    const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    const [activeTab, setActiveTab] = useState<'resumen' | 'horarios' | 'mercado' | 'multimedia'>('resumen');
    
    const { user: currentUser, loading: authLoading } = useAuth();
    
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const brand = useMemo(() => {
        if (!currentCandidate?.brandId || !brands) return null;
        return brands.find(b => b.id === currentCandidate.brandId);
    }, [currentCandidate, brands]);

    const { allEmails, allPhones } = useMemo(() => {
        if (!currentCandidate) return { allEmails: [], allPhones: [] };
        
        const emails = new Set<string>();
        if (currentCandidate.email) emails.add(currentCandidate.email);
        if (currentCandidate.emails) currentCandidate.emails.forEach(e => e && emails.add(e));
        // Also check AI analysis for extra contact info if available
        if (currentCandidate.aiAnalysis?.additionalEmails) currentCandidate.aiAnalysis.additionalEmails.forEach(e => e && emails.add(e));


        const phones = new Set<string>();
        if (currentCandidate.phone) phones.add(currentCandidate.phone);
        if (currentCandidate.phones) currentCandidate.phones.forEach(p => p && phones.add(p));
        if (currentCandidate.aiAnalysis?.additionalPhones) currentCandidate.aiAnalysis.additionalPhones.forEach(p => p && phones.add(p));

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

    // Sync notes from the collection
    useEffect(() => {
        if (allNotes && id) {
            setNotes(allNotes.filter(n => n.candidateId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
    }, [allNotes, id]);
    
    const addActivityLog = async (type: ActivityLog['type'], description: string, candidateId: string) => {
        if (!currentUser) return;
        const log: ActivityLog = { id: `log-${Date.now()}`, candidateId, type, description, userId: currentUser.id, createdAt: new Date().toISOString() };
        await api.addDoc('activities', log);
        setCurrentCandidate(prev => prev ? { ...prev, activityLog: [log, ...prev.activityLog] } : null);
    };

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            // Optimistic update for immediate UI feedback
            setNotes(prev => [note, ...prev]);
            showToast('success', 'Nota agregada.');
        } catch (error) {
            console.error("Error adding note:", error);
            showToast('error', 'Error al agregar la nota.');
        }
    };

    const handleNoteDeleted = async (noteId: string) => {
        try {
            await api.deleteDoc('notes', noteId);
            // Optimistic update for immediate UI feedback
            setNotes(prev => prev.filter(n => n.id !== noteId));
            showToast('success', 'Nota eliminada.');
        } catch (error) {
            console.error("Error deleting note:", error);
            showToast('error', "Error al eliminar la nota.");
        }
    };

    const handleStatusChange = async (status: CandidateStatus, description: string) => {
        if (!currentCandidate) return;
        const oldStatus = currentCandidate.status;
        await api.updateDoc('candidates', currentCandidate.id, { status });
        setCurrentCandidate(prev => prev ? { ...prev, status } : null);
        addActivityLog('Cambio de Estado', `cambió el estado de "${oldStatus}" a "${description}"`, currentCandidate.id);
        showToast('success', `Estado actualizado a ${status}`);
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
        
        const candidateNotes = notes
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
    
    const completenessColor = profileCompleteness >= 80 ? 'green' : profileCompleteness >= 50 ? 'yellow' : 'red';

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
            
            Datos del Candidato:
            Nombre: ${currentCandidate.name}
            Dirección: ${currentCandidate.address || 'No disponible'}
            Categorías Originales: ${currentCandidate.rawCategories?.join(', ') || 'No disponible'}
            Sitio Web: ${currentCandidate.website || 'No disponible'}
            Descripción: ${currentCandidate.description || 'No disponible'}
            Tags de reseñas: ${currentCandidate.reviewsTags?.map(t=>t.title).join(', ') || 'N/A'}`;

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
            showToast('success', 'Análisis IA completado.');

        } catch (err) {
            console.error("Error with Gemini AI:", err);
            setAiError("No se pudo completar el análisis. Inténtalo de nuevo.");
            showToast('error', 'Error al ejecutar análisis IA.');
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleSuggestTags = async () => {
        if (!currentCandidate) return;
        try {
             const prompt = `Basado en la información de este candidato (nombre: "${currentCandidate.name}", categorías: "${currentCandidate.rawCategories?.join(', ')}", descripción: "${currentCandidate.description || ''}"), sugiere 3 etiquetas relevantes de negocio. Devuelve solo un array JSON de strings.`;
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
             const response = await ai.models.generateContent({ 
                 model: 'gemini-2.5-flash', 
                 contents: prompt,
                 config: { responseMimeType: 'application/json' }
             });
             
             const cleanedText = response.text.replace(/```json|```/g, '').trim();
             const tags = JSON.parse(cleanedText);
             
             setSuggestedTags(tags.filter((t: string) => !currentCandidate.tags.includes(t)));
        } catch (e) {
            console.error("Tag suggestion error", e);
             showToast('error', 'No se pudieron generar sugerencias.');
        }
    };
    
    const handleAddTag = async (tag: string) => {
        if (!currentCandidate) return;
        const newTags = [...currentCandidate.tags, tag];
        await api.updateDoc('candidates', currentCandidate.id, { tags: newTags });
        setCurrentCandidate(prev => prev ? { ...prev, tags: newTags } : null);
        setSuggestedTags(prev => prev.filter(t => t !== tag));
    };

    const openGoogleMaps = () => {
        if (currentCandidate?.googleMapsUrl) {
            window.open(currentCandidate.googleMapsUrl, '_blank');
        } else if (currentCandidate?.location) {
             window.open(`https://www.google.com/maps/search/?api=1&query=${currentCandidate.location.lat},${currentCandidate.location.lng}`, '_blank');
        } else if (currentCandidate?.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentCandidate.address)}`, '_blank');
        } else if (currentCandidate?.city || currentCandidate?.state) {
            const query = [currentCandidate.city, currentCandidate.state].filter(Boolean).join(', ');
             window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        } else {
            showToast('warning', 'No hay información suficiente para abrir el mapa.');
        }
    };
    
    const loading = candidateLoading || usersLoading || authLoading || brandsLoading || notesLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentCandidate) return <div className="text-center p-12">Candidato no encontrado</div>;
    
    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, name: s }));

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{currentCandidate.name}</h1>
                        <Badge text={`${profileCompleteness}% Info`} color={completenessColor} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 text-sm">
                        {currentCandidate.averageRating !== undefined && (
                            <RatingStars rating={currentCandidate.averageRating} count={currentCandidate.reviewCount} />
                        )}
                        {currentCandidate.price && (
                             <span className="ml-2 font-mono font-bold text-slate-600 dark:text-slate-300">{currentCandidate.price}</span>
                        )}
                        <span className="mx-2">•</span>
                        <span>{currentCandidate.rawCategories?.[0] || 'Sin Categoría'}</span>
                    </div>
                     {brand && (
                        <div className="flex items-center gap-2 mt-2">
                            <img src={brand.logoUrl} alt={brand.name} className="w-6 h-6 object-contain" />
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{brand.name}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                    <button 
                        onClick={openGoogleMaps}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 h-[42px] flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-red-500">map</span>
                        Mapa
                    </button>
                    <div className="w-full md:w-40">
                       <CustomSelect options={statusOptions} value={newStatus || ''} onChange={(val) => setNewStatus(val as CandidateStatus)} />
                    </div>
                    <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Contact Info */}
                <div className="lg:col-span-1 space-y-6">
                     <InfoCard title="Contacto" icon="contact_phone">
                        <div className="space-y-3">
                             {currentCandidate.website && (
                                <a href={currentCandidate.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="material-symbols-outlined text-slate-500">language</span>
                                    <span className="truncate">{currentCandidate.website.replace(/^https?:\/\//, '')}</span>
                                </a>
                            )}
                            {allPhones.map(phone => (
                                <a key={phone} href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="material-symbols-outlined text-slate-500">phone</span>
                                    {phone}
                                </a>
                            ))}
                             {allEmails.map(email => (
                                <a key={email} href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="material-symbols-outlined text-slate-500">email</span>
                                    <span className="truncate">{email}</span>
                                </a>
                            ))}
                            <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <span className="material-symbols-outlined text-slate-500 mt-0.5">location_on</span>
                                <span>
                                    {currentCandidate.address || 'Dirección no disponible'}
                                    <div className="text-xs text-slate-500 mt-1">{currentCandidate.city}, {currentCandidate.state}</div>
                                </span>
                            </div>
                        </div>
                         <div className="flex gap-4 justify-center pt-2 border-t border-slate-200 dark:border-slate-700 mt-4">
                             {currentCandidate.facebooks?.map(link => <SocialIcon key={link} url={link} />)}
                             {currentCandidate.linkedIns?.map(link => <SocialIcon key={link} url={link} />)}
                             {currentCandidate.instagrams?.map(link => <SocialIcon key={link} url={link} />)}
                             {currentCandidate.twitters?.map(link => <SocialIcon key={link} url={link} />)}
                             {(!currentCandidate.facebooks?.length && !currentCandidate.linkedIns?.length && !currentCandidate.instagrams?.length) && <span className="text-xs text-slate-400 italic">Sin redes sociales</span>}
                         </div>
                    </InfoCard>

                    <InfoCard title="Etiquetas" icon="label">
                         <div className="flex flex-wrap gap-2">
                             {currentCandidate.tags.map(tag => <Badge key={tag} text={tag} color="blue" />)}
                             {currentCandidate.rawCategories?.map(cat => <Badge key={cat} text={cat} color="gray" />)}
                             <button onClick={handleSuggestTags} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors"><span className="material-symbols-outlined !text-xs">auto_awesome</span>Sugerir</button>
                         </div>
                         {suggestedTags.length > 0 && <div className="border-t mt-4 pt-4 flex flex-wrap gap-2">{suggestedTags.map(t => <button key={t} onClick={() => handleAddTag(t)} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full hover:bg-green-100 border border-green-200">+ {t}</button>)}</div>}
                    </InfoCard>
                </div>

                {/* Center/Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Tabs Navigation */}
                    <div className="border-b border-slate-200 dark:border-slate-700 flex space-x-2 overflow-x-auto">
                        <DetailTabButton active={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')} label="Resumen & IA" icon="dashboard" />
                        <DetailTabButton active={activeTab === 'horarios'} onClick={() => setActiveTab('horarios')} label="Horarios & Info" icon="schedule" />
                        <DetailTabButton active={activeTab === 'mercado'} onClick={() => setActiveTab('mercado')} label="Mercado" icon="query_stats" />
                        <DetailTabButton active={activeTab === 'multimedia'} onClick={() => setActiveTab('multimedia')} label="Multimedia" icon="perm_media" />
                    </div>

                    {activeTab === 'resumen' && (
                        <>
                            <InfoCard title="Análisis con IA" icon="auto_awesome">
                                {isLoadingAI ? <div className="flex justify-center items-center h-32"><Spinner /></div> : 
                                aiError ? <p className="text-red-500 text-sm text-center">{aiError}</p> :
                                currentCandidate.aiAnalysis ? (
                                    <div className="space-y-4 text-sm">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Resumen del Perfil</h4>
                                            <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">{currentCandidate.aiAnalysis.profileSummary}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                                                <h4 className="font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide mb-1">Categoría Sugerida</h4>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{currentCandidate.aiAnalysis.suggestedCategory}</p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/30">
                                                <h4 className="font-semibold text-green-700 dark:text-green-400 text-xs uppercase tracking-wide mb-1">Siguiente Acción</h4>
                                                <p className="font-medium text-green-800 dark:text-green-300">{currentCandidate.aiAnalysis.nextActionSuggestion}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base">chat</span> Guiones de Comunicación
                                            </h4>
                                            <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
                                                 <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                                    {['whatsapp', 'phone', 'email'].map(mode => (
                                                        <button 
                                                            key={mode}
                                                            onClick={() => setAiScriptTab(mode as any)}
                                                            className={`flex-1 py-2 text-xs font-semibold uppercase ${aiScriptTab === mode ? 'bg-white dark:bg-slate-700 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                        >
                                                            {mode}
                                                        </button>
                                                    ))}
                                                 </div>
                                                 <div className="p-4 bg-white dark:bg-slate-800">
                                                     <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{currentCandidate.aiAnalysis.communicationScripts[aiScriptTab]}</p>
                                                     <button 
                                                        onClick={() => {navigator.clipboard.writeText(currentCandidate.aiAnalysis!.communicationScripts[aiScriptTab]); showToast('success', 'Copiado al portapapeles')}} 
                                                        className="mt-3 text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                                                     >
                                                         <span className="material-symbols-outlined !text-sm">content_copy</span> Copiar guion
                                                     </button>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-500 mb-4">No se ha ejecutado un análisis para este candidato.</p>
                                        <button onClick={handleRunAiAnalysis} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 mx-auto gap-2"><span className="material-symbols-outlined">psychology</span>Calificar con IA</button>
                                    </div>
                                )}
                            </InfoCard>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <NotesSection
                                    entityId={currentCandidate.id}
                                    entityType="candidate"
                                    notes={notes}
                                    onNoteAdded={handleNoteAdded}
                                    onNoteDeleted={handleNoteDeleted}
                                />
                                <ActivityFeed activities={currentCandidate.activityLog} usersMap={usersMap} />
                            </div>
                        </>
                    )}

                    {activeTab === 'horarios' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoCard title="Horarios de Apertura" icon="schedule">
                                <OpeningHours hours={currentCandidate.openingHours || []} />
                            </InfoCard>
                            <InfoCard title="Información Adicional" icon="info">
                                {currentCandidate.description && (
                                    <div className="mb-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</h4>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{currentCandidate.description}</p>
                                    </div>
                                )}
                                {currentCandidate.questionsAndAnswers && currentCandidate.questionsAndAnswers.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Preguntas Frecuentes (Google)</h4>
                                        <ul className="space-y-3">
                                            {currentCandidate.questionsAndAnswers.slice(0,3).map((qa: any, idx: number) => (
                                                <li key={idx} className="text-sm">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">P: {qa.question}</p>
                                                    <p className="text-slate-600 dark:text-slate-400">R: {qa.answer}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </InfoCard>
                        </div>
                    )}

                    {activeTab === 'mercado' && (
                        <div className="grid grid-cols-1 gap-6">
                             <InfoCard title="Lo que dice la gente (Tags de Reseñas)" icon="reviews">
                                {currentCandidate.reviewsTags && currentCandidate.reviewsTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {currentCandidate.reviewsTags.map((tag, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                                {tag.title}
                                                <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 text-xs px-1.5 rounded-full">{tag.count}</span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No hay etiquetas de reseñas disponibles.</p>
                                )}
                            </InfoCard>

                            <InfoCard title="La gente también busca (Competidores/Relacionados)" icon="compare_arrows">
                                {currentCandidate.peopleAlsoSearch && currentCandidate.peopleAlsoSearch.length > 0 ? (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {currentCandidate.peopleAlsoSearch.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5"><span className="material-symbols-outlined !text-xs">star</span> {item.totalScore}</span>
                                                        <span className="text-xs text-slate-400">({item.reviewsCount})</span>
                                                    </div>
                                                </div>
                                                <button className="text-xs text-indigo-600 font-medium hover:underline" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title)}`, '_blank')}>Buscar</button>
                                            </div>
                                        ))}
                                     </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No hay datos de búsquedas relacionadas.</p>
                                )}
                            </InfoCard>
                        </div>
                    )}

                    {activeTab === 'multimedia' && (
                        <InfoCard title="Galería de Imágenes" icon="photo_library">
                            {currentCandidate.images && currentCandidate.images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {currentCandidate.images.map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100 relative group">
                                            <img src={img.url} alt={`Local ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                            <a href={img.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="material-symbols-outlined text-white">open_in_new</span>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic py-8 text-center">No hay imágenes disponibles.</p>
                            )}
                        </InfoCard>
                    )}

                </div>
            </div>
            
            <ActionModal isOpen={isRejectModalOpen} onClose={() => { setIsRejectModalOpen(false); setNewStatus(currentCandidate.status); }} title="Rechazar Candidato" reasons={Object.values(RejectionReason)} onConfirm={handleReject}/>
            <ActionModal isOpen={isBlacklistModalOpen} onClose={() => { setIsBlacklistModalOpen(false); setNewStatus(currentCandidate.status); }} title="Añadir a Lista Negra" reasons={Object.values(BlacklistReason)} onConfirm={handleBlacklist}/>
        </>
    );
};

export default CandidateDetailPage;
