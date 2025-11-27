
import React from 'react';

const MapPage: React.FC = () => {
    return (
        <div className="space-y-6 h-full flex flex-col pb-12">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Mapa de Candidatos</h2>
            </div>
            
            <div className="relative flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                
                {/* Mock Map Overlay - Search Bar (Safe Pattern) */}
                <div className="absolute top-4 left-4 z-10 w-80 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar en mapa..." 
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="text-center p-8 max-w-md">
                     {/* App Icon Pattern */}
                    <div className="flex-shrink-0 h-20 w-20 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-500 mx-auto mb-6">
                        <span className="material-symbols-outlined text-5xl">map</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Módulo en Desarrollo</h3>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        Estamos optimizando la visualización geoespacial para manejar grandes volúmenes de puntos. Esta funcionalidad estará disponible en la próxima actualización.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MapPage;
