
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { QUOTES_PIPELINE_COLUMNS } from '../constants';
import { Quote, QuotePipelineStage, ActivityLog, User, QuoteStatus } from '../types';
import QuoteCard from '../components/hubs/QuoteCard';
import ViewSwitcher, { ViewOption } from '../components/ui/ViewSwitcher';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

const PipelineColumn: React.FC<{
  stage: QuotePipelineStage;
  objective: string;
  items: Quote[];
}> = ({ stage, objective, items }) => {
  const totalValue = items.reduce((sum, q) => sum + q.totals.grandTotal, 0);

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
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Valor Total</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">${totalValue.toLocaleString('en-US')}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="h-full overflow-y-auto pr-1 custom-scrollbar flex-1" style={{maxHeight: 'calc(100vh - 220px)'}}>
        {items.map(item => (
            <div key={item.id} data-id={item.id}>
                <QuoteCard item={item} onDragStart={() => {}} />
            </div>
        ))}
        {items.length === 0 && (
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-1">
                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Sin cotizaciones</p>
            </div>
        )}
      </div>
    </div>
  );
};


const QuotesPipelinePage: React.FC = () => {
  const { data: quotesData, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: activitiesData, loading: activitiesLoading } = useCollection<ActivityLog>('activities');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'pipeline' | 'list' | 'history'>('pipeline');

  useEffect(() => {
    if (quotesData) {
      setQuotes(quotesData);
    }
  }, [quotesData]);
  
  useEffect(() => {
    if (activitiesData) {
      setActivities(activitiesData);
    }
  }, [activitiesData]);

  const loading = quotesLoading || activitiesLoading || usersLoading;
  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

  const groupedColumns = useMemo(() => {
    return QUOTES_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof QUOTES_PIPELINE_COLUMNS)[number][]>);
  }, []);
  
  const pipelineActivities = useMemo(() => {
    if (!activities) return [];
    const quoteIds = new Set(quotes.map(q => q.id));
    return activities
      .filter(a => a.quoteId && quoteIds.has(a.quoteId))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes, activities]);

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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: QuotePipelineStage) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !currentUser) return;

    const originalQuote = quotes.find(q => q.id === itemId);
    // FIX: Cast targetStage to 'QuoteStatus' to fix type comparison error. The enums have identical string values.
    if (!originalQuote || originalQuote.status === (targetStage as QuoteStatus)) return;

    // Optimistic update
    setQuotes(prevItems =>
      prevItems.map(p =>
        p.id === itemId ? { ...p, status: (targetStage as any as QuoteStatus) } : p
      )
    );

    try {
      await api.updateDoc('quotes', itemId, { status: targetStage });
      
      // Add activity log
      const activity: Omit<ActivityLog, 'id'> = {
        quoteId: itemId,
        type: 'Cambio de Estado',
        description: `Cotización movida de "${originalQuote.status}" a "${targetStage}"`,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };
      const newActivity = await api.addDoc('activities', activity);
      setActivities(prev => [newActivity, ...prev]);

    } catch (error) {
      showToast('error', 'No se pudo actualizar la etapa.');
      // Revert on failure
      setQuotes(prevItems =>
        prevItems.map(p =>
          p.id === itemId ? originalQuote : p
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
                                const stageItems = quotes.filter(p => p.status === col.stage);
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
                { header: 'Folio', accessor: (q: Quote) => <Link to={`/hubs/quotes/${q.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{q.folio}</Link> },
                { header: 'Estado', accessor: (q: Quote) => <Badge text={q.status} />},
                { header: 'Total', accessor: (q: Quote) => `$${q.totals.grandTotal.toLocaleString()}`},
                { header: 'Responsable', accessor: (q: Quote) => usersMap.get(q.salespersonId)?.name || 'N/A' },
                { header: 'Creación', accessor: (q: Quote) => new Date(q.createdAt).toLocaleDateString()},
            ];
            return <Table columns={columns} data={quotes} />;
        case 'history':
            return (
                <ul className="space-y-4">
                    {pipelineActivities.map(activity => {
                        const user = usersMap.get(activity.userId);
                        const quote = quotes.find(p => p.id === activity.quoteId);
                        if (!user || !quote) return null;
                        return (
                            <li key={activity.id} className="flex items-start gap-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div><img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /></div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200">{activity.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {user.name} en <Link to={`/hubs/quotes/${quote?.id}`} className="font-semibold hover:underline">{quote?.folio}</Link> &bull; {new Date(activity.createdAt).toLocaleString()}
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
          to="/hubs/quotes/new"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nueva Cotización
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default QuotesPipelinePage;
