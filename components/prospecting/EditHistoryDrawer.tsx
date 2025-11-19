import React, { useState, useEffect, useMemo } from 'react';
import Drawer from '../ui/Drawer';
import { ImportHistory, Product } from '../../types';
import CustomSelect from '../ui/CustomSelect';
import ToggleSwitch from '../ui/ToggleSwitch';
import { useCollection } from '../../hooks/useCollection';

const MEXICAN_STATES = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 
    'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 
    'Jalisco', 'Estado de México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
    'Ciudad de México'
].sort();

interface EditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCriteria: ImportHistory['searchCriteria']) => void;
  historyRecord: ImportHistory;
}

const EditHistoryDrawer: React.FC<EditHistoryDrawerProps> = ({ isOpen, onClose, onSave, historyRecord }) => {
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const [criteria, setCriteria] = useState(historyRecord.searchCriteria);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    useEffect(() => {
        setCriteria(historyRecord.searchCriteria);
    }, [historyRecord]);

    const handleCriteriaChange = (field: keyof typeof criteria, value: any) => {
        setCriteria(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSearchTerm = () => {
        if (currentSearchTerm.trim() && !criteria.searchTerms.includes(currentSearchTerm.trim())) {
            setCriteria(prev => ({ ...prev, searchTerms: [...prev.searchTerms, currentSearchTerm.trim()] }));
        }
        setCurrentSearchTerm('');
    };

    const handleRemoveSearchTerm = (termToRemove: string) => {
        setCriteria(prev => ({ ...prev, searchTerms: prev.searchTerms.filter(t => t !== termToRemove) }));
    };

    const handleSave = () => {
        onSave(criteria);
    };
    
    const companyOptions = [
        { value: '', name: 'No aplica / Se definirá después' },
        { value: 'Puredef', name: 'Puredef' },
        { value: 'Trade Aitirik', name: 'Trade Aitirik' },
        { value: 'Santzer', name: 'Santzer' }
    ];

    const productOptions = useMemo(() => {
        if (!products) return [{ value: '', name: 'No aplica / Se definirá después' }];
        return [
            { value: '', name: 'No aplica / Se definirá después' },
            ...products.map(p => ({ value: p.id, name: p.name }))
        ];
    }, [products]);

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Editar Criterios de Búsqueda">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Término de búsqueda *</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={currentSearchTerm}
                            onChange={e => setCurrentSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSearchTerm())}
                            placeholder="Añade términos..."
                            className="flex-grow"
                        />
                        <button onClick={handleAddSearchTerm} className="border border-indigo-600 text-indigo-600 font-semibold py-2 px-4 rounded-lg">Añadir</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {criteria.searchTerms.map(term => (
                            <span key={term} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                                {term}
                                <button onClick={() => handleRemoveSearchTerm(term)} className="ml-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomSelect 
                        label="Perfilado para (Empresa)"
                        options={companyOptions}
                        value={criteria.profiledCompany}
                        onChange={(val) => handleCriteriaChange('profiledCompany', val as any)}
                    />
                     <CustomSelect 
                        label="Producto perfilado"
                        options={productOptions}
                        value={criteria.profiledProductId}
                        onChange={(val) => handleCriteriaChange('profiledProductId', val)}
                        placeholder={productsLoading ? 'Cargando...' : 'Seleccionar...'}
                    />
                    <CustomSelect 
                        label="Ubicación *"
                        options={MEXICAN_STATES.map(s => ({ value: s, name: s }))}
                        value={criteria.location}
                        onChange={(val) => handleCriteriaChange('location', val)}
                    />
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de resultados *</label>
                        <input type="number" value={criteria.resultsCount} onChange={e => handleCriteriaChange('resultsCount', Number(e.target.value))} />
                    </div>
                    <CustomSelect 
                        label="Lenguaje *"
                        options={[{value: 'es', name: 'Español'}, {value: 'en', name: 'Inglés'}]}
                        value={criteria.language}
                        onChange={(val) => handleCriteriaChange('language', val)}
                    />
                </div>

                <div className="flex gap-8 pt-2">
                    <div className="flex items-center gap-3">
                        <ToggleSwitch enabled={criteria.includeWebResults} onToggle={() => handleCriteriaChange('includeWebResults', !criteria.includeWebResults)} />
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir resultados web</label>
                    </div>
                    <div className="flex items-center gap-3">
                         <ToggleSwitch enabled={criteria.enrichContacts} onToggle={() => handleCriteriaChange('enrichContacts', !criteria.enrichContacts)} />
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enriquecer contactos</label>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Cambios</button>
            </div>
        </Drawer>
    );
};

export default EditHistoryDrawer;