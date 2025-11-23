
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, User } from '../types';
import Spinner from '../components/ui/Spinner';
import FilterButton from '../components/ui/FilterButton';
import { api } from '../api/firebaseApi';
import { useNavigate } from 'react-router-dom';

const InventoryMovementsPage: React.FC = () => {
    const { data: initialMoves, loading: movesLoading } = useCollection<InventoryMove>('inventoryMoves');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');
    
    const navigate = useNavigate();
    
    const [moves, setMoves] = useState<InventoryMove[] | null>(null);
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
            const searchMatch = !searchTerm || 
                move.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                move.reference?.toLowerCase().includes(searchTerm.toLowerCase());
                
            return typeMatch && productMatch && locationMatch && searchMatch;
        });
    }, [moves, typeFilter, productFilter, locationFilter, searchTerm]);
    
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
                return <div className="inline-flex items-center gap-1 text-xs font-bold border rounded-full px-2 py-1 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"><span className="material-symbols-outlined !text-base">arrow_upward</span> Entrada</div>;
            case 'out':
                return <div className="inline-flex items-center gap-1 text-xs font-bold border rounded-full px-2 py-1 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"><span className="material-symbols-outlined !text-base">arrow_downward</span> Salida</div>;
            case 'transfer':
                return <div className="inline-flex items-center gap-1 text-xs font-bold border rounded-full px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"><span className="material-symbols-outlined !text-base">swap_horiz</span> Traslado</div>;
            case 'adjust':
                return <div className="inline-flex items-center gap-1 text-xs font-bold border rounded-full px-2 py-1 bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"><span className="material-symbols-outlined !text-base">tune</span> Ajuste</div>;
        }
    };
    
    const loading = movesLoading || productsLoading || usersLoading || locationsLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Kardex de Movimientos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Registro detallado de todas las operaciones de inventario.</p>
                </div>
                <button onClick={() => navigate('/inventory/movements/new')} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add_circle</span>
                    Nuevo Movimiento
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <div className="relative flex-grow max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">search</span>
                    <input type="text" placeholder="Buscar ref. o nota..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"/>
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <div className="col-span-2">Fecha</div>
                        <div className="col-span-2">Tipo</div>
                        <div className="col-span-3">Detalle</div>
                        <div className="col-span-3">Ubicación</div>
                        <div className="col-span-2 text-right">Usuario</div>
                    </div>
                    {/* Table Body */}
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredMoves.map((move) => {
                            const product = productsMap.get(move.productId);
                            const user = usersMap.get(move.userId);
                            return (
                                <div key={move.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="col-span-2">
                                        <p className="font-medium">{new Date(move.createdAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500">{new Date(move.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <div className="col-span-2">
                                        {getTypePill(move.type)}
                                        {move.reasonCode && <p className="text-xs text-slate-500 mt-1">{move.reasonCode}</p>}
                                    </div>
                                    <div className="col-span-3">
                                        <p className="font-bold text-indigo-600 dark:text-indigo-400">{product?.name || 'Producto Desconocido'}</p>
                                        <p className="font-bold mt-1">
                                            {move.qty > 0 ? '+' : ''}{move.qty.toLocaleString()} {move.unit}
                                        </p>
                                        {move.reference && <p className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 inline-block px-1 rounded mt-1">{move.reference}</p>}
                                    </div>
                                    <div className="col-span-3 text-xs">
                                        {move.fromLocationId && (
                                            <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                                                <span className="material-symbols-outlined !text-sm">logout</span> 
                                                {locationsMap.get(move.fromLocationId) || 'Origen'}
                                            </div>
                                        )}
                                        {move.toLocationId && (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-1">
                                                <span className="material-symbols-outlined !text-sm">login</span>
                                                {locationsMap.get(move.toLocationId) || 'Destino'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-right flex items-center justify-end gap-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{user?.name || 'N/A'}</span>
                                        {user?.avatarUrl && <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt=""/>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryMovementsPage;
