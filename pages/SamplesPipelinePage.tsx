
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
import FilterButton from '../components/ui/FilterButton';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const PipelineColumn: React.FC<{
  stage: SampleStatus;
  objective: string;
  items: Sample[];
}> = ({ stage, objective, items }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center group">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${items.length > 0 ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">{stage}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                {items.length}
            </span>
        </div>

        <div className="relative">
            <span className="material-symbols-outlined text-slate-400 hover:text-purple-500 cursor-help text-lg">info</span>
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">Objetivo</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
            </div>
        </div>
      </div>
      
      <div className="h-full overflow-y-auto p-2 custom-scrollbar flex-1 space-y-3" style={{maxHeight: 'calc(100vh - 240px)'}}>
        {items.map(item => (
            <div key={item.id} data-id={item.id}>
                <SampleCard item={item} onDragStart={()=>{}} onArchive={()=>{}} />
            </div>
        ))}
         {items.length === 0 && (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg m-1">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-2">science_off</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sin muestras</p>
            </div>
        )}
      </div>
    </div>
  );
};

// --- KPI Widget for Samples ---
const SamplesKPIs: React.FC<{ samples: Sample[] }> = ({ samples }) => {
    const activeSamples = samples.filter(s => s.status !== SampleStatus.Archivada && s.status !== SampleStatus.Cerrada && s.status !== SampleStatus.Aprobada);
    const pendingFeedback = samples.filter(s => s.status === SampleStatus.ConFeedback || s.status === SampleStatus.Recibida).length;
    
    const approvedCount = samples.filter(s => s.status === SampleStatus.Aprobada).length;
    const rejectedCount = samples.filter(s => s.status === SampleStatus.Cerrada).length; // Assuming 'Cerrada' as rejected/failed for this metric
    const totalClosed = approvedCount + rejectedCount;
    const approvalRate = totalClosed > 0 ? (approvedCount / totalClosed) * 100 : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <span className="material-symbols-outlined text-2xl">science</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Muestras Activas</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{activeSamples.length}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                 <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <span className="material-symbols-outlined text-2xl">rate_review</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Esperando Feedback</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{pendingFeedback}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="material-symbols-outlined text-2xl">local_shipping</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">En Tránsito</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{samples.filter(s => s.status === SampleStatus.Enviada).length}</p>
                </div>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Tasa Aprobación</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{approvalRate.toFixed(0)}%</p>
                </div>
            </div>
        </div>
    )
}

const SamplesPipelinePage: React.FC = () => {
  const { data: samplesData, loading: sLoading } = useCollection<Sample>('samples');
  const { data: activitiesData, loading: aLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // Mostly for list view
  
  useEffect(() => {
    if (samplesData) {
      setSamples(samplesData);
      
      // Auto-archive logic (kept from original)
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
              } catch (e) { console.error(e); }
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
  const usersMap = useMemo(() => new Map<string, User>(users?.map(u => [u.id, u] as [string, User])), [users]);

  const filteredSamples = useMemo(() => {
      if (!samples) return [];
      return samples.filter(s => {
          const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchOwner = ownerFilter === 'all' || s.ownerId === ownerFilter;
          const matchStatus = statusFilter === 'all' || s.status === statusFilter;
          return matchSearch && matchOwner && matchStatus;
      });
  }, [samples, searchTerm, ownerFilter, statusFilter]);

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
    const sampleIds = new Set(filteredSamples.map(s => s.id));
    return activities
      .filter(a => a.sampleId && sampleIds.has(a.sampleId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredSamples, activities]);

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

  const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, label: u.name })), [users]);
  const statusOptions = Object.values(SampleStatus).map(s => ({ value: s, label: s }));
  
  const renderContent = () => {
    if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;
    
    switch(view) {
        case 'pipeline':
            return (
                 <div className="flex-1 flex gap-6 overflow-x-auto pb-4 pt-2" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col h-full">
                        <div className="px-1 pb-3 flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{groupName}</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="flex gap-4 h-full">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = filteredSamples.filter(p => p.status === col.stage);
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
                { 
                    header: 'Muestra', 
                    accessor: (s: Sample) => (
                        <div className="flex items-center gap-3">
                             {/* App Icon Pattern */}
                             <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                                <span className="material-symbols-outlined !text-xl">science</span>
                             </div>
                             <Link to={`/hubs/samples/${s.id}`} className="font-medium text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400">{s.name}</Link>
                        </div>
                    )
                },
                { header: 'Estado', accessor: (s: Sample) => <Badge text={s.status} color={s.status === SampleStatus.Aprobada ? 'green' : (s.status === SampleStatus.Cerrada ? 'gray' : 'yellow')} />},
                { header: 'Responsable', accessor: (s: Sample) => usersMap.get(s.ownerId)?.name || 'N/A' },
                { header: 'Fecha Solicitud', accessor: (s: Sample) => new Date(s.requestDate).toLocaleDateString()},
            ];
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredSamples} />
                </div>
            );
        case 'history':
             if (pipelineActivities.length === 0) {
                 return (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                         <span className="material-symbols-outlined text-4xl mb-2">history</span>
                         <p>No hay actividad registrada.</p>
                     </div>
                 );
             }
             return (
                <ul className="space-y-4 max-w-4xl mx-auto">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const sample = samples.find(s => s.id === activity.sampleId);
                        
                        return (
                            <li key={activity.id} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                <img src={user?.avatarUrl} alt={user?.name} className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold">{user?.name || 'Sistema'}</span>
                                        <span>&bull;</span>
                                        <Link to={`/hubs/samples/${sample?.id}`} className="hover:text-purple-600 hover:underline">{sample?.name || 'Muestra eliminada'}</Link>
                                        <span>&bull;</span>
                                        <span>{new Date(activity.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            );
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Pipeline de Muestras</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Seguimiento de envíos y validaciones de producto.</p>
        </div>
        <div className="flex items-center gap-3">
            <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
            <Link 
                to="/hubs/samples/new"
                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors"
            >
                <span className="material-symbols-outlined text-lg">add</span>
                Nueva
            </Link>
        </div>
      </div>
      
      {/* KPI Mini-Dashboard */}
      <SamplesKPIs samples={filteredSamples} />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between flex-shrink-0">
          {/* Input Safe Pattern */}
          <div className="relative w-full lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
              </div>
              <input
                  type="text"
                  placeholder="Buscar muestra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
              />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
               <FilterButton 
                  label="Responsable" 
                  options={userOptions} 
                  selectedValue={ownerFilter} 
                  onSelect={setOwnerFilter} 
                  allLabel="Todos"
              />
               {view === 'list' && (
                  <FilterButton 
                      label="Estado" 
                      options={statusOptions} 
                      selectedValue={statusFilter} 
                      onSelect={setStatusFilter} 
                      allLabel="Todos"
                  />
              )}
          </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default SamplesPipelinePage;
