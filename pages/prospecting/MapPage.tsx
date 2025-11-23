
import React from 'react';

const MapPage: React.FC = () => {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Mapa de Candidatos</h2>
            <div className="mt-8 p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">map</span>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Módulo en Mantenimiento</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Estamos optimizando la visualización del mapa. Esta sección estará disponible pronto.
                </p>
            </div>
        </div>
    );
};

export default MapPage;
