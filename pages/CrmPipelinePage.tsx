

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
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ stage, objective, prospects, onDragOver, onDrop, onDragStart }) => {
  const totalValue = prospects.reduce((sum, p) => sum + p.estValue, 0);

  return (
    <div
      className="flex-shrink-0 w-80 bg-surface rounded-xl p-3"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="flex justify-between items-center mb-1 px-1">
        <h3 className="font-semibold text-md text-on-surface">{stage}</h3>
        <span className="text-sm font-medium text-on-surface-secondary bg-gray-200 px-2 py-0.5 rounded-full">{prospects.length}</span>
      </div>
      <div className="text-xs text-gray-500 mb-4 px-1 truncate" title={objective}>
        ${totalValue.toLocaleString('en-US')} &bull; {objective}
      </div>
      <div className="h-full overflow-y-auto pr-1" style={{maxHeight: 'calc(100vh - 250px)'}}>
        {prospects.map(prospect => (
          <ProspectCard key={prospect.id} prospect={prospect} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
};

const CrmPipelinePage: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>(MOCK_PROSPECTS);

  // FIX: Used a type assertion on the initial value of reduce to ensure correct type inference.
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-on-surface">Prospectos</h2>
        <Link 
          to="/crm/prospects/new"
          className="bg-primary text-on-surface font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span>
          Nuevo Prospecto
        </Link>
      </div>
      <div className="flex-1 flex gap-8 overflow-x-auto pb-4">
        {/* FIX: Replaced `Object.entries` with `Object.keys` to ensure correct type inference on `columns`. */}
        {Object.keys(groupedColumns).map((groupName) => {
          const columns = groupedColumns[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">{groupName}</h3>
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