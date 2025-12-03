
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Prospect, User, Note, ActivityLog, ProspectStage, Priority } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { usePhone } from '../contexts/PhoneContext';

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({ title, children, className, action }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {action}
        </div>
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
        <InfoCard title="Historial de Actividad" className="h-full">
            {activities.length > 0 ? (
                 <ul className="space-y-0 relative">
                     <div className="absolute top-0 bottom-0 left-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                     {activities.map((activity) => {
                        const author = usersMap.get(activity.userId);
                        return (
                            <li key={activity.id} className="relative pl-10 py-4 first:pt-0 last:pb-0">
                                <div className={`absolute left-0 top-4 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 bg-indigo-100 text-indigo-600`}>
                                    <span className="material-symbols-outlined !text-sm">{iconMap[activity.type] || 'circle'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {author?.name || 'Sistema'} &bull; {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        )
                     })}
                 </ul>
            ) : (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">No hay actividades registradas.</p>
            )}
        </InfoCard>
    );
};

const ProspectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: prospect, loading: prospectLoading } = useDoc<Prospect>('prospects', id || '');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    const { data: allActivities, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
    const { makeCall } = usePhone();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();

    const [currentStage, setCurrentStage] = useState<ProspectStage | undefined>(undefined);

    useEffect(() => {
        if (prospect) {
            setCurrentStage(prospect.stage);
        }
    }, [prospect]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
    const owner = useMemo(() => usersMap.get(prospect?.ownerId || ''), [usersMap, prospect]);

    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes.filter(n => n.prospectId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const activities = useMemo(() => {
        if (!allActivities || !id) return [];
        return allActivities.filter(a => a.prospectId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allActivities, id]);

    const handleStatusChange = async (val: string) => {
        const newStatus = val as ProspectStage;
        setCurrentStage(newStatus);
        if (prospect && id) {
             try {
                await api.updateDoc('prospects', id, { stage: newStatus });
                // Log activity
                const log: Omit<ActivityLog, 'id'> = {
                    prospectId: id,
                    type: 'Cambio de Estado',
                    description: `Etapa cambiada de "${prospect.stage}" a "${newStatus}"`,
                    userId: currentUser?.id || 'system',
                    createdAt: new Date().toISOString()
                };
                await api.addDoc('activities', log);
                showToast('success', 'Etapa actualizada');
             } catch (error) {
                 console.error(error);
                 showToast('error', 'Error al actualizar etapa');
             }
        }
    };

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            showToast('success', 'Nota guardada');
        } catch (error) {
            console.error(error);
            showToast('error', 'Error al guardar nota');
        }
    };

    if (prospectLoading || usersLoading || notesLoading || activitiesLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (!prospect) return <div className="text-center py-12">Prospecto no encontrado</div>;

    const stageOptions = Object.values(ProspectStage).map(s => ({ value: s, name: s }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{prospect.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {prospect.industry && <span>{prospect.industry}</span>}
                        {prospect.origin && (
                            <>
                                <span>•</span>
                                <span>Origen: {prospect.origin}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-48">
                         <CustomSelect options={stageOptions} value={currentStage || ''} onChange={handleStatusChange} />
                    </div>
                    <Link to={`/hubs/prospects/${id}/edit`} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px] flex items-center">
                        Editar
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <InfoCard title="Información de Contacto">
                        <div className="space-y-1">
                            {prospect.phone ? (
                                <InfoRow 
                                    label="Teléfono" 
                                    value={
                                        <button 
                                            onClick={() => makeCall(prospect.phone!, prospect.name)} 
                                            className="text-indigo-600 hover:underline hover:text-indigo-800 font-medium flex items-center gap-1 justify-end w-full"
                                        >
                                            <span className="material-symbols-outlined text-sm">call</span>
                                            {prospect.phone}
                                        </button>
                                    } 
                                />
                            ) : (
                                <InfoRow label="Teléfono" value="N/A" />
                            )}
                            <InfoRow label="Email" value={prospect.email ? <a href={`mailto:${prospect.email}`} className="text-indigo-600 hover:underline">{prospect.email}</a> : 'N/A'} />
                            <InfoRow label="Sitio Web" value={prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{prospect.website}</a> : 'N/A'} />
                            <InfoRow label="Dirección" value={prospect.address || 'N/A'} />
                        </div>
                    </InfoCard>
                    
                    <NotesSection 
                        entityId={id || ''}
                        entityType="prospect"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Detalles del Prospecto">
                        <InfoRow label="Valor Estimado" value={`$${prospect.estValue.toLocaleString()}`} />
                        <InfoRow label="Prioridad" value={<Badge text={prospect.priority} />} />
                        <InfoRow label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow label="Creado" value={new Date(prospect.createdAt).toLocaleDateString()} />
                    </InfoCard>

                    <ActivityFeed activities={activities} usersMap={usersMap} />
                </div>
            </div>
        </div>
    );
};

export default ProspectDetailPage;
