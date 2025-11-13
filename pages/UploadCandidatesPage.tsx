import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProspectingGoal, Product } from '../types';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';

const UploadCandidatesPage: React.FC = () => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [prospectingGoal, setProspectingGoal] = useState<ProspectingGoal>('General');
    const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
    const goalDropdownRef = useRef<HTMLDivElement>(null);
    const [importUrl, setImportUrl] = useState('');

    // New state for product selection
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const productDropdownRef = useRef<HTMLDivElement>(null);
    
    const goals: ProspectingGoal[] = ['General', 'Puredef', 'Trade Aitirik', 'Santzer'];

    // Custom hook for closing dropdowns on outside click
    const useOutsideAlerter = (ref: React.RefObject<HTMLDivElement>, setOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (ref.current && !ref.current.contains(event.target as Node)) {
                    setOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [ref, setOpen]);
    }

    useOutsideAlerter(goalDropdownRef, setIsGoalDropdownOpen);
    useOutsideAlerter(productDropdownRef, setIsProductDropdownOpen);


    const handleImportFromUrl = async () => {
        if (!importUrl.trim()) {
            alert('Por favor, introduce una URL válida.');
            return;
        }
        setIsProcessing(true);
        const selectedProduct = products?.find(p => p.id === selectedProductId);
        let statusMessage = `Iniciando importación para el objetivo: ${prospectingGoal}`;
        if (selectedProduct) {
            statusMessage += ` (Producto: ${selectedProduct.name})`;
        }
        statusMessage += '...';
        setStatus(statusMessage);
        
        // Simulate API fetch and processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('Descargando registros desde la URL...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStatus('Procesando y guardando candidatos en la base de datos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setIsProcessing(false);
        setStatus('¡Importación completada! Los candidatos han sido añadidos.');
        alert('Importación simulada completada. Ahora puedes ver los candidatos en la lista.');
        navigate('/prospecting/candidates');
    };
    
    const selectedProduct = products?.find(p => p.id === selectedProductId);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Importar Candidatos</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Carga nuevos candidatos a tu base de datos desde un archivo o una URL.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 1: Establecer Objetivo y Perfil</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Selecciona un perfil y un producto (opcional) para este dataset. Esto ayudará a la IA a categorizar y asignar los candidatos correctamente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prospecting Goal */}
                    <div className="relative" ref={goalDropdownRef}>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Objetivo de Prospección *</label>
                        <button
                            type="button"
                            onClick={() => setIsGoalDropdownOpen(!isGoalDropdownOpen)}
                            className="flex w-full items-center justify-between gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">ads_click</span>
                                <span>{prospectingGoal}</span>
                            </div>
                            <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                {isGoalDropdownOpen ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {isGoalDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1">
                                {goals.map(goal => (
                                    <button
                                        key={goal}
                                        onClick={() => { setProspectingGoal(goal); setIsGoalDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${prospectingGoal === goal ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                                    >
                                        {goal}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Profile */}
                    {productsLoading ? <Spinner /> : (
                        <div className="relative" ref={productDropdownRef}>
                             <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Perfilar por Producto (Opcional)</label>
                            <button
                                type="button"
                                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                className="flex w-full items-center justify-between gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">inventory_2</span>
                                    <span className="truncate">{selectedProduct?.name || 'Seleccionar producto...'}</span>
                                </div>
                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                    {isProductDropdownOpen ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                            {isProductDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1 max-h-60 overflow-y-auto">
                                    <button
                                        onClick={() => { setSelectedProductId(''); setIsProductDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${selectedProductId === '' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                                    >
                                        Ninguno
                                    </button>
                                    {products?.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => { setSelectedProductId(product.id); setIsProductDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${selectedProductId === product.id ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                                        >
                                            {product.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Paso 2: Importar desde URL</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Pega la URL del dataset JSON para importar los candidatos.
                </p>
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-grow w-full"
                    />
                    <button
                        onClick={handleImportFromUrl}
                        disabled={isProcessing}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                    >
                        {isProcessing ? 'Procesando...' : 'Iniciar Importación'}
                    </button>
                </div>
                 {status && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-4 animate-pulse">{status}</p>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Opcional: Subir Archivo</h3>
                 <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">cloud_upload</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                        Arrastra y suelta un archivo <span className="font-semibold">.JSON</span> o <span className="font-semibold">.CSV</span> aquí, o haz clic para seleccionarlo.
                    </p>
                    <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-semibold py-2 px-4 rounded-md flex items-center gap-2 mt-4 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        Seleccionar Archivo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadCandidatesPage;