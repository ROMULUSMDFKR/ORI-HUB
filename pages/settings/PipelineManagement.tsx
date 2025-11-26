
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
                    className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                >
                    {/* App Icon Pattern */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                        <span className="material-symbols-outlined text-xl">drag_indicator</span>
                    </div>

                    <div className="flex-1 pt-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">{stage.stage}</h4>
                                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                    {stage.group}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEditClick(stage)} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    title="Editar objetivo"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                            </div>
                        </div>

                        {editingStage?.stage === stage.stage ? (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                {/* Input Safe Pattern */}
                                <div className="relative mb-3">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">flag</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={editedObjective}
                                        onChange={(e) => setEditedObjective(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                        placeholder="Define el objetivo de esta etapa..."
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                {stage.objective || <span className="italic opacity-50">Sin objetivo definido</span>}
                            </p>
                        )}
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
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Etapas de Venta</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Personaliza los flujos de trabajo y define objetivos claros para cada paso del proceso comercial.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1 custom-scrollbar" aria-label="Tabs">
                        {pipelines.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setActivePipeline(p.name)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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

                <div className="space-y-6">
                   <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Configuración de Etapas</h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">Arrastra para reordenar</span>
                   </div>
                   <PipelineStageList initialStages={activeStages} />
                </div>
            </div>
        </div>
    );
};

export default PipelineManagement;
