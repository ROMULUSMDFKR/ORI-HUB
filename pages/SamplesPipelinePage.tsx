
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { SAMPLES_PIPELINE_COLUMNS } from '../constants';
import { Sample, SampleStatus, ActivityLog, User } from '../types';
import SampleCard from '../components/hubs/SampleCard';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const PipelineColumn: React.FC<{
  stage: SampleStatus;
  objective: string;
  items: Sample[];
}> = ({ stage, objective, items }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 px-1 group relative">
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                {items.length}
            </span>
        </div>

        {/* Info Icon with Tooltip */}
        <div className="relative">
            <span className="material-symbols-outlined text-slate-400 hover:text-indigo-500 cursor-help text-lg">info</span>
            <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Objetivo de la Etapa</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
            </div>
        </div>
      </div>
      
      <div className="h-full overflow-y-auto pr-1 custom-scrollbar flex-1" style={{maxHeight: 'calc(100vh - 220px)'}}>
        {items.map(item => (
            <div key={item.id} data-id={item.id}>
                <SampleCard item={item} onDragStart={()=>{}} onArchive={()=>{}} />
            </div>
        ))}
         {items.length === 0 && (
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-1">
                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Sin muestras</p>
            </div>
        )}
      </div>
    </div>
  );
};


const SamplesPipelinePage: React.FC = () => {
  const { data: samplesData, loading: sLoading } = useCollection<Sample>('samples');
  const { data: activitiesData, loading: aLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');
  
  useEffect(() => {
    if (samplesData) {
      setSamples(samplesData);
      
      // Check for auto-archive
      const now = new Date().getTime();
      const hours24 = 24 * 60 * 60 * 1000;
      
      const toArchive = samplesData.filter(s => {
          if ((s.status === SampleStatus.Aprobada || s.status === SampleStatus.Cerrada) && s.closureDate) {
              const closureTime = new Date(s.closureDate).getTime();
              return (now - closureTime) > hours24;
          }
          return false;
      });

      if (toArchive.length > 0) {
          toArchive.forEach(async (s) => {
              try {
                  await api.updateDoc('samples', s.id, { status: SampleStatus.Archivada });
                  console.log(`Auto-archiving sample ${s.id}`);
              } catch (e) {
                  console.error("Error auto-archiving", e);
              }
          });
      }
    }
  }, [samplesData]);

  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);

  const loading = sLoading || aLoading || uLoading;
  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

  const groupedColumns = useMemo(() => {
    return SAMPLES_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof SAMPLES_PIPELINE_COLUMNS)[number][]>);
  }, []);
  
  const pipelineActivities = useMemo(() => {
    if (!activities) return [];
    const sampleIds = new Set(samples.map(s => s.id));
    return activities
      .filter(a => a.sampleId && sampleIds.has(a.sampleId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [samples, activities]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const cardElement = target.closest('[data-id]');
    if(cardElement){
        e.dataTransfer.setData('text/plain', cardElement.getAttribute('data-id') || '');
        e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleArchive = async (sampleId: string) => {
    const originalSample = samples.find(s => s.id === sampleId);
    if (!originalSample) return;

    setSamples(prev => prev.filter(s => s.id !== sampleId));
    try {
        await api.updateDoc('samples', sampleId, { status: SampleStatus.Archivada });
        showToast('success', 'Muestra archivada correctamente.');
    } catch (error) {
        showToast('error', 'No se pudo archivar la muestra.');
        setSamples(prev => [...prev, originalSample]);
    }
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: SampleStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !currentUser) return;

    if (targetStage === SampleStatus.Archivada) {
      handleArchive(itemId);
      return;
    }
    
    // Prevent dragging directly to Aprobada/Cerrada from pipeline view because it requires reason input
    // Users should open the card to close/approve
    if (targetStage === SampleStatus.Aprobada || targetStage === SampleStatus.Cerrada) {
        showToast('info', 'Para Aprobar o Cerrar una muestra, abre la tarjeta y usa el botón "Guardar Estado" para ingresar el motivo.');
        return;
    }

    const originalSample = samples.find(s => s.id === itemId);
    if (!originalSample || originalSample.status === targetStage) return;

    setSamples(prevItems =>
      prevItems.map(p =>
        p.id === itemId ? { ...p, status: targetStage } : p
      )
    );
    
    try {
        await api.updateDoc('samples', itemId, { status: targetStage });
        const activity: Omit<ActivityLog, 'id'> = {
            sampleId: itemId,
            type: 'Cambio de Estado',
            description: `Muestra movida de "${originalSample.status}" a "${targetStage}"`,
            userId: currentUser.id,
            createdAt: new Date().toISOString()
        };
        const newActivity = await api.addDoc('activities', activity);
        setActivities(prev => [newActivity, ...prev]);
    } catch(error) {
        showToast('error', 'No se pudo actualizar la etapa.');
        setSamples(prev => prev.map(p => p.id === itemId ? originalSample : p));
    }
  };
  
  const pipelineViews: ViewOption[] = [
    { id: 'pipeline', name: 'Pipeline', icon: 'view_kanban' },
    { id: 'list', name: 'Lista', icon: 'list' },
    { id: 'history', name: 'Historial', icon: 'history' },
  ];
  
  const renderContent = () => {
    if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;
    
    switch(view) {
        case 'pipeline':
            return (
                 <div className="flex-1 flex gap-8 overflow-x-auto pb-4" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col h-full">
                        <div className="px-3 pb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="flex gap-4 h-full">
                            {groupedColumns[groupName].map(col => {
                              // Filter samples for this stage
                              const stageItems = samples.filter(p => p.status === col.stage);
                              return (
                                <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)} className="h-full">
                                  <PipelineColumn stage={col.stage} objective={col.objective} items={stageItems} />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
            );
        case 'list':
            const columns = [
                { header: 'Nombre', accessor: (s: Sample) => <Link to={`/hubs/samples/${s.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{s.name}</Link> },
                { header: 'Estado', accessor: (s: Sample) => <Badge text={s.status} color={s.status === SampleStatus.Aprobada ? 'green' : (s.status === SampleStatus.Cerrada ? 'gray' : 'yellow')} />},
                { header: 'Responsable', accessor: (s: Sample) => usersMap.get(s.ownerId)?.name || 'N/A' },
                { header: 'Fecha Solicitud', accessor: (s: Sample) => new Date(s.requestDate).toLocaleDateString()},
            ];
            return <Table columns={columns} data={samples} />;
        case 'history':
             if (pipelineActivities.length === 0) {
                 return (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                         <span className="material-symbols-outlined text-4xl mb-2">history</span>
                         <p>No hay actividad registrada para las muestras.</p>
                     </div>
                 );
             }
             return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const sample = samples.find(s => s.id === activity.sampleId);
                        
                        const userName = user?.name || 'Usuario Desconocido';
                        const userAvatar = user?.avatarUrl || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                        const sampleLink = sample ? `/hubs/samples/${sample.id}` : '#';
                        const sampleRef = sample ? sample.name : 'Muestra Desconocida';

                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {userName} en <Link to={sampleLink} className="font-semibold hover:underline">{sampleRef}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            );
    }
  };


  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
        </div>
        <Link 
          to="/hubs/samples/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nueva Muestra
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default SamplesPipelinePage;