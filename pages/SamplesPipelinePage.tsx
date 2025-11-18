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

const PipelineColumn: React.FC<{
  stage: SampleStatus;
  objective: string;
  items: Sample[];
}> = ({ stage, objective, items }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3">
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>{objective}</div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 290px)'}}>
        {items.map(item => (
            <div key={item.id} data-id={item.id}>
                <SampleCard item={item} onDragStart={()=>{}} onArchive={()=>{}} />
            </div>
        ))}
      </div>
    </div>
  );
};


const SamplesPipelinePage: React.FC = () => {
  const { data: samplesData, loading: sLoading } = useCollection<Sample>('samples');
  const { data: activities, loading: aLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');
  
  useEffect(() => {
    if (samplesData) {
      setSamples(samplesData);
    }
  }, [samplesData]);

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

  const handleArchive = (sampleId: string) => {
    setSamples(prev => prev.filter(s => s.id !== sampleId));
    alert('Muestra archivada correctamente.');
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: SampleStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      if (targetStage === SampleStatus.Archivada) {
        handleArchive(itemId);
      } else {
        setSamples(prevItems =>
          prevItems.map(p =>
            p.id === itemId ? { ...p, status: targetStage } : p
          )
        );
      }
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
                        <div className="px-3 pb-2"><h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3></div>
                        <div className="flex gap-4">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = samples.filter(p => p.status === col.stage);
                              return (
                                <div key={col.stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.stage)}>
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
                { header: 'Estado', accessor: (s: Sample) => <Badge text={s.status} color="yellow" />},
                { header: 'Responsable', accessor: (s: Sample) => usersMap.get(s.ownerId)?.name || 'N/A' },
                { header: 'Fecha Solicitud', accessor: (s: Sample) => new Date(s.requestDate).toLocaleDateString()},
            ];
            return <Table columns={columns} data={samples} />;
        case 'history':
             return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const sample = samples.find(s => s.id === activity.sampleId);
                        if (!user || !sample) return null;
                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {user.name} en <Link to={`/hubs/samples/${sample?.id}`} className="font-semibold hover:underline">{sample?.name}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
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