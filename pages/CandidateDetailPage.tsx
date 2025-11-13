

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Candidate, Note, ActivityLog, CandidateStatus, CandidateTag, CandidateAiAnalysis, Review, Product, RejectionReason, BlacklistReason, Prospect, ProspectStage } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS, MOCK_MY_COMPANIES, api } from '../data/mockData';
import { GoogleGenAI, Type } from '@google/genai';
import Drawer from '../components/ui/Drawer';
import FilterButton from '../components/ui/FilterButton';


const ActionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    reasons: string[];
    onConfirm: (reason: string, notes?: string) => void;
    requiresNotes?: boolean;
}> = ({ isOpen, onClose, title, reasons, onConfirm, requiresNotes = false }) => {
    const [reason, setReason] = useState(reasons[0] || '');
    const [notes, setNotes] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl m-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo</label>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex w-full items-center justify-between gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            <span>{reason}</span>
                            <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                {isDropdownOpen ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1">
                                {reasons.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => { setReason(r); setIsDropdownOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {requiresNotes && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas (Opcional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg space-x-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={() => onConfirm(reason, notes)} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-red-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};


const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let iconName = 'public';
    let brandColor = 'text-slate-500';

    if (url.includes('linkedin.com')) { iconName = 'linkedin'; brandColor = 'text-blue-700'; }
    else if (url.includes('facebook.com')) { iconName = 'facebook'; brandColor = 'text-blue-600'; }
    else if (url.includes('twitter.com') || url.includes('x.com')) { iconName = 'twitter'; brandColor = 'text-slate-500'; }
    else if (url.includes('instagram.com')) { iconName = 'instagram'; brandColor = 'text-pink-500'; }
    else if (url.includes('youtube.com')) { iconName = 'youtube'; brandColor = 'text-red-600'; }

    // Dummy SVGs for brands not in material symbols
    if (['linkedin', 'facebook', 'twitter', 'instagram', 'youtube'].includes(iconName)) {
        return (
            <svg className={`w-4 h-4 ${brandColor}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {iconName === 'linkedin' && <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />}
                {iconName === 'facebook' && <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />}
                {/* Add other SVG paths if needed */}
            </svg>
        );
    }

    return <span className={`material-symbols-outlined !text-base ${brandColor}`}>{iconName}</span>;
}


interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, candidate }) => {
    if (!isOpen || !candidate) return null;

    const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(candidate.address || candidate.name)}&output=embed`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{candidate.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                    </button>
                </div>
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="lg:w-2/3 w-full h-1/2 lg:h-full">
                        <iframe
                            className="w-full h-full border-0"
                            loading="lazy"
                            allowFullScreen
                            src={mapEmbedUrl}>
                        </iframe>
                    </div>
                    <div className="lg:w-1/3 w-full h-1/2 lg:h-full overflow-y-auto p-4 space-y-4">
                        {candidate.imageUrl && <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-40 object-cover rounded-lg" />}
                        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">{candidate.name}</h3>
                        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                             <p><span className="font-semibold">Categorías:</span> {candidate.rawCategories?.join(', ')}</p>
                             <p><span className="font-semibold">Dirección:</span> {candidate.address}</p>
                             <p><span className="font-semibold">Teléfono:</span> {candidate.phone}</p>
                             <a href={candidate.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline block truncate">Visitar sitio web</a>
                        </div>
                        
                        {candidate.reviews && candidate.reviews.length > 0 && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <h4 className="font-semibold text-md mb-2 text-slate-800 dark:text-slate-200">Reseñas</h4>
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {candidate.reviews.map((review, index) => (
                                        <div key={index} className="text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                            <div className="flex items-center">
                                               {[...Array(5)].map((_, i) => <span key={i} className={`material-symbols-outlined !text-sm ${i < review.rating ? 'text-yellow-500' : 'text-slate-300'}`}>star</span>)}
                                                <span className="font-semibold ml-2">{review.author}</span>
                                            </div>
                                            <p className="mt-1">{review.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const InfoCard: React.FC<{ title: string; children: React.ReactNode, icon?: string, className?: string }> = ({ title, icon, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const user = MOCK_USERS[note.userId];
    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};

const NotesSection: React.FC<{
    notes: Note[];
    onAddNote: (text: string) => void;
}> = ({ notes, onAddNote }) => {
    const [newNote, setNewNote] = useState('');

    const handleAddNote = () => {
        if (newNote.trim() === '') return;
        onAddNote(newNote);
        setNewNote('');
    };

    return (
        <div className="space-y-4">
            <div>
                <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escribe una nueva nota..."
                    className="w-full"
                />
                <div className="text-right mt-2">
                    <button onClick={handleAddNote} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-indigo-700">
                        Agregar Nota
                    </button>
                </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {notes.length > 0 ? notes.map(note => (
                   <NoteCard key={note.id} note={note} />
                )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay notas para este candidato.</p>}
            </div>
        </div>
    );
};


const ActivityItem: React.FC<{ log: ActivityLog }> = ({ log }) => {
    const user = MOCK_USERS[log.userId];
    const iconMap: Record<ActivityLog['type'], string> = {
        'Llamada': 'call', 'Email': 'email', 'Reunión': 'groups', 'Nota': 'note',
        'Vista de Perfil': 'visibility', 'Análisis IA': 'auto_awesome', 'Cambio de Estado': 'change_circle', 'Sistema': 'dns'
    };
    return (
         <li className="relative flex gap-x-4">
            <div className="absolute left-0 top-0 flex w-8 justify-center -bottom-6">
              <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div className="relative flex h-8 w-8 flex-none items-center justify-center bg-white dark:bg-slate-800">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
                <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">{iconMap[log.type]}</span>
              </div>
            </div>
            <div className="flex-auto py-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {log.description} por <span className="font-medium text-slate-900 dark:text-slate-200">{user?.name || 'Sistema'}</span>
              </p>
              <time dateTime={log.createdAt} className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {new Date(log.createdAt).toLocaleString()}
              </time>
            </div>
        </li>
    );
};

const useOutsideAlerter = (ref: React.RefObject<HTMLDivElement>, setOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, setOpen]);
}

const CandidateDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: candidate, loading, error } = useDoc<Candidate>('candidates', id || '');
    const { data: products } = useCollection<Product>('products');

    const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    const currentUser = MOCK_USERS['user-1'];

    const [newTag, setNewTag] = useState('');
    
    const [isGoalOpen, setIsGoalOpen] = useState(false);
    const [isProductOpen, setIsProductOpen] = useState(false);
    const goalDropdownRef = useRef<HTMLDivElement>(null);
    const productDropdownRef = useRef<HTMLDivElement>(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    // Modals for actions
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
    
    // State for AI script tabs
    const [activeScriptTab, setActiveScriptTab] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp');
    
    useOutsideAlerter(goalDropdownRef, setIsGoalOpen);
    useOutsideAlerter(productDropdownRef, setIsProductOpen);

    useEffect(() => {
        if (candidate) {
            const hasViewed = candidate.activityLog.some(log => log.type === 'Vista de Perfil' && log.userId === currentUser.id);
            if (!hasViewed) {
                const viewLog: ActivityLog = { id: `log-${Date.now()}`, candidateId: candidate.id, type: 'Vista de Perfil', description: `perfil visto`, userId: currentUser.id, createdAt: new Date().toISOString() };
                setCurrentCandidate({...candidate, activityLog: [viewLog, ...candidate.activityLog]});
            } else {
                 setCurrentCandidate(candidate);
            }
        }
    }, [candidate, currentUser.id]);
    
    const addActivityLog = async (type: ActivityLog['type'], description: string) => {
        if (!currentCandidate) return;
        const log: ActivityLog = {
            id: `log-${Date.now()}`,
            candidateId: currentCandidate.id,
            type,
            description,
            userId: currentUser.id,
            createdAt: new Date().toISOString()
        };
        await api.addDoc('activities', log);
        setCurrentCandidate(prev => prev ? { ...prev, activityLog: [log, ...prev.activityLog] } : null);
    };

    const handleApprove = async () => {
        if (!currentCandidate) return;

        const newProspect: Prospect = {
            id: `prospect-${Date.now()}`,
            name: currentCandidate.name,
            stage: ProspectStage.Nueva,
            ownerId: currentUser.id,
            createdById: currentUser.id,
            estValue: 0,
            createdAt: new Date().toISOString(),
            origin: 'Prospección IA',
        };

        await api.addDoc('prospects', newProspect);
        await handleStatusChange(CandidateStatus.Aprobado, 'Aprobado y convertido en prospecto');

        alert('Candidato Aprobado. Redirigiendo al nuevo prospecto...');
        navigate(`/crm/prospects/${newProspect.id}`);
    };

    const handleReject = (reason: string) => {
        handleStatusChange(CandidateStatus.Rechazado, `Rechazado (Motivo: ${reason})`);
        setIsRejectModalOpen(false);
    };

    const handleBlacklist = (reason: string, notes?: string) => {
        const description = `Añadido a Lista Negra (Motivo: ${reason})` + (notes ? ` - ${notes}` : '');
        handleStatusChange(CandidateStatus.ListaNegra, description);
        setIsBlacklistModalOpen(false);
    };

    const handleStatusChange = async (newStatus: CandidateStatus, description: string) => {
        if (!currentCandidate) return;
        const oldStatus = currentCandidate.status;
        await api.updateDoc('candidates', currentCandidate.id, { status: newStatus });
        setCurrentCandidate(prev => prev ? { ...prev, status: newStatus } : null);
        addActivityLog('Cambio de Estado', `cambió el estado de "${oldStatus}" a "${description}"`);
    };

    const handleManualUpdate = (field: 'assignedCompanyId' | 'manuallyAssignedProductId', value: string) => {
        if (!currentCandidate) return;
        const oldValue = currentCandidate[field];
        setCurrentCandidate(prev => prev ? { ...prev, [field]: value } : null);
        const fieldName = field === 'assignedCompanyId' ? 'Objetivo' : 'Producto';
        const prettyValue = field === 'assignedCompanyId' ? MOCK_MY_COMPANIES.find(c => c.id === value)?.name : products?.find(p => p.id === value)?.name;
        addActivityLog('Sistema', `cambió ${fieldName} a "${prettyValue || value}"`);
    };

    const handleAddNote = (text: string) => {
        if (!currentCandidate) return;
        const note: Note = {
            id: `note-${Date.now()}`,
            candidateId: currentCandidate.id,
            text,
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
        };
        setCurrentCandidate(prev => prev ? { ...prev, notes: [note, ...prev.notes] } : null);
        addActivityLog('Nota', 'agregó una nota');
    };

    const handleAddTag = (tag: CandidateTag) => {
        if (tag.trim() && currentCandidate && !currentCandidate.tags.includes(tag)) {
            const updatedTags = [...currentCandidate.tags, tag];
            setCurrentCandidate(prev => prev ? { ...prev, tags: updatedTags } : null);
            addActivityLog('Sistema', `agregó la etiqueta "${tag}"`);
        }
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove: CandidateTag) => {
        if (!currentCandidate) return;
        const updatedTags = currentCandidate.tags.filter(tag => tag !== tagToRemove);
        setCurrentCandidate(prev => prev ? { ...prev, tags: updatedTags } : null);
        addActivityLog('Sistema', `eliminó la etiqueta "${tagToRemove}"`);
    };
    
    const handleAiQualification = async () => {
        if (!currentCandidate) return;
        setIsLoadingAI(true);
        setAiError('');

        try {
            const context = `
                - Nombre: ${currentCandidate.name}
                - Dirección: ${currentCandidate.address}
                - Teléfono: ${currentCandidate.phone}
                - Email: ${currentCandidate.email}
                - Sitio Web: ${currentCandidate.website}
                - Categorías de Google: ${currentCandidate.rawCategories?.join(', ')}
                - Reseñas de Google: ${currentCandidate.reviews?.map(r => `- "${r.text}" (${r.rating} estrellas)`).join('\n') || 'Ninguna'}
            `;
            const prompt = `
                Actúa como un analista de negocios experto para un CRM que vende productos para estas 3 empresas: Puredef (enfocada en transporte y logística), Trade Aitirik (insumos agrícolas), y Santzer (insumos agrícolas).
                Nuestras macro categorías son: 'Puredef: Transporte y Logística', 'Trade Aitirik: Insumos Agrícolas', 'Industrial Revenue: Industria y Manufactura', 'Commerce and resale for distributors'.

                Basado en la siguiente información de un negocio extraído de Google Maps, proporciona un análisis estructurado en formato JSON. Si el negocio tiene un sitio web, visítalo para extraer información de contacto adicional.

                Información del Negocio:
                ${context}

                Tu análisis debe incluir:
                1. "suggestedCategory": Una de nuestras macro categorías.
                2. "suggestedSubCategory": Una subcategoría más específica (ej: 'Transporte de Carga', 'Vivero').
                3. "relevantProducts": Un array de strings con productos relevantes (ej: 'Urea líquida para SCR', 'Urea agrícola', 'Sulfato de Amonio').
                4. "profileSummary": Un resumen de 2-3 frases describiendo el negocio y su potencial.
                5. "confidenceScore": Un número del 0 al 100 de tu confianza en la calificación.
                6. "nextActionSuggestion": Una sugerencia clara y accionable.
                7. "communicationScripts": Un objeto con tres guiones cortos y directos para un primer contacto: "whatsapp", "phone", y "email".
                8. "socialMediaLinks": Un array de strings con URLs de redes sociales.
                9. "additionalEmails": Un array de strings con todos los emails de contacto encontrados.
                10. "additionalPhones": Un array de strings con todos los teléfonos de contacto encontrados.
            `;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestedCategory: { type: Type.STRING },
                            suggestedSubCategory: { type: Type.STRING },
                            relevantProducts: { type: Type.ARRAY, items: { type: Type.STRING } },
                            profileSummary: { type: Type.STRING },
                            confidenceScore: { type: Type.NUMBER },
                            nextActionSuggestion: { type: Type.STRING },
                            communicationScripts: { 
                                type: Type.OBJECT,
                                properties: {
                                    whatsapp: { type: Type.STRING },
                                    phone: { type: Type.STRING },
                                    email: { type: Type.STRING },
                                },
                                required: ['whatsapp', 'phone', 'email'],
                            },
                            socialMediaLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            additionalEmails: { type: Type.ARRAY, items: { type: Type.STRING } },
                            additionalPhones: { type: Type.ARRAY, items: { type: Type.STRING } },
                        }
                    }
                }
            });
            
            const result: CandidateAiAnalysis = JSON.parse(response.text);
            setCurrentCandidate(prev => prev ? {...prev, aiAnalysis: result} : null);
            addActivityLog('Análisis IA', 'realizó un análisis con IA');

        } catch (error) {
            console.error("Error with Gemini AI qualification:", error);
            setAiError("No se pudo obtener el análisis de la IA. Inténtalo de nuevo.");
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const allEmails = useMemo(() => {
        const emails = new Set<string>();
        if (currentCandidate?.email) emails.add(currentCandidate.email);
        currentCandidate?.aiAnalysis?.additionalEmails?.forEach(email => emails.add(email));
        return Array.from(emails);
    }, [currentCandidate]);

    const allPhones = useMemo(() => {
        const phones = new Set<string>();
        if (currentCandidate?.phone) phones.add(currentCandidate.phone);
        currentCandidate?.aiAnalysis?.additionalPhones?.forEach(phone => phones.add(phone));
        return Array.from(phones);
    }, [currentCandidate]);

    const availableTags: CandidateTag[] = ['Alto Potencial', 'Potencial Distribuidor', 'Consumidor Directo', 'Para seguimiento', 'No Relevante'];
    const suggestedTags = availableTags.filter(t => !currentCandidate?.tags.includes(t));

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !currentCandidate) return <div className="text-center p-12">Candidato no encontrado</div>;
    
    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <InfoCard title="Información de Contacto" icon="info">
                    <p className="text-sm"><strong>Teléfono:</strong> {currentCandidate.phone || 'N/A'}</p>
                    <p className="text-sm"><strong>Email:</strong> {currentCandidate.email || 'N/A'}</p>
                    <p className="text-sm">
                        <strong>Sitio Web:</strong>{' '}
                        {currentCandidate.website ? (
                            <a href={currentCandidate.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate block">
                                {currentCandidate.website}
                            </a>
                        ) : (
                            'N/A'
                        )}
                    </p>
                    <p className="text-sm"><strong>Dirección:</strong> {currentCandidate.address || 'N/A'}</p>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 space-y-2">
                        <button onClick={() => setIsMapModalOpen(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">wysiwyg</span>
                            Ver ficha interactiva
                        </button>
                        {currentCandidate.googleMapsUrl && (
                            <a href={currentCandidate.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">open_in_new</span>
                                Abrir en Google Maps
                            </a>
                        )}
                    </div>
                </InfoCard>

                <InfoCard title="Acciones Rápidas" icon="bolt">
                    <div className="flex flex-col space-y-2">
                        <button onClick={handleApprove} className="w-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-sm font-semibold py-2 px-3 rounded-lg hover:bg-green-200 dark:hover:bg-green-500