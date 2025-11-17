import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, User } from '../types';
import { MOCK_LOCATIONS, MOCK_USERS } from '../data/mockData';
import Spinner from '../components/ui/Spinner';
import FilterButton from '../components/ui/FilterButton';

const InventoryMovementsPage: React.FC = () => {
    const { data: moves, loading: movesLoading } = useCollection<InventoryMove>('inventoryMoves');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');

    const [typeFilter, setTypeFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');

    const productsMap = React.useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
    const locationsMap = React.useMemo(() => new Map(MOCK_LOCATIONS.map(l => [l.id, l.name])), []);
    const usersMap = React.useMemo(() => new Map(Object.values(MOCK_USERS).map(u => [u.id, u])), []);

    const filteredMoves = useMemo(() => {
        if (!moves) return [];
        return moves.filter(move => {
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
    const locationOptions = useMemo(() => MOCK_LOCATIONS.map(l => ({ value: l.id, label: l.name })), []);


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

    const loading = movesLoading || productsLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
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
                            const isPositive = move.type === 'in' || (move.type === 'adjust' && move.qty > 0) || move.type === 'transfer';
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
                                    <div className="col-span-1">{user?.id || 'N/A'}</div>
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
