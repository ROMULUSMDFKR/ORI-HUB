import React, { useState } from 'react';
import { PIPELINE_COLUMNS, SAMPLES_PIPELINE_COLUMNS, QUOTES_PIPELINE_COLUMNS, SALES_ORDERS_PIPELINE_COLUMNS, COMPANIES_PIPELINE_COLUMNS } from '../../constants';

const pipelines = [
    { name: 'Prospectos', stages: PIPELINE_COLUMNS },
    { name: 'Muestras', stages: SAMPLES_PIPELINE_COLUMNS },
    { name: 'Cotizaciones', stages: QUOTES_PIPELINE_COLUMNS },
    { name: 'Órdenes de Venta', stages: SALES_ORDERS_PIPELINE_COLUMNS },
    { name: 'Empresas', stages: COMPANIES_PIPELINE_COLUMNS },
];

const PipelineStageList: React.FC<{ stages: { stage: string, objective: string }[] }> = ({ stages }) => {
    return (
        <div className="space-y-3">
            {stages.map(({ stage, objective }) => (
                <div key={stage} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
                    <div>
                        <p className="font-semibold text-on-surface">{stage}</p>
                        <p className="text-sm text-on-surface-secondary">{objective}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-full hover:bg-background"><span className="material-symbols-outlined text-on-surface-secondary">drag_indicator</span></button>
                        <button className="p-2 rounded-full hover:bg-background"><span className="material-symbols-outlined text-on-surface-secondary">edit</span></button>
                    </div>
                </div>
            ))}
        </div>
    );
};


const PipelineManagement: React.FC = () => {
    const [activePipeline, setActivePipeline] = useState(pipelines[0].name);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-on-surface">Etapas de Venta (Pipelines)</h2>
                <p className="text-on-surface-secondary mt-1">Personaliza las etapas de tus procesos comerciales para que coincidan con tu flujo de trabajo.</p>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-sm">
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {pipelines.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setActivePipeline(p.name)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base ${
                                    activePipeline === p.name
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'
                                }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-6">
                    {pipelines.map(p => (
                        <div key={p.name} className={activePipeline === p.name ? 'block' : 'hidden'}>
                            <PipelineStageList stages={p.stages} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PipelineManagement;