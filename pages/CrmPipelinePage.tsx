
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { PIPELINE_COLUMNS } from '../constants';
import { Prospect, ProspectStage, ActivityLog, User, Priority } from '../types';
import ProspectCard from '../components/crm/ProspectCard';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import FilterButton from '../components/ui/FilterButton';
import { useToast } from '../hooks/useToast';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';

const PipelineColumn: React.FC<{
  stage: ProspectStage;
  objective: string;
  prospects: Prospect[];
}> = ({ stage, objective, prospects }) => {
  const totalValue = prospects.reduce((sum, p) => sum + p.estValue, 0);

  return (
    <div className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center group">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${prospects.length > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">{stage}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                {prospects.length}
            </span>
        </div>
        
        {/* Info Icon with Tooltip */}
        <div className="relative">
            <span className="material-symbols-outlined text-slate-400 hover:text-indigo-500 cursor-help text-lg">info</span>
            <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">Objetivo</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Valor Total en Etapa</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">${totalValue.toLocaleString('en-US')}</span>
                </div>
            </div>
        </div>
      </div>
      
      <div className="h-full overflow-y-auto p-2 custom-scrollbar flex-1 space-y-3" style={{maxHeight: 'calc(100vh - 240px)'}}>
        {prospects.map(prospect => (
          <div key={prospect.id} data-id={prospect.id}>
             <ProspectCard prospect={prospect} onDragStart={() => {}} onArchive={() => {}} />
          </div>
        ))}
        {prospects.length === 0 && (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg m-1">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-2">filter_none</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sin prospectos</p>
            </div>
        )}
      </div>
    </div>
  );
};

// --- KPI Widget ---
const PipelineKPIs: React.FC<{ prospects: Prospect[] }> = ({ prospects }) => {
    const activeProspects = prospects.filter(p => p.stage !== ProspectStage.Ganado && p.stage !== ProspectStage.Perdido);
    const totalValue = activeProspects.reduce((sum, p) => sum + p.estValue, 0);
    const avgValue = activeProspects.length > 0 ? totalValue / activeProspects.length : 0;
    const highPriorityCount = activeProspects.filter(p => p.priority === Priority.Alta).length;

    // Conversion rate (simple: won / (won + lost))
    const wonCount = prospects.filter(p => p.stage === ProspectStage.Ganado).length;
    const lostCount = prospects.filter(p => p.stage === ProspectStage.Perdido).length;
    const closedTotal = wonCount + lostCount;
    const winRate = closedTotal > 0 ? (wonCount / closedTotal) * 100 : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Valor en Pipeline</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">${totalValue.toLocaleString('en-US', { notation: "compact", compactDisplay: "short" })}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                 <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <span className="material-symbols-outlined text-2xl">filter_alt</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Oportunidades</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{activeProspects.length}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Alta Prioridad</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{highPriorityCount}</p>
                </div>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="material-symbols-outlined text-2xl">query_stats</span>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Tasa de Cierre</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{winRate.toFixed(0)}%</p>
                </div>
            </div>
        </div>
    )
}

const CrmPipelinePage: React.FC = () => {
  const { data: prospectsData, loading: prospectsLoading } = useCollection<Prospect>('prospects');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: activitiesData, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (prospectsData) {
      setProspects(prospectsData);
    }
  }, [prospectsData]);
  
  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);

  const loading = prospectsLoading || usersLoading || activitiesLoading;

  const usersMap = useMemo(() => {
      if (!users) return new Map<string, User>();
      return new Map<string, User>(users.map(u => [u.id, u] as [string, User]));
  }, [users]);

  // Filter Data Logic
  const filteredProspects = useMemo(() => {
      if (!prospects) return [];
      return prospects.filter(p => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchOwner = ownerFilter === 'all' || p.ownerId === ownerFilter;
          const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;
          return matchSearch && matchOwner && matchPriority;
      });
  }, [prospects, searchTerm, ownerFilter, priorityFilter]);

  const groupedColumns = useMemo(() => {
    return PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof PIPELINE_COLUMNS)[number][]>);
  }, []);
  
  const pipelineActivities = useMemo(() => {
    if (!activities) return [];
    const prospectIds = new Set(filteredProspects.map(p => p.id));
    return activities
      .filter(a => a.prospectId && prospectIds.has(a.prospectId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredProspects, activities]);
  
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: ProspectStage) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData('text/plain');
    if (!prospectId || !currentUser) return;

    const originalProspect = prospects.find(p => p.id === prospectId);
    if (!originalProspect || originalProspect.stage === targetStage) return;

    // Optimistic update
    setProspects(prevProspects =>
      prevProspects.map(p =>
        p.id === prospectId ? { ...p, stage: targetStage } : p
      )
    );

    try {
      await api.updateDoc('prospects', prospectId, { stage: targetStage });
      
      // Add activity log
      const activity: Omit<ActivityLog, 'id'> = {
        prospectId,
        type: 'Cambio de Estado',
        description: `Cambió el estado de "${originalProspect.stage}" a "${targetStage}"`,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };
      const newActivity = await api.addDoc('activities', activity);
      setActivities(prev => [newActivity, ...prev]);

    } catch (error) {
      showToast('error', 'No se pudo actualizar la etapa.');
      // Revert on failure
      setProspects(prevProspects =>
        prevProspects.map(p =>
          p.id === prospectId ? originalProspect : p
        )
      );
    }
  };
  
  const pipelineViews: ViewOption[] = [
    { id: 'pipeline', name: 'Pipeline', icon: 'view_kanban' },
    { id: 'list', name: 'Lista', icon: 'list' },
    { id: 'history', name: 'Historial', icon: 'history' },
  ];

  const userOptions = useMemo(() => (users || []).map(u => ({ value: u.id, label: u.name })), [users]);
  const priorityOptions = Object.values(Priority).map(p => ({ value: p, label: p }));

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
                                const stageProspects = filteredProspects.filter(p => p.stage === col.stage);
                                return (
                                    <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)} className="h-full">
                                        <PipelineColumn stage={col.stage} objective={col.objective} prospects={stageProspects} />
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
                    header: 'Nombre', 
                    accessor: (p: Prospect) => (
                        <div className="flex items-center gap-3">
                             <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                {p.name.substring(0, 2).toUpperCase()}
                             </div>
                             <Link to={`/hubs/prospects/${p.id}`} className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">{p.name}</Link>
                        </div>
                    )
                },
                { header: 'Etapa', accessor: (p: Prospect) => <Badge text={p.stage} color="blue" />},
                { header: 'Prioridad', accessor: (p: Prospect) => <Badge text={p.priority} />},
                { header: 'Valor Est.', accessor: (p: Prospect) => <span className="font-mono font-semibold">${p.estValue.toLocaleString()}</span>, className: 'text-right'},
                { 
                    header: 'Responsable', 
                    accessor: (p: Prospect) => {
                        const u = usersMap.get(p.ownerId);
                        return (
                            <div className="flex items-center gap-2">
                                {u && <img src={u.avatarUrl} className="w-5 h-5 rounded-full" alt="" />}
                                <span>{u?.name || 'N/A'}</span>
                            </div>
                        );
                    }
                },
                { header: 'Creación', accessor: (p: Prospect) => new Date(p.createdAt).toLocaleDateString()},
            ];
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredProspects} />
                </div>
            );
        case 'history':
            return (
                <ul className="space-y-4 max-w-4xl mx-auto">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const prospect = prospects.find(p => p.id === activity.prospectId);
                        if (!user || !prospect) return null;
                        return (
                            <li key={activity.id} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold">{user.name}</span>
                                        <span>&bull;</span>
                                        <Link to={`/hubs/prospects/${prospect?.id}`} className="hover:text-indigo-600 hover:underline">{prospect?.name}</Link>
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
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Pipeline de Prospectos</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tus oportunidades de venta y seguimiento.</p>
            </div>
            <div className="flex items-center gap-3">
                <ViewSwitcher views={pipelineViews} activeView={view} onViewChange={(v) => setView(v as 'pipeline' | 'list' | 'history')} />
                <Link 
                    to="/hubs/prospects/new"
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nuevo
                </Link>
            </div>
        </div>

        {/* KPI Mini-Dashboard */}
        <PipelineKPIs prospects={filteredProspects} />

        {/* Toolbar: Search & Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between flex-shrink-0">
            {/* Input Safe Pattern */}
            <div className="relative w-full lg:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                </div>
                <input
                    type="text"
                    placeholder="Buscar prospecto..."
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
                <FilterButton 
                    label="Prioridad" 
                    options={priorityOptions} 
                    selectedValue={priorityFilter} 
                    onSelect={setPriorityFilter} 
                    allLabel="Todas"
                />
            </div>
        </div>
      
      {renderContent()}
    </div>
  );
};

export default CrmPipelinePage;
