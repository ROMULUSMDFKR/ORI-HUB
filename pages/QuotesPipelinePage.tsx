import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_QUOTES } from '../data/mockData';
import { QUOTES_PIPELINE_COLUMNS } from '../constants';
import { Quote, QuotePipelineStage } from '../types';
import QuoteCard from '../components/hubs/QuoteCard';

interface PipelineColumnProps {
  stage: QuotePipelineStage;
  objective: string;
  items: Quote[];
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stage: QuotePipelineStage) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ stage, objective, items, onDragOver, onDrop, onDragStart }) => {
  const totalValue = items.reduce((sum, q) => sum + q.totals.grandTotal, 0);

  return (
    <div
      className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>
        ${totalValue.toLocaleString('en-US')} &bull; {objective}
      </div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 250px)'}}>
        {items.map(item => (
          <QuoteCard key={item.id} item={item} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
};


const QuotesPipelinePage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);

  const groupedColumns = useMemo(() => {
    return QUOTES_PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof QUOTES_PIPELINE_COLUMNS)[number][]>);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: QuotePipelineStage) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      setQuotes(prevItems =>
        prevItems.map(p =>
          p.id === itemId ? { ...p, status: targetStage } : p
        )
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Pipeline de Cotizaciones</h2>
        <div className="flex items-center gap-2">
            <Link 
                to="/crm/lists?view=quotes"
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                <span className="material-symbols-outlined mr-2">list</span>
                Ver Lista
            </Link>
            <Link 
              to="/hubs/quotes/new"
              className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
              <span className="material-symbols-outlined mr-2">add</span>
              Nueva Cotización
            </Link>
        </div>
      </div>
      <div className="flex-1 flex gap-8 overflow-x-auto pb-4">
        {Object.keys(groupedColumns).map((groupName) => {
          const columns = groupedColumns[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupName}</h3>
              </div>
              <div className="flex gap-4">
                {columns.map(col => {
                  const stageItems = quotes.filter(p => p.status === col.stage);
                  return (
                    <div key={col.stage}>
                      <PipelineColumn
                        stage={col.stage}
                        objective={col.objective}
                        items={stageItems}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuotesPipelinePage;