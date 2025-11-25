

import React, { useState, useEffect, useRef } from 'react';
import { PIPELINE_COLUMNS, SAMPLES_PIPELINE_COLUMNS, QUOTES_PIPELINE_COLUMNS, SALES_ORDERS_PIPELINE_COLUMNS, COMPANIES_PIPELINE_COLUMNS } from '../../constants';

// Define a consistent type for stage objects
interface Stage {
    stage: string;
    objective: string;
    group: string;
}

const pipelines = [
    { name: 'Prospectos', stages: PIPELINE_COLUMNS },
    { name: 'Muestras', stages: SAMPLES_PIPELINE_COLUMNS },
    { name: 'Cotizaciones', stages: QUOTES_PIPELINE_COLUMNS },
    { name: 'Órdenes de Venta', stages: SALES_ORDERS_PIPELINE_COLUMNS },
    { name: 'Empresas', stages: COMPANIES_PIPELINE_COLUMNS },
];

const PipelineStageList: React.FC<{ initialStages: Stage[] }> = ({ initialStages }) => {
    const [stages, setStages] = useState<Stage[]>(initialStages);
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [editedObjective, setEditedObjective] = useState('');
    
    // Refs for drag and drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Update state if the selected pipeline changes
    useEffect(() => {
        setStages(initialStages);
    }, [initialStages]);

    const handleEditClick = (stage: Stage) => {
        setEditingStage(stage);
        setEditedObjective(stage.objective);
    };

    const handleSaveEdit = () => {
        if (!editingStage) return;
        setStages(prevStages => 
            prevStages.map(s => 
                s.stage === editingStage.stage ? { ...s, objective: editedObjective } : s
            )
        );
        setEditingStage(null);
    };

    const handleCancelEdit = () => {
        setEditingStage(null);
        setEditedObjective('');
    };
    
    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            return;
        }

        setStages(prevStages => {
            const newStages = [...prevStages];
            const [draggedItemContent] = newStages.splice(dragItem.current!, 1);
            newStages.splice(dragOverItem.current!, 0, draggedItemContent);
            return newStages;
        });

        // Reset refs
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="space-y-3">
            {stages.map((stage, index) => (
                <div 
                    key={stage.stage} 
                    draggable
                    onDragStart={() => dragItem.current = index}
                    onDragEnter={() => dragOverItem.current = index}
                    onDragEnd={handleDragSort}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                >
                    <div className="flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{stage.stage}</p>
                        {editingStage?.stage === stage.stage ? (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={editedObjective}
                                    onChange={(e) => setEditedObjective(e.target.value)}
                                    className="w-full text-sm"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={handleSaveEdit} className="text-xs bg-indigo-600 text-white font-semibold px-2 py-1 rounded-md">Guardar</button>
                                    <button onClick={handleCancelEdit} className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-md">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{stage.objective}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            className="p-2 rounded-full cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Arrastrar para reordenar"
                        >
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">drag_indicator</span>
                        </button>
                        <button onClick={() => handleEditClick(stage)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">edit</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};


const PipelineManagement: React.FC = () => {
    const [activePipeline, setActivePipeline] = useState(pipelines[0].name);

    // This is a type assertion because the constant arrays don't explicitly have the Stage[] type.
    const activeStages = pipelines.find(p => p.name === activePipeline)?.stages as unknown as Stage[];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Etapas de Venta (Pipelines)</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Personaliza las etapas de tus procesos comerciales para que coincidan con tu flujo de trabajo.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {pipelines.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setActivePipeline(p.name)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base ${
                                    activePipeline === p.name
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-6">
                   <PipelineStageList initialStages={activeStages} />
                </div>
            </div>
        </div>
    );
};

export default PipelineManagement;