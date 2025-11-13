import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_PROSPECTS } from '../data/mockData';
import { PIPELINE_COLUMNS } from '../constants';
import { Prospect, ProspectStage } from '../types';
import ProspectCard from '../components/crm/ProspectCard';

interface PipelineColumnProps {
  stage: ProspectStage;
  objective: string;
  prospects: Prospect[];
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stage: ProspectStage) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, prospectId: string) => void;
  onArchive: (prospectId: string) => void;
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ stage, objective, prospects, onDragOver, onDrop, onDragStart, onArchive }) => {
  const totalValue = prospects.reduce((sum, p) => sum + p.estValue, 0);

  return (
    <div
      className="flex-shrink-0 w-80 bg-slate-200/60 dark:bg-black/10 rounded-xl p-3"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-200">{stage}</h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{prospects.length}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mb-4 px-1 truncate" title={objective}>
        ${totalValue.toLocaleString('en-US')} &bull; {objective}
      </div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 250px)'}}>
        {prospects.map(prospect => (
          <ProspectCard key={prospect.id} prospect={prospect} onDragStart={onDragStart} onArchive={onArchive} />
        ))}
      </div>
    </div>
  );
};

const CrmPipelinePage: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>(MOCK_PROSPECTS);

  const groupedColumns = useMemo(() => {
    return PIPELINE_COLUMNS.reduce((acc, column) => {
      const group = column.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(column);
      return acc;
    }, {} as Record<string, (typeof PIPELINE_COLUMNS)[number][]>);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, prospectId: string) => {
    e.dataTransfer.setData('prospectId', prospectId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: ProspectStage) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData('prospectId');
    if (prospectId) {
      setProspects(prevProspects =>
        prevProspects.map(p =>
          p.id === prospectId ? { ...p, stage: targetStage } : p
        )
      );
    }
  };

  const handleArchive = (prospectId: string) => {
    setProspects(prev => prev.filter(p => p.id !== prospectId));
    alert('Prospecto archivado (simulación).');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Prospectos</h2>
        <div className="flex items-center gap-2">
            <Link 
                to="/crm/lists?view=prospects"
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                <span className="material-symbols-outlined mr-2">list</span>
                Ver Lista
            </Link>
            <Link 
              to="/crm/prospects/new"
              className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
              <span className="material-symbols-outlined mr-2">add</span>
              Nuevo Prospecto
            </Link>
        </div>
      </div>
      <div className="flex-1 flex gap-8 overflow-x-auto pb-4">
        {Object.keys(groupedColumns).map((groupName) => {
          const columns = groupedColumns[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{groupName}</h3>
              </div>
              <div className="flex gap-4">
                {columns.map(col => {
                  const stageProspects = prospects.filter(p => p.stage === col.stage);
                  return (
                    <PipelineColumn
                      key={col.stage}
                      stage={col.stage}
                      objective={col.objective}
                      prospects={stageProspects}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onArchive={handleArchive}
                    />
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

export default CrmPipelinePage;