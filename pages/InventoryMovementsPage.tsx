import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, User, Unit, ProductLot } from '../types';
import Spinner from '../components/ui/Spinner';
import FilterButton from '../components/ui/FilterButton';
import Drawer from '../components/ui/Drawer';
import CustomSelect from '../components/ui/CustomSelect';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';


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
        <Drawer isOpen={isOpen} onClose={onClose} title="Nuevo Movimiento de Inventario">
            <div className="space-y-4">
                <CustomSelect label="Tipo de Movimiento" options={[{value: 'in', name: 'Entrada'}, {value: 'out', name: 'Salida'}, {value: 'transfer', name: 'Traspaso'}, {value: 'adjust', name: 'Ajuste'}]} value={formState.type} onChange={val => handleChange('type', val)} />
                <CustomSelect label="Producto" options={productOptions} value={formState.productId} onChange={val => handleChange('productId', val)} placeholder="Seleccionar producto..."/>
                <CustomSelect label="Lote" options={lotOptions} value={formState.lotId} onChange={val => handleChange('lotId', val)} placeholder="Seleccionar lote..."/>
                <div><label>Cantidad</label><input type="number" value={formState.qty} onChange={e => handleChange('qty', Number(e.target.value))}/></div>
                {(formState.type === 'out' || formState.type === 'transfer') && <CustomSelect label="De" options={locationOptions} value={formState.fromLocationId} onChange={val => handleChange('fromLocationId', val)} placeholder="Ubicación de origen..."/>}
                {(formState.type === 'in' || formState.type === 'transfer') && <CustomSelect label="A" options={locationOptions} value={formState.toLocationId} onChange={val => handleChange('toLocationId', val)} placeholder="Ubicación de destino..."/>}
                <div><label>Nota / Motivo</label><textarea value={formState.note} onChange={e => handleChange('note', e.target.value)} rows={3}/></div>
            </div>
             <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                <button onClick={handleSubmit} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Guardar Movimiento</button>
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
    const [typeFilter, setTypeFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');

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
            return typeMatch && productMatch && locationMatch;
        });
    }, [moves, typeFilter, productFilter, locationFilter]);
    
    const typeOptions = [
        { value: 'in', label: 'Entrada' },
        { value: 'out', label: 'Salida' },
        { value: 'transfer', label: 'Traslado' },
        { value: 'adjust', label: 'Ajuste' },
    ];
    const productOptions = useMemo(() => products?.map(p => ({ value: p.id, label: p.name })) || [], [products]);
    const locationOptions = useMemo(() => (locations || []).map((l: any) => ({ value: l.id, label: l.name })), [locations]);


    const getTypePill = (type: InventoryMove['type']) => {
        switch (type) {
            case 'in':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300"><span className="material-symbols-outlined !text-sm">arrow_upward</span> Entrada</div>;
            case 'out':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300"><span className="material-symbols-outlined !text-sm">arrow_downward</span> Salida</div>;
            case 'transfer':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300"><span className="material-symbols-outlined !text-sm">arrow_forward</span> Traslado</div>;
            case 'adjust':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"><span className="material-symbols-outlined !text-sm">settings</span> Ajuste</div>;
        }
    };
    
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


    const loading = movesLoading || productsLoading || usersLoading || locationsLoading;

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-end items-center">
                    <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                        <span className="material-symbols-outlined mr-2">add_circle</span>
                        Nuevo Movimiento
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">calendar_today</span>
                        <input type="text" placeholder="dd/mm/aaaa" className="w-full sm:w-40 bg-white dark:bg-slate-800 pl-11 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 search-input-field"/>
                    </div>
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

                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        {/* Table Header */}
                        <div className="grid grid-cols-8 gap-4 px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <div className="col-span-1">Fecha/Hora</div>
                            <div className="col-span-1">Tipo</div>
                            <div className="col-span-1">Producto</div>
                            <div className="col-span-1">Cantidad</div>
                            <div className="col-span-1">De</div>
                            <div className="col-span-1">A</div>
                            <div className="col-span-1">Motivo</div>
                            <div className="col-span-1">Usuario</div>
                        </div>
                        {/* Table Body */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredMoves.map((move) => {
                                const product = productsMap.get(move.productId);
                                const user = usersMap.get(move.userId);
                                return (
                                    <div key={move.id} className="grid grid-cols-8 gap-4 px-6 py-4 items-center text-sm text-slate-800 dark:text-slate-200">
                                        <div className="col-span-1 font-medium uppercase">{new Date(move.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                                        <div className="col-span-1">{getTypePill(move.type)}</div>
                                        <div className="col-span-1 font-semibold">{product?.name || 'N/A'}</div>
                                        <div className={`col-span-1 font-bold ${move.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {move.qty > 0 ? '+' : ''}{move.qty.toLocaleString()} {move.unit}
                                        </div>
                                        <div className="col-span-1">{locationsMap.get(move.fromLocationId || '') || '—'}</div>
                                        <div className="col-span-1">{locationsMap.get(move.toLocationId || '') || '—'}</div>
                                        <div className="col-span-1">{move.note || '—'}</div>
                                        <div className="col-span-1">{user?.name || 'N/A'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            <NewMovementDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveMovement}
                products={products || []}
                locations={locations || []}
            />
        </>
    );
};

export default InventoryMovementsPage;