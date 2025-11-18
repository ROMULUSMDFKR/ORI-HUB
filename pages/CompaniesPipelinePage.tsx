import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { COMPANIES_PIPELINE_COLUMNS } from '../constants';
import { Company, CompanyPipelineStage, ActivityLog, User } from '../types';
import CompanyCard from '../components/hubs/CompanyCard';
import Spinner from '../components/ui/Spinner';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';

const PipelineColumn: React.FC<{
  stage: CompanyPipelineStage;
  objective: string;
  items: Company[];
}> = ({ stage, objective, items }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3">
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>{objective}</div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 290px)'}}>
        {items.map(item => (
            <div key={item.id} data-id={item.id}>
                <CompanyCard item={item} onDragStart={() => {}} />
            </div>
        ))}
      </div>
    </div>
  );
};

const CompaniesPipelinePage: React.FC = () => {
  const { data: initialCompanies, loading: cLoading } = useCollection<Company>('companies');
  const { data: activities, loading: aLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');
  
  const loading = cLoading || aLoading || uLoading;
  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

  useEffect(() => {
    if (initialCompanies) {
      setCompanies(initialCompanies);
    }
  }, [initialCompanies]);
  
  const pipelineActivities = useMemo(() => {
    if(!companies || !activities) return [];
    const companyIds = new Set(companies.map(c => c.id));
    return activities
      .filter(a => a.companyId && companyIds.has(a.companyId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [companies, activities]);

  const groupedColumns = useMemo(() => {
    return COMPANIES_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof COMPANIES_PIPELINE_COLUMNS)[number][]>);
  }, []);

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
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: CompanyPipelineStage) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId && companies) {
        setCompanies(prevItems =>
            prevItems!.map(p =>
            p.id === itemId ? { ...p, stage: targetStage } : p
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
    if (loading || !companies) {
      return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }
    
    switch(view) {
        case 'pipeline':
            return (
                 <div className="flex-1 flex gap-8 overflow-x-auto pb-4" onDragStart={handleDragStart}>
                    {Object.keys(groupedColumns).map((groupName) => (
                      <div key={groupName} className="flex flex-col">
                        <div className="px-3 pb-2"><h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3></div>
                        <div className="flex gap-4">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = companies.filter(p => p.stage === col.stage);
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
                { header: 'Nombre', accessor: (c: Company) => <Link to={`/crm/clients/${c.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{c.shortName || c.name}</Link> },
                { header: 'Etapa', accessor: (c: Company) => <Badge text={c.stage} /> },
                { header: 'Responsable', accessor: (c: Company) => usersMap.get(c.ownerId)?.name || 'N/A' },
            ];
            return <Table columns={columns} data={companies} />;
        case 'history':
             return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const company = companies.find(c => c.id === activity.companyId);
                        if (!user || !company) return null;
                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {user.name} en <Link to={`/crm/clients/${company?.id}`} className="font-semibold hover:underline">{company?.shortName}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
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
          to="/crm/clients/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nueva Empresa
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default CompaniesPipelinePage;