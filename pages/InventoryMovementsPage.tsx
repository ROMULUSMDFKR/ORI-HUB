import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, User } from '../types';
import { MOCK_LOCATIONS, MOCK_USERS } from '../data/mockData';
import Spinner from '../components/ui/Spinner';

const InventoryMovementsPage: React.FC = () => {
    const { data: moves, loading: movesLoading } = useCollection<InventoryMove>('inventoryMoves');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');

    const productsMap = React.useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
    const locationsMap = React.useMemo(() => new Map(MOCK_LOCATIONS.map(l => [l.id, l.name])), []);
    const usersMap = React.useMemo(() => new Map(Object.values(MOCK_USERS).map(u => [u.id, u])), []);

    const getTypePill = (type: InventoryMove['type']) => {
        switch (type) {
            case 'in':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-green-50 border-green-200 text-green-700"><span className="material-symbols-outlined !text-sm">arrow_upward</span> Entrada</div>;
            case 'out':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-red-50 border-red-200 text-red-700"><span className="material-symbols-outlined !text-sm">arrow_downward</span> Salida</div>;
            case 'transfer':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-blue-50 border-blue-200 text-blue-700"><span className="material-symbols-outlined !text-sm">arrow_forward</span> Traslado</div>;
            case 'adjust':
                return <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-full px-3 py-1 bg-gray-100 border-gray-200 text-gray-700"><span className="material-symbols-outlined !text-sm">settings</span> Ajuste</div>;
        }
    };

    const loading = movesLoading || productsLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-on-surface">Historial de Movimientos</h2>
                    <p className="text-sm text-on-surface-secondary mt-1">Audita todas las transacciones de inventario.</p>
                </div>
                <button className="bg-accent text-on-dark font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add_circle</span>
                    Nuevo Movimiento
                </button>
            </div>

            <div className="bg-surface p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4 border border-border">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-secondary">calendar_today</span>
                    <input type="text" placeholder="dd/mm/aaaa" className="w-full sm:w-40 bg-surface pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"/>
                </div>
                 <button className="flex items-center gap-2 bg-surface border border-border text-on-surface text-sm font-medium py-2 px-3 rounded-lg hover:bg-background">
                    <span className="material-symbols-outlined text-base">filter_list</span>
                    Tipo
                </button>
                <button className="flex items-center gap-2 bg-surface border border-border text-on-surface text-sm font-medium py-2 px-3 rounded-lg hover:bg-background">
                    <span className="material-symbols-outlined text-base">filter_list</span>
                    Producto
                </button>
                <button className="flex items-center gap-2 bg-surface border border-border text-on-surface text-sm font-medium py-2 px-3 rounded-lg hover:bg-background">
                    <span className="material-symbols-outlined text-base">filter_list</span>
                    Ubicación
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="bg-surface rounded-xl shadow-sm border border-border">
                    {/* Table Header */}
                    <div className="grid grid-cols-8 gap-4 px-6 py-3 text-xs font-semibold text-on-surface-secondary uppercase tracking-wider border-b border-border">
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
                    <div className="divide-y divide-border">
                        {(moves || []).map((move) => {
                            const product = productsMap.get(move.productId);
                            const user = usersMap.get(move.userId);
                            const isPositive = move.type === 'in' || (move.type === 'adjust' && move.qty > 0) || move.type === 'transfer';
                            return (
                                <div key={move.id} className="grid grid-cols-8 gap-4 px-6 py-4 items-center text-sm text-on-surface">
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
