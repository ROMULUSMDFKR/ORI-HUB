
import React, { useState, useEffect } from 'react';
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

    const columns = [
        { header: 'Nombre Comercial', accessor: (o: LogisticsOrigin) => <span className="font-semibold text-slate-800 dark:text-slate-200">{o.name}</span> },
        { 
            header: 'Productos Principales', 
            accessor: (o: LogisticsOrigin) => (
                <div className="flex gap-1 flex-wrap">
                    {o.products.length > 0 ? o.products.map(p => <Badge key={p} text={p} color="gray"/>) : <span className="text-xs text-slate-400">Sin productos asignados</span>}
                    {o.products.length > 0 && <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">+1</span>}
                </div>
            ) 
        },
        { header: 'Estado', accessor: (o: LogisticsOrigin) => <Badge text={o.status} color={o.status === 'Activo' ? 'blue' : 'gray'} /> },
        { 
            header: 'Acciones', 
            accessor: (o: LogisticsOrigin) => (
                <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium py-1 px-3 rounded hover:bg-slate-50 dark:hover:bg-slate-600">
                    Gestionar
                </button>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Orígenes (Hubs)</h3>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add_location_alt</span>
                    Nuevo Origen
                </button>
            </div>
            <Table columns={columns} data={origins} />

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Nuevo Origen Logístico">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Origen / Planta</label>
                        <input type="text" value={newOriginName} onChange={e => setNewOriginName(e.target.value)} className="w-full" placeholder="Ej: Planta Bajío" />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button onClick={handleCreateOrigin} className="bg-indigo-600 text-white py-2 px-4 rounded-lg">Guardar</button>
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

    useEffect(() => {
        if (initialRules) {
            setRules(initialRules);
        }
    }, [initialRules]);

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
            accessor: (r: FreightPricingRule) => <span className="font-medium text-slate-700 dark:text-slate-300">{r.origin}</span>,
        },
        {
            header: 'Banda (km)',
            accessor: (r: FreightPricingRule) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.destination}</span>, // Reusing destination field as 'Band/Range' description for simulation
        },
        {
            header: 'Unidad',
            accessor: (r: FreightPricingRule) => 't', // Hardcoded for display based on screenshot
             className: 'text-center'
        },
        {
            header: 'Tarifa Base',
            accessor: (r: FreightPricingRule) => <span className="font-medium">${r.flatRate.toLocaleString()}</span>,
            className: 'text-right'
        },
        {
            header: 'Mínimo',
            accessor: (r: FreightPricingRule) => <span className="text-slate-500">${(r.pricePerKg * 1000).toLocaleString()}</span>, // Simulating minimum cost logic
            className: 'text-right'
        },
         {
            header: 'Vigencia',
            accessor: (r: FreightPricingRule) => <span className="text-xs text-slate-500">31/12/23 → ∞</span>, // Mock validity
        },
        {
            header: 'Estado',
             accessor: (r: FreightPricingRule) => <Badge text={r.active ? 'Activa' : 'Inactiva'} color={r.active ? 'blue' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (r: FreightPricingRule) => (
                <div className="flex justify-end space-x-2">
                    <button className="p-1 text-gray-400 hover:text-indigo-600"><span className="material-symbols-outlined !text-base">edit</span></button>
                    <button onClick={() => handleDeleteRule(r.id)} className="p-1 text-gray-400 hover:text-red-500"><span className="material-symbols-outlined !text-base">delete</span></button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Bandas de Distancia</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tarifas por rangos de kilómetros desde cada origen.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Banda
                </button>
            </div>

            {(!rules || rules.length === 0) ? (
                <EmptyState icon="price_change" title="No hay bandas definidas" message="Define tarifas base para el cálculo de fletes." />
            ) : (
                <Table columns={columns} data={rules} />
            )}

            <NewFreightRuleDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSaveRule} />
        </div>
    );
};

const ConfigTab: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-4xl">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Configuración General</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Ajustes de tipo de cambio y valores por defecto para el cálculo de flete.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda por Defecto</label>
                <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                    <option>Peso Mexicano (MXN)</option>
                    <option>Dólar Estadounidense (USD)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fuente de Tipo de Cambio</label>
                <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                    <option>DOF (Automático)</option>
                    <option>Manual</option>
                </select>
            </div>
        </div>
        <div className="mt-8 flex justify-end">
            <button className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-indigo-700">Guardar Configuración</button>
        </div>
    </div>
);

// --- Main Page ---

const LogisticsPricingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'origins' | 'map' | 'bands' | 'overrides' | 'config'>('bands');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Reglas de Precios de Logística</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Define y gestiona las tarifas, recargos y prioridades para el cálculo de costos de flete.</p>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg px-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('origins')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'origins' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Orígenes</button>
                    <button onClick={() => setActiveTab('map')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'map' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Mapa</button>
                    <button onClick={() => setActiveTab('bands')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bands' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Bandas por Distancia</button>
                    <button onClick={() => setActiveTab('overrides')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overrides' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Overrides por CP</button>
                    <button onClick={() => setActiveTab('config')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'config' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Configuración</button>
                </nav>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'origins' && <OriginsTab />}
                {activeTab === 'bands' && <BandsTab />}
                {activeTab === 'config' && <ConfigTab />}
                {activeTab === 'map' && (
                    <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-700">
                         <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">map</span>
                         <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Mapa Interactivo de Logística</h3>
                         <p className="text-slate-500 dark:text-slate-400">La integración del mapa se implementará aquí.</p>
                    </div>
                )}
                {activeTab === 'overrides' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Anulaciones por Código Postal</h3>
                                <p className="text-sm text-slate-500">Tarifas específicas que anulan las bandas de distancia.</p>
                            </div>
                             <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90">Nuevo Override</button>
                        </div>
                        <EmptyState icon="location_off" title="No hay excepciones" message="Agrega excepciones específicas para códigos postales difíciles." />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogisticsPricingPage;
