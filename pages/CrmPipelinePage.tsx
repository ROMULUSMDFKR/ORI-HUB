import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { PIPELINE_COLUMNS } from '../constants';
import { Prospect, ProspectStage, ActivityLog, User } from '../types';
import ProspectCard from '../components/crm/ProspectCard';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
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
    <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 px-1 group relative">
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                {prospects.length}
            </span>
        </div>
        
        {/* Info Icon with Tooltip */}
        <div className="relative">
            <span className="material-symbols-outlined text-slate-400 hover:text-indigo-500 cursor-help text-lg">info</span>
            <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Objetivo de la Etapa</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{objective}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Valor Total</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">${totalValue.toLocaleString('en-US')}</span>
                </div>
            </div>
        </div>
      </div>
      
      <div className="h-full overflow-y-auto pr-1 custom-scrollbar flex-1" style={{maxHeight: 'calc(100vh - 220px)'}}>
        {prospects.map(prospect => (
          <div key={prospect.id} data-id={prospect.id}>
             <ProspectCard prospect={prospect} onDragStart={() => {}} onArchive={() => {}} />
          </div>
        ))}
        {prospects.length === 0 && (
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-1">
                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Sin prospectos</p>
            </div>
        )}
      </div>
    </div>
  );
};

const CrmPipelinePage: React.FC = () => {
  const { data: prospectsData, loading: prospectsLoading } = useCollection<Prospect>('prospects');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: activitiesData, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

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
    const prospectIds = new Set(prospects.map(p => p.id));
    return activities
      .filter(a => a.prospectId && prospectIds.has(a.prospectId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prospects, activities]);
  
  const usersMap = useMemo(() => {
      if (!users) return new Map<string, User>();
      return new Map<string, User>(users.map(u => [u.id, u] as [string, User]));
  }, [users]);

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
                                const stageProspects = prospects.filter(p => p.stage === col.stage);
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
                { header: 'Nombre', accessor: (p: Prospect) => <Link to={`/hubs/prospects/${p.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{p.name}</Link> },
                { header: 'Etapa', accessor: (p: Prospect) => <Badge text={p.stage} color="blue" />},
                { header: 'Valor Est.', accessor: (p: Prospect) => `$${p.estValue.toLocaleString()}`},
                { header: 'Responsable', accessor: (p: Prospect) => usersMap.get(p.ownerId)?.name || 'N/A' },
                { header: 'Creación', accessor: (p: Prospect) => new Date(p.createdAt).toLocaleDateString()},
            ];
            return <Table columns={columns} data={prospects} />;
        case 'history':
            return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const prospect = prospects.find(p => p.id === activity.prospectId);
                        if (!user || !prospect) return null;
                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {user.name} en <Link to={`/hubs/prospects/${prospect?.id}`} className="font-semibold hover:underline">{prospect?.name}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
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
          to="/hubs/prospects/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nuevo Prospecto
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default CrmPipelinePage;