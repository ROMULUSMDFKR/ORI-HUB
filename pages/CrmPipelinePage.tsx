import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { PIPELINE_COLUMNS } from '../constants';
import { Prospect, ProspectStage, ActivityLog, User } from '../types';
import ProspectCard from '../components/crm/ProspectCard';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const PipelineColumn: React.FC<{
  stage: ProspectStage;
  objective: string;
  prospects: Prospect[];
}> = ({ stage, objective, prospects }) => {
  const totalValue = prospects.reduce((sum, p) => sum + p.estValue, 0);

  return (
    <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3">
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{prospects.length}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>
        ${totalValue.toLocaleString('en-US')} &bull; {objective}
      </div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 290px)'}}>
        {prospects.map(prospect => (
          <div key={prospect.id} data-id={prospect.id}>
             <ProspectCard prospect={prospect} onDragStart={() => {}} onArchive={() => {}} />
          </div>
        ))}
      </div>
    </div>
  );
};

const CrmPipelinePage: React.FC = () => {
  const { data: prospectsData, loading: prospectsLoading } = useCollection<Prospect>('prospects');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: activities, loading: activitiesLoading } = useCollection<ActivityLog>('activities');

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  React.useEffect(() => {
    if (prospectsData) {
      setProspects(prospectsData);
    }
  }, [prospectsData]);
  
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
      if (!users) return new Map();
      return new Map(users.map(u => [u.id, u.name]));
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: ProspectStage) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData('text/plain');
    if (prospectId) {
      setProspects(prevProspects =>
        prevProspects.map(p =>
          p.id === prospectId ? { ...p, stage: targetStage } : p
        )
      );
      // Here you would call an API to persist the change
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
                      <div key={groupName} className="flex flex-col">
                        <div className="px-3 pb-2"><h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{groupName}</h3></div>
                        <div className="flex gap-4">
                            {groupedColumns[groupName].map(col => {
                                const stageProspects = prospects.filter(p => p.stage === col.stage);
                                return (
                                    <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
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
                { header: 'Responsable', accessor: (p: Prospect) => usersMap.get(p.ownerId) || 'N/A' },
                { header: 'Creación', accessor: (p: Prospect) => new Date(p.createdAt).toLocaleDateString()},
            ];
            return <Table columns={columns} data={prospects} />;
        case 'history':
            return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = users?.find(u => u.id === activity.userId);
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