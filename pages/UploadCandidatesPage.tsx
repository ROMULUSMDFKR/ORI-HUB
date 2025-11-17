import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProspectingGoal, Product, CandidateTag } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import CustomSelect from '../components/ui/CustomSelect';

const UploadCandidatesPage: React.FC = () => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [prospectingGoal, setProspectingGoal] = useState<ProspectingGoal>('General');
    const [importUrl, setImportUrl] = useState('');
    const [runAiAnalysis, setRunAiAnalysis] = useState(true);
    const [deduplicationStrategy, setDeduplicationStrategy] = useState<'skip' | 'update'>('skip');
    const [initialTags, setInitialTags] = useState<CandidateTag[]>([]);

    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    
    const goalOptions = (['General', 'Puredef', 'Trade Aitirik', 'Santzer'] as ProspectingGoal[]).map(g => ({ value: g, name: g }));
    const productOptions = [{ value: '', name: 'Ninguno' }, ...(products || []).map(p => ({ value: p.id, name: p.name }))];
    const deduplicationOptions = [
        { value: 'skip', name: 'Omitir duplicados' },
        { value: 'update', name: 'Actualizar existentes (no recomendado)' },
    ];

    const availableTags: CandidateTag[] = ['Alto Potencial', 'Potencial Distribuidor', 'Consumidor Directo'];

    const handleToggleTag = (tag: CandidateTag) => {
        setInitialTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleImportFromUrl = async () => {
        if (!importUrl.trim()) {
            alert('Por favor, introduce una URL válida.');
            return;
        }
        setIsProcessing(true);
        setStatus(`Iniciando importación para el objetivo: ${prospectingGoal}...`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('1/5 - Descargando 150 registros desde la URL...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStatus(`2/5 - Verificando duplicados (Estrategia: ${deduplicationStrategy})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('3/5 - Guardando 145 nuevos candidatos en la base de datos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (runAiAnalysis) {
            setStatus('4/5 - Ejecutando análisis con IA para los nuevos candidatos...');
            await new Promise(resolve => setTimeout(resolve, 4000));
        } else {
            setStatus('4/5 - Omitiendo análisis con IA...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setStatus('5/5 - Finalizando importación y aplicando etiquetas...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsProcessing(false);
        setStatus('¡Importación completada! Los candidatos han sido añadidos.');
        alert('Importación simulada completada. Ahora puedes ver los candidatos en la lista.');
        navigate('/prospecting/candidates');
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Importar Candidatos</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Carga nuevos candidatos a tu base de datos desde una URL.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 1: Establecer Objetivo y Perfil</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CustomSelect 
                        label="Objetivo de Prospección *"
                        options={goalOptions}
                        value={prospectingGoal}
                        onChange={(val) => setProspectingGoal(val as ProspectingGoal)}
                    />
                     {productsLoading ? <Spinner /> : (
                        <CustomSelect 
                            label="Perfilar por Producto (Opcional)"
                            options={productOptions}
                            value={selectedProductId}
                            onChange={setSelectedProductId}
                            placeholder="Seleccionar producto..."
                        />
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 2: Opciones de Importación y Enriquecimiento</h3>
                 <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Aplicar etiquetas iniciales</label>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                                <button key={tag} onClick={() => handleToggleTag(tag)} className={`px-3 py-1 text-sm rounded-full border-2 ${initialTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                     </div>
                     <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ejecutar análisis con IA al importar</label>
                         <ToggleSwitch enabled={runAiAnalysis} onToggle={setRunAiAnalysis} />
                     </div>
                     <div className="w-full md:w-1/2">
                        <CustomSelect
                            label="Estrategia de duplicados"
                            options={deduplicationOptions}
                            value={deduplicationStrategy}
                            onChange={(val) => setDeduplicationStrategy(val as any)}
                        />
                    </div>
                 </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 3: Importar desde URL</h3>
                <div className="flex gap-4 items-center">
                    <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." className="flex-grow w-full" />
                    <button onClick={handleImportFromUrl} disabled={isProcessing} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 disabled:opacity-50 flex-shrink-0">
                        {isProcessing ? (<><Spinner/> Procesando...</>) : 'Iniciar Importación'}
                    </button>
                </div>
                 {status && <p className={`text-sm mt-4 ${isProcessing ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-green-600'}`}>{status}</p>}
            </div>
        </div>
    );
};

export default UploadCandidatesPage;
