
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, User, Unit, ProductLot } from '../types';
import Spinner from '../components/ui/Spinner';
import FilterButton from '../components/ui/FilterButton';
import Drawer from '../components/ui/Drawer';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import Table from '../components/ui/Table'; // Using Table component for consistency

// Drawer Component (Kept logic, improved visual structure inside)
const NewMovementDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (movement: Omit<InventoryMove, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
    products: Product[];
    locations: any[];
}> = ({ isOpen, onClose, onSave, products, locations }) => {
    const initialFormState = {
        type: 'in' as InventoryMove['type'],
        productId: '',
        lotId: '',
        qty: 0,
        fromLocationId: '',
        toLocationId: '',
        note: ''
    };
    const [formState, setFormState] = useState(initialFormState);
    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setFormState(initialFormState);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchLots = async () => {
            if (formState.productId) {
                const lots = await api.getLotsForProduct(formState.productId);
                setAvailableLots(lots);
            } else {
                setAvailableLots([]);
            }
            setFormState(prev => ({ ...prev, lotId: '' }));
        };
        fetchLots();
    }, [formState.productId]);

    const handleChange = (field: keyof typeof formState, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formState.productId || !formState.qty) {
            alert('Producto y cantidad son requeridos.');
            return;
        }
        if ((formState.type === 'out' || formState.type === 'transfer') && !formState.fromLocationId) {
            alert('La ubicación de origen es requerida.');
            return;
        }
        if ((formState.type === 'in' || formState.type === 'transfer') && !formState.toLocationId) {
            alert('La ubicación de destino es requerida.');
            return;
        }

        const product = products.find(p => p.id === formState.productId);
        if (!product) return;

        onSave({
            type: formState.type,
            productId: formState.productId,
            lotId: formState.lotId,
            qty: formState.type === 'out' ? -Math.abs(formState.qty) : Math.abs(formState.qty),
            unit: product.unitDefault,
            fromLocationId: (formState.type === 'out' || formState.type === 'transfer') ? formState.fromLocationId : undefined,
            toLocationId: (formState.type === 'in' || formState.type === 'transfer') ? formState.toLocationId : undefined,
            note: formState.note,
        });
        onClose();
    };
    
    const productOptions = (products || []).map(p => ({ value: p.id, name: p.name }));
    const locationOptions = (locations || []).map(l => ({ value: l.id, name: l.name }));
    const lotOptions = (availableLots || []).map(l => ({ value: l.id, name: l.code }));

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Nuevo Movimiento">
            <div className="space-y-6">
                <CustomSelect 
                    label="Tipo de Movimiento" 
                    options={[{value: 'in', name: 'Entrada'}, {value: 'out', name: 'Salida'}, {value: 'transfer', name: 'Traspaso'}, {value: 'adjust', name: 'Ajuste'}]} 
                    value={formState.type} 
                    onChange={val => handleChange('type', val)} 
                />
                
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-4">
                    <CustomSelect label="Producto" options={productOptions} value={formState.productId} onChange={val => handleChange('productId', val)} placeholder="Seleccionar producto..."/>
                    <CustomSelect label="Lote (Opcional)" options={lotOptions} value={formState.lotId} onChange={val => handleChange('lotId', val)} placeholder="Seleccionar lote..."/>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad</label>
                         <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">numbers</span>
                            </div>
                            <input 
                                type="number" 
                                value={formState.qty} 
                                onChange={e => handleChange('qty', Number(e.target.value))}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800"
                            />
                        </div>
                    </div>
                </div>

                {(formState.type === 'out' || formState.type === 'transfer') && <CustomSelect label="Origen (De)" options={locationOptions} value={formState.fromLocationId} onChange={val => handleChange('fromLocationId', val)} placeholder="Ubicación de origen..."/>}
                {(formState.type === 'in' || formState.type === 'transfer') && <CustomSelect label="Destino (A)" options={locationOptions} value={formState.toLocationId} onChange={val => handleChange('toLocationId', val)} placeholder="Ubicación de destino..."/>}
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nota / Motivo</label>
                    <textarea 
                        value={formState.note} 
                        onChange={e => handleChange('note', e.target.value)} 
                        rows={3}
                        className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800"
                        placeholder="Razón del movimiento..."
                    />
                </div>
            </div>
             <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Registrar</button>
            </div>
        </Drawer>
    )
};

const InventoryMovementsPage: React.FC = () => {
    const { data: initialMoves, loading: movesLoading } = useCollection<InventoryMove>('inventoryMoves');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');
    const { user: currentUser } = useAuth();
    
    const [moves, setMoves] = useState<InventoryMove[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Filters
    const [typeFilter, setTypeFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (initialMoves) {
            setMoves(initialMoves);
        }
    }, [initialMoves]);

    const productsMap = React.useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
    const locationsMap = React.useMemo(() => new Map((locations || []).map((l: any) => [l.id, l.name])), [locations]);
    const usersMap = React.useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const filteredMoves = useMemo(() => {
        if (!moves) return [];
        let sortedMoves = [...moves].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return sortedMoves.filter(move => {
            const typeMatch = typeFilter === 'all' || move.type === typeFilter;
            const productMatch = productFilter === 'all' || move.productId === productFilter;
            const locationMatch = locationFilter === 'all' || move.fromLocationId === locationFilter || move.toLocationId === locationFilter;
            const searchMatch = !searchTerm || move.note?.toLowerCase().includes(searchTerm.toLowerCase()) || productsMap.get(move.productId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
            return typeMatch && productMatch && locationMatch && searchMatch;
        });
    }, [moves, typeFilter, productFilter, locationFilter, searchTerm, productsMap]);
    
    const typeOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'in', label: 'Entrada' },
        { value: 'out', label: 'Salida' },
        { value: 'transfer', label: 'Traslado' },
        { value: 'adjust', label: 'Ajuste' },
    ];
    const productOptions = useMemo(() => [{value: 'all', label: 'Todos'}, ...(products?.map(p => ({ value: p.id, label: p.name })) || [])], [products]);
    const locationOptions = useMemo(() => [{value: 'all', label: 'Todas'}, ...(locations || []).map((l: any) => ({ value: l.id, label: l.name }))], [locations]);

    const handleSaveMovement = async (movementData: Omit<InventoryMove, 'id' | 'createdAt' | 'userId'>) => {
        if (!currentUser) {
            alert("No se pudo identificar al usuario.");
            return;
        }
        try {
            const newMovement = await api.addDoc('inventoryMoves', {
                ...movementData,
                userId: currentUser.id,
                createdAt: new Date().toISOString()
            });
            setMoves(prev => [newMovement, ...(prev || [])]);
            // NOTE: In a real app, this should trigger an update to the stock in the 'lots' collection.
            alert('Movimiento de inventario guardado. (La actualización de stock es simulada)');
        } catch (error) {
            console.error("Error saving movement:", error);
            alert("No se pudo guardar el movimiento.");
        }
    };

    const columns = [
        {
            header: 'Tipo',
            accessor: (move: InventoryMove) => {
                const configs = {
                    in: { icon: 'arrow_downward', bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Entrada' },
                    out: { icon: 'arrow_upward', bg: 'bg-red-100', text: 'text-red-700', label: 'Salida' },
                    transfer: { icon: 'swap_horiz', bg: 'bg-blue-100', text: 'text-blue-700', label: 'Traslado' },
                    adjust: { icon: 'tune', bg: 'bg-slate-100', text: 'text-slate-700', label: 'Ajuste' },
                };
                const cfg = configs[move.type] || configs.adjust;
                
                return (
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} dark:bg-opacity-20`}>
                        <span className="material-symbols-outlined !text-sm">{cfg.icon}</span>
                        {cfg.label}
                    </div>
                );
            }
        },
        {
            header: 'Producto',
            accessor: (move: InventoryMove) => <span className="font-semibold text-slate-800 dark:text-slate-200">{productsMap.get(move.productId)?.name || 'N/A'}</span>
        },
        {
            header: 'Cantidad',
            accessor: (move: InventoryMove) => (
                <span className={`font-mono font-bold ${move.qty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {move.qty > 0 ? '+' : ''}{move.qty.toLocaleString()} {move.unit}
                </span>
            ),
            className: 'text-right'
        },
        {
            header: 'Ubicación (De -> A)',
            accessor: (move: InventoryMove) => (
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                    {move.fromLocationId ? locationsMap.get(move.fromLocationId) : <span className="italic">Externo</span>}
                    <span className="material-symbols-outlined mx-2 !text-sm">arrow_right_alt</span>
                    {move.toLocationId ? locationsMap.get(move.toLocationId) : <span className="italic">Externo</span>}
                </div>
            )
        },
        {
            header: 'Fecha',
            accessor: (move: InventoryMove) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{new Date(move.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs text-slate-500">{new Date(move.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            )
        },
        {
            header: 'Usuario',
            accessor: (move: InventoryMove) => {
                const u = usersMap.get(move.userId);
                return (
                    <div className="flex items-center gap-2" title={u?.name}>
                         <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                             {u?.name?.substring(0, 2).toUpperCase() || '??'}
                         </div>
                    </div>
                )
            }
        }
    ];

    const loading = movesLoading || productsLoading || usersLoading || locationsLoading;

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Kárdex de Movimientos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Registro detallado de todas las entradas, salidas y ajustes de inventario.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined">add_circle</span>
                    Registrar Movimiento
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-center justify-between">
                 {/* Input Safe Pattern */}
                <div className="relative w-full lg:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nota o producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                     <FilterButton
                        label="Tipo"
                        options={typeOptions}
                        selectedValue={typeFilter}
                        onSelect={setTypeFilter}
                    />
                    <FilterButton
                        label="Producto"
                        options={productOptions}
                        selectedValue={productFilter}
                        onSelect={setProductFilter}
                    />
                    <FilterButton
                        label="Ubicación"
                        options={locationOptions}
                        selectedValue={locationFilter}
                        onSelect={setLocationFilter}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredMoves} />
            </div>

            <NewMovementDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveMovement}
                products={products || []}
                locations={locations || []}
            />
        </div>
    );
};

export default InventoryMovementsPage;
