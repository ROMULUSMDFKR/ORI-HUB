import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { InventoryMove, Product, ProductLot } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';

const InventoryMovementsPage: React.FC = () => {
    const { data: moves, loading: movesLoading } = useCollection<InventoryMove>('inventoryMoves');
    const { data: products, loading: productsLoading } = useCollection<Product>('products');
    const { data: lots, loading: lotsLoading } = useCollection<{[key: string]: ProductLot[]}>('lots');
    const { data: locations, loading: locationsLoading } = useCollection<any>('locations');

    const [typeFilter, setTypeFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
    const locationsMap = useMemo(() => new Map(locations?.map(l => [l.id, l.name])), [locations]);

    const filteredMoves = useMemo(() => {
        if (!moves) return [];
        return moves.filter(move => {
            if (typeFilter !== 'all' && move.type !== typeFilter) return false;
            if (productFilter !== 'all' && move.productId !== productFilter) return false;
            const inLocation = (locationFilter !== 'all' && (move.fromLocationId === locationFilter || move.toLocationId === locationFilter));
            if (locationFilter !== 'all' && !inLocation) return false;
            const moveDate = new Date(move.createdAt);
            if (dateFrom && moveDate < new Date(dateFrom)) return false;
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (moveDate > toDate) return false;
            }
            return true;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [moves, typeFilter, productFilter, locationFilter, dateFrom, dateTo]);

    const getTypeBadge = (type: InventoryMove['type']) => {
        switch (type) {
            case 'in': return <Badge text="Entrada" color="green" />;
            case 'out': return <Badge text="Salida" color="red" />;
            case 'transfer': return <Badge text="Transferencia" color="blue" />;
            case 'adjust': return <Badge text="Ajuste" color="yellow" />;
        }
    };

    const columns = [
        { header: 'Fecha', accessor: (m: InventoryMove) => new Date(m.createdAt).toLocaleString('es-MX') },
        { header: 'Tipo', accessor: (m: InventoryMove) => getTypeBadge(m.type) },
        { 
            header: 'Producto', 
            accessor: (m: InventoryMove) => (
                <Link to={`/products/${m.productId}`} className="text-primary hover:underline">
                    {productsMap.get(m.productId)?.name || m.productId}
                </Link>
            )
        },
        { header: 'Cantidad', accessor: (m: InventoryMove) => `${m.qty.toLocaleString()} ${m.unit}` },
        { header: 'Desde', accessor: (m: InventoryMove) => locationsMap.get(m.fromLocationId || '') || '-' },
        { header: 'Hacia', accessor: (m: InventoryMove) => locationsMap.get(m.toLocationId || '') || '-' },
        { header: 'Nota', accessor: (m: InventoryMove) => m.note || '-' },
    ];

    const loading = movesLoading || productsLoading || lotsLoading || locationsLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Movimientos de Inventario</h2>
                    <p className="text-sm text-text-secondary mt-1">Historial de todas las transacciones de stock.</p>
                </div>
                <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Movimiento
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white text-sm border-gray-300 rounded-md">
                    <option value="all">Todos los Tipos</option>
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                    <option value="transfer">Transferencia</option>
                    <option value="adjust">Ajuste</option>
                </select>
                <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-white text-sm border-gray-300 rounded-md">
                    <option value="all">Todos los Productos</option>
                    {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                 <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="bg-white text-sm border-gray-300 rounded-md">
                    <option value="all">Todas las Ubicaciones</option>
                    {locations?.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white text-sm border-gray-300 rounded-md" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white text-sm border-gray-300 rounded-md" />
            </div>

            {loading ? <div className="flex justify-center py-12"><Spinner /></div> : <Table columns={columns} data={filteredMoves} />}
        </div>
    );
};

export default InventoryMovementsPage;