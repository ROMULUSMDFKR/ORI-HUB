
import React, { useState, useEffect, useRef } from 'react';
import { PIPELINE_COLUMNS, SAMPLES_PIPELINE_COLUMNS, QUOTES_PIPELINE_COLUMNS, SALES_ORDERS_PIPELINE_COLUMNS, COMPANIES_PIPELINE_COLUMNS } from '../../constants';

// Define a consistent type for stage objects including enriched fields
interface Stage {
    stage: string;
    objective: string;
    group: string;
    // Enriched fields (simulated for UI)
    probability?: number;
    maxDays?: number;
    color?: string;
}

const pipelines = [
    { name: 'Prospectos', stages: PIPELINE_COLUMNS },
    { name: 'Muestras', stages: SAMPLES_PIPELINE_COLUMNS },
    { name: 'Cotizaciones', stages: QUOTES_PIPELINE_COLUMNS },
    { name: 'Órdenes de Venta', stages: SALES_ORDERS_PIPELINE_COLUMNS },
    { name: 'Empresas', stages: COMPANIES_PIPELINE_COLUMNS },
];

const PipelineStageList: React.FC<{ initialStages: Stage[] }> = ({ initialStages }) => {
    // Initialize with default enriched values if missing
    const [stages, setStages] = useState<Stage[]>(initialStages.map(s => ({
        ...s,
        probability: s.probability || 10,
        maxDays: s.maxDays || 7,
        color: s.color || '#6366f1'
    })));
    
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [editForm, setEditForm] = useState<Partial<Stage>>({});
    
    // Refs for drag and drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Update state if the selected pipeline changes
    useEffect(() => {
        setStages(initialStages.map(s => ({
            ...s,
            probability: 10, // Default mock
            maxDays: 5, // Default mock
            color: '#94a3b8'
        })));
    }, [initialStages]);

    const handleEditClick = (stage: Stage) => {
        setEditingStage(stage);
        setEditForm({ ...stage });
    };

    const handleSaveEdit = () => {
        if (!editingStage) return;
        setStages(prevStages => 
            prevStages.map(s => 
                s.stage === editingStage.stage ? { ...s, ...editForm } : s
            )
        );
        setEditingStage(null);
    };

    const handleCancelEdit = () => {
        setEditingStage(null);
        setEditForm({});
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
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 transition-all hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                         <div className="pt-1 cursor-grab active:cursor-grabbing text-slate-400">
                            <span className="material-symbols-outlined">drag_indicator</span>
                        </div>
                        
                        <div className="flex-1">
                            {editingStage?.stage === stage.stage ? (
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de Etapa</label>
                                            <input
                                                type="text"
                                                value={editForm.stage}
                                                onChange={(e) => setEditForm(p => ({...p, stage: e.target.value}))}
                                                className="w-full p-2 border rounded text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="w-24">
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                                             <input 
                                                type="color" 
                                                value={editForm.color} 
                                                onChange={(e) => setEditForm(p => ({...p, color: e.target.value}))}
                                                className="w-full h-9 p-0 border-0 rounded cursor-pointer" 
                                             />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Objetivo</label>
                                        <textarea
                                            rows={2}
                                            value={editForm.objective}
                                            onChange={(e) => setEditForm(p => ({...p, objective: e.target.value}))}
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Probabilidad (%)</label>
                                            <input
                                                type="number"
                                                value={editForm.probability}
                                                onChange={(e) => setEditForm(p => ({...p, probability: Number(e.target.value)}))}
                                                className="w-full p-2 border rounded text-sm"
                                                min="0" max="100"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alerta Estancamiento (Días)</label>
                                            <input
                                                type="number"
                                                value={editForm.maxDays}
                                                onChange={(e) => setEditForm(p => ({...p, maxDays: Number(e.target.value)}))}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end mt-2">
                                        <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1">Cancelar</button>
                                        <button onClick={handleSaveEdit} className="text-sm bg-indigo-600 text-white font-semibold px-4 py-1.5 rounded-md shadow-sm hover:bg-indigo-700">Guardar Cambios</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{stage.stage}</h4>
                                        </div>
                                        <button onClick={() => handleEditClick(stage)} className="text-slate-400 hover:text-indigo-600 p-1 rounded">
                                            <span className="material-symbols-outlined !text-lg">edit</span>
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{stage.objective}</p>
                                    <div className="flex gap-4 text-xs text-slate-500">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-sm">trending_up</span> {stage.probability}% Prob.
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-sm">timer</span> Máx {stage.maxDays} días
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const PipelineManagement: React.FC = () => {
    const [activePipeline, setActivePipeline] = useState(pipelines[0].name);
    const activeStages = pipelines.find(p => p.name === activePipeline)?.stages as unknown as Stage[];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gestión de Pipelines</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configura las etapas, probabilidades y SLAs de tus procesos comerciales.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {pipelines.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setActivePipeline(p.name)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors ${
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

                <PipelineStageList initialStages={activeStages} />
                
                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex gap-3">
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">lightbulb</span>
                    <p className="text-sm text-indigo-800 dark:text-indigo-300">
                        <strong>Tip:</strong> Ajustar la probabilidad de cada etapa mejora la precisión de tu pronóstico de ventas (Forecast) en el Dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PipelineManagement;
