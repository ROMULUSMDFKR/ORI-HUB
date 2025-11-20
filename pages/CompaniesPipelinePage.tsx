
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
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const PipelineColumn: React.FC<{
  stage: CompanyPipelineStage;
  objective: string;
  items: Company[];
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
                <CompanyCard item={item} onDragStart={() => {}} />
            </div>
        ))}
        {items.length === 0 && (
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-1">
                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Sin empresas</p>
            </div>
        )}
      </div>
    </div>
  );
};

const CompaniesPipelinePage: React.FC = () => {
  const { data: initialCompanies, loading: cLoading } = useCollection<Company>('companies');
  const { data: activitiesData, loading: aLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: uLoading } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [activities, setActivities] = useState<ActivityLog[] | null>(null);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');
  
  const loading = cLoading || aLoading || uLoading;
  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

  useEffect(() => {
    if (initialCompanies) {
      setCompanies(initialCompanies);
    }
  }, [initialCompanies]);
  
  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);

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
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: CompanyPipelineStage) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !companies || !currentUser) return;
    
    const originalCompany = companies.find(c => c.id === itemId);
    if (!originalCompany || originalCompany.stage === targetStage) return;

    setCompanies(prevItems =>
        prevItems!.map(p =>
        p.id === itemId ? { ...p, stage: targetStage } : p
        )
    );

    try {
        await api.updateDoc('companies', itemId, { stage: targetStage });
        const activity: Omit<ActivityLog, 'id'> = {
            companyId: itemId,
            type: 'Cambio de Estado',
            description: `Empresa movida de "${originalCompany.stage}" a "${targetStage}"`,
            userId: currentUser.id,
            createdAt: new Date().toISOString()
        };
        const newActivity = await api.addDoc('activities', activity);
        setActivities(prev => prev ? [newActivity, ...prev] : [newActivity]);
    } catch (error) {
        showToast('error', 'No se pudo actualizar la etapa.');
        setCompanies(prev => prev!.map(p => p.id === itemId ? originalCompany : p));
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
                      <div key={groupName} className="flex flex-col h-full">
                        <div className="px-3 pb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <div className="flex gap-4 h-full">
                            {groupedColumns[groupName].map(col => {
                              const stageItems = companies.filter(p => p.stage === col.stage);
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
