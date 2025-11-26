
import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { FreightPricingRule, LogisticsOrigin } from '../../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import NewFreightRuleDrawer from '../components/logistics/NewFreightRuleDrawer';
import { api } from '../api/firebaseApi';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';

// MOCK ORIGINS since they are new
const MOCK_ORIGINS: LogisticsOrigin[] = [
    { id: 'hub-1', name: 'Agroindustrias Veracruz', products: ['Urea Industrial (T)', 'Urea Agrícola (T)'], status: 'Activo' },
    { id: 'hub-2', name: 'Planta Estado de México', products: ['Urea Líquida (L)'], status: 'Activo' },
    { id: 'hub-3', name: 'Centro de Distribución Monterrey', products: [], status: 'Inactivo' }
];

// --- New Sub-Components for Tabs ---

const OriginsTab: React.FC = () => {
    // In a real app, fetch from 'logisticsOrigins' collection
    const [origins, setOrigins] = useState<LogisticsOrigin[]>(MOCK_ORIGINS);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [newOriginName, setNewOriginName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleCreateOrigin = () => {
        if (newOriginName.trim()) {
            const newOrigin: LogisticsOrigin = {
                id: `hub-${Date.now()}`,
                name: newOriginName,
                products: [],
                status: 'Activo'
            };
            setOrigins([...origins, newOrigin]);
            setNewOriginName('');
            setIsDrawerOpen(false);
        }
    };

    const filteredOrigins = useMemo(() => {
        return origins.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [origins, searchTerm]);

    const columns = [
        { 
            header: 'Nombre Comercial', 
            accessor: (o: LogisticsOrigin) => (
                 <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        <span className="material-symbols-outlined text-xl">factory</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{o.name}</span>
                </div>
            ) 
        },
        { 
            header: 'Productos Principales', 
            accessor: (o: LogisticsOrigin) => (
                <div className="flex gap-1 flex-wrap">
                    {o.products.length > 0 ? o.products.map(p => <Badge key={p} text={p} color="gray"/>) : <span className="text-xs text-slate-400 italic">Sin productos asignados</span>}
                    {o.products.length > 2 && <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">...</span>}
                </div>
            ) 
        },
        { header: 'Estado', accessor: (o: LogisticsOrigin) => <Badge text={o.status} color={o.status === 'Activo' ? 'blue' : 'gray'} /> },
        { 
            header: 'Acciones', 
            accessor: (o: LogisticsOrigin) => (
                <div className="flex justify-end">
                    <button className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit_square</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
                {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar origen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add_location_alt</span>
                    Nuevo Origen
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredOrigins} />
            </div>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Nuevo Origen Logístico">
                <div className="space-y-4">
                    {/* Input Safe Pattern */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Origen / Planta</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">factory</span>
                            </div>
                            <input 
                                type="text" 
                                value={newOriginName} 
                                onChange={e => setNewOriginName(e.target.value)} 
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700" 
                                placeholder="Ej: Planta Bajío" 
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button onClick={handleCreateOrigin} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar</button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

const BandsTab: React.FC = () => {
    const { data: initialRules, loading, error } = useCollection<FreightPricingRule>('freightPricing');
    const [rules, setRules] = useState<FreightPricingRule[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (initialRules) {
            setRules(initialRules);
        }
    }, [initialRules]);
    
    const filteredRules = useMemo(() => {
        if(!rules) return [];
        return rules.filter(r => 
            r.origin.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.destination.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [rules, searchTerm]);

    const handleSaveRule = async (newRuleData: Omit<FreightPricingRule, 'id'>) => {
        try {
            const newRule = await api.addDoc('freightPricing', { ...newRuleData, active: true });
            setRules(prev => [...(prev || []), newRule]);
            setIsDrawerOpen(false);
        } catch (err) {
            console.error("Error saving rule:", err);
            alert("No se pudo guardar la regla.");
        }
    };
    
    const handleDeleteRule = async (ruleId: string) => {
        if (window.confirm('¿Confirmas que deseas eliminar esta banda de precio?')) {
            try {
                await api.deleteDoc('freightPricing', ruleId);
                setRules(prev => prev!.filter(r => r.id !== ruleId));
            } catch (error) {
                console.error('Error deleting freight rule:', error);
            }
        }
    };

    const columns = [
        {
            header: 'Origen',
            accessor: (r: FreightPricingRule) => <span className="font-bold text-slate-700 dark:text-slate-300">{r.origin}</span>,
        },
        {
            header: 'Banda (km)',
            accessor: (r: FreightPricingRule) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{r.destination}</span>, 
        },
        {
            header: 'Tarifa Base',
            accessor: (r: FreightPricingRule) => <span className="font-medium text-indigo-600 dark:text-indigo-400">${r.flatRate.toLocaleString()}</span>,
            className: 'text-right'
        },
        {
            header: 'Mínimo',
            accessor: (r: FreightPricingRule) => <span className="text-slate-500">${(r.pricePerKg * 1000).toLocaleString()}</span>, 
            className: 'text-right'
        },
        {
            header: 'Estado',
             accessor: (r: FreightPricingRule) => <Badge text={r.active ? 'Activa' : 'Inactiva'} color={r.active ? 'blue' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (r: FreightPricingRule) => (
                <div className="flex justify-end space-x-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><span className="material-symbols-outlined !text-lg">edit</span></button>
                    <button onClick={() => handleDeleteRule(r.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><span className="material-symbols-outlined !text-lg">delete</span></button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
                 {/* Input Safe Pattern */}
                 <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar banda..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Banda
                </button>
            </div>

            {(!filteredRules || filteredRules.length === 0) ? (
                <EmptyState icon="price_change" title="No hay bandas definidas" message="Define tarifas base para el cálculo de fletes." />
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={filteredRules} />
                </div>
            )}

            <NewFreightRuleDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSaveRule} />
        </div>
    );
};

const ConfigTab: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-4xl mx-auto">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">tune</span>
            Configuración General
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Ajustes de tipo de cambio y valores por defecto para el cálculo de flete.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda por Defecto</label>
                <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">payments</span>
                    </div>
                    <select className="block w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700">
                        <option>Peso Mexicano (MXN)</option>
                        <option>Dólar Estadounidense (USD)</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fuente de Tipo de Cambio</label>
                 <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">currency_exchange</span>
                    </div>
                    <select className="block w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700">
                        <option>DOF (Automático)</option>
                        <option>Manual</option>
                    </select>
                </div>
            </div>
        </div>
        <div className="mt-10 flex justify-end border-t border-slate-100 dark:border-slate-700 pt-6">
            <button className="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">save</span>
                Guardar Configuración
            </button>
        </div>
    </div>
);

// --- Main Page ---

const LogisticsPricingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'origins' | 'bands' | 'overrides' | 'config'>('bands');

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Reglas de Precios</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Define y gestiona las tarifas, recargos y prioridades para el cálculo de costos de flete.</p>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('origins')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'origins' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'}`}>Orígenes</button>
                    <button onClick={() => setActiveTab('bands')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'bands' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'}`}>Bandas por Distancia</button>
                    <button onClick={() => setActiveTab('overrides')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overrides' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'}`}>Overrides por CP</button>
                    <button onClick={() => setActiveTab('config')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'config' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'}`}>Configuración</button>
                </nav>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'origins' && <OriginsTab />}
                {activeTab === 'bands' && <BandsTab />}
                {activeTab === 'config' && <ConfigTab />}
                {activeTab === 'overrides' && (
                    <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700">
                         <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">location_off</span>
                         <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Anulaciones por Código Postal</h3>
                         <p className="text-slate-500 dark:text-slate-400 mb-6">Tarifas específicas que anulan las bandas de distancia.</p>
                         <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">Nuevo Override</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogisticsPricingPage;
