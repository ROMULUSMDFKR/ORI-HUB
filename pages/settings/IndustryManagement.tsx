import React, { useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Company } from '../../types';

const IndustryManagement: React.FC = () => {
    const { data: companies } = useCollection<Company>('companies');
    const [industries, setIndustries] = useState<string[]>([]);
    const [newIndustry, setNewIndustry] = useState('');

    useEffect(() => {
        if (companies) {
            const uniqueIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean) as string[])];
            setIndustries(uniqueIndustries.sort());
        }
    }, [companies]);

    const handleAddIndustry = () => {
        if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
            setIndustries(prev => [...prev, newIndustry.trim()].sort());
            setNewIndustry('');
        }
    };
    
    const handleDeleteIndustry = (industryToDelete: string) => {
        setIndustries(prev => prev.filter(i => i !== industryToDelete));
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Industrias</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las categorías de industria para tus clientes y prospectos.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Añadir Nueva Industria</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newIndustry}
                            onChange={(e) => setNewIndustry(e.target.value)}
                            placeholder="Ej: Manufactura"
                        />
                        <button onClick={handleAddIndustry} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">
                            Añadir
                        </button>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Industrias Existentes</h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                        {industries.map(industry => (
                            <li key={industry} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                <span className="text-slate-800 dark:text-slate-200">{industry}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => alert(`Editando "${industry}"...`)} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button onClick={() => handleDeleteIndustry(industry)} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default IndustryManagement;