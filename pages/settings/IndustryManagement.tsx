
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Company } from '../../types';
import Spinner from '../../components/ui/Spinner';

// KPI Card following "App Icon Pattern"
const IndustryKpiCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const IndustryManagement: React.FC = () => {
    const { data: companies, loading } = useCollection<Company>('companies');
    const [industries, setIndustries] = useState<string[]>([]);
    const [newIndustry, setNewIndustry] = useState('');

    useEffect(() => {
        if (companies) {
            const uniqueIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean) as string[])];
            setIndustries(uniqueIndustries.sort());
        }
    }, [companies]);

    const industryStats = useMemo(() => {
        if (!companies) return {};
        return companies.reduce((acc, c) => {
            if (c.industry) {
                acc[c.industry] = (acc[c.industry] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [companies]);

    const totalCompaniesWithIndustry = useMemo(() => {
        if (!companies) return 0;
        return companies.filter(c => !!c.industry).length;
    }, [companies]);

    const handleAddIndustry = () => {
        if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
            setIndustries(prev => [...prev, newIndustry.trim()].sort());
            setNewIndustry('');
        }
    };
    
    const handleDeleteIndustry = (industryToDelete: string) => {
        if (window.confirm(`¿Eliminar la industria "${industryToDelete}"?`)) {
            setIndustries(prev => prev.filter(i => i !== industryToDelete));
        }
    }

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Industrias</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las categorías de industria para clasificar a tus clientes y prospectos.</p>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <IndustryKpiCard title="Total Industrias" value={industries.length} icon="factory" color="indigo" />
                <IndustryKpiCard title="Empresas Clasificadas" value={totalCompaniesWithIndustry} icon="domain_verification" color="emerald" />
                <IndustryKpiCard title="Promedio por Industria" value={industries.length > 0 ? Math.round(totalCompaniesWithIndustry / industries.length) : 0} icon="analytics" color="blue" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Form Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Añadir Nueva Industria</h3>
                        <div className="space-y-4">
                            {/* Input Safe Pattern */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined h-5 w-5 text-gray-400">category</span>
                                </div>
                                <input
                                    type="text"
                                    value={newIndustry}
                                    onChange={(e) => setNewIndustry(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddIndustry()}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                    placeholder="Ej. Manufactura"
                                />
                            </div>
                            <button 
                                onClick={handleAddIndustry} 
                                disabled={!newIndustry.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">add_circle</span>
                                Añadir Industria
                            </button>
                        </div>
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                Las industrias añadidas aquí estarán disponibles en los selectores de clientes y prospectos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* List Column */}
                 <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Industrias Existentes</h3>
                        </div>
                        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {industries.length > 0 ? (
                                industries.map(industry => {
                                    const count = industryStats[industry] || 0;
                                    return (
                                        <div key={industry} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group">
                                            <div className="flex items-center gap-4">
                                                {/* App Icon Pattern */}
                                                <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                     <span className="material-symbols-outlined text-xl">domain</span>
                                                </div>
                                                <div>
                                                     <h4 className="font-semibold text-slate-800 dark:text-slate-200">{industry}</h4>
                                                     <p className="text-xs text-slate-500 dark:text-slate-400">{count} {count === 1 ? 'empresa vinculada' : 'empresas vinculadas'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => alert(`Editando "${industry}"...`)} className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => handleDeleteIndustry(industry)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-slate-500 dark:text-slate-400">No hay industrias definidas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndustryManagement;
