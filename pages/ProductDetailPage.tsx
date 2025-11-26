import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product, ProductLot, Category, Note } from '../types';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { api } from '../api/firebaseApi';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';
import { useToast } from '../hooks/useToast';

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string, icon?: string }> = ({ title, children, className, icon }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 text-slate-900 dark:text-white flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-right">{value}</dd>
    </div>
)

const LotCard: React.FC<{lot: ProductLot, unit: string, locationsMap: Map<string, string>}> = ({ lot, unit, locationsMap }) => {
    const remainingQty = useMemo(() => lot.stock.reduce((sum, s) => sum + s.qty, 0), [lot.stock]);
    const consumption = ((lot.initialQty - remainingQty) / lot.initialQty) * 100;

    return (
        <div className="bg-white dark:bg-slate-700/20 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        LOTE
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">{lot.code}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">RX: {new Date(lot.receptionDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <Badge text={lot.status} color={lot.status === 'Disponible' ? 'green' : 'yellow'} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Costo Unit.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">${lot.unitCost.toFixed(2)}</p>
                 </div>
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Precio Mín.</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">${lot.pricing.min.toFixed(2)}</p>
                 </div>
            </div>
            
            <div className="space-y-2">
                 <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Disponible</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{remainingQty.toLocaleString()} / {lot.initialQty.toLocaleString()} {unit}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${100 - consumption}%` }}></div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ubicaciones</p>
                <div className="flex flex-wrap gap-2">
                    {lot.stock.map(s => (
                        <span key={s.locationId} className="inline-flex items-center gap-1 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 px-2 py-1 rounded-md text-xs text-slate-600 dark:text-slate-300 shadow-sm">
                            <span className="material-symbols-outlined !text-[14px] text-slate-400">pin_drop</span>
                            {locationsMap.get(s.locationId) || s.locationId}: <strong>{s.qty.toLocaleString()}</strong>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: product, loading: productLoading, error: productError } = useDoc<Product>('products', id || '');
    const { data: categories } = useCollection<Category>('categories');
    const { data: locations } = useCollection<any>('locations');
    const { data: allNotes } = useCollection<Note>('notes');
    const [lots, setLots] = useState<ProductLot[]>([]);
    const [lotsLoading, setLotsLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchLots = async () => {
            if (id) {
                setLotsLoading(true);
                const fetchedLots = await api.getLotsForProduct(id);
                setLots(fetchedLots);
                setLotsLoading(false);
            }
        };
        fetchLots();
    }, [id]);

    const categoryName = useMemo(() => {
        return categories?.find(c => c.id === product?.categoryId)?.name || 'N/A';
    }, [categories, product]);
    
    const locationsMap = useMemo(() => {
        if (!locations) return new Map();
        return new Map(locations.map((loc: any) => [loc.id, loc.name]));
    }, [locations]);

    const totalStock = useMemo(() => {
        return lots.reduce((productSum, lot) => 
            productSum + lot.stock.reduce((lotSum, s) => lotSum + s.qty, 0), 
        0);
    }, [lots]);

    const productNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.productId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const handleNoteAdded = async (note: Note) => {
        try {
            await api.addDoc('notes', note);
            showToast('success', 'Nota guardada correctamente.');
            // Optimistic update handled by hook
        } catch (error) {
            console.error("Error adding note:", error);
            showToast('error', 'No se pudo guardar la nota.');
        }
    };

    const handleNoteUpdated = async (noteId: string, newText: string) => {
        try {
            await api.updateDoc('notes', noteId, { text: newText });
            showToast('success', 'Nota actualizada correctamente.');
        } catch (error) {
            console.error("Error updating note:", error);
            showToast('error', 'No se pudo actualizar la nota.');
        }
    };

    const handleNoteDeleted = async (noteId: string) => {
        try {
            await api.deleteDoc('notes', noteId);
            showToast('success', 'Nota eliminada correctamente.');
        } catch (error) {
            console.error("Error deleting note:", error);
            showToast('error', 'No se pudo eliminar la nota.');
        }
    };

    if (productLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (productError || !product) return <div className="text-center p-12">Producto no encontrado</div>;
    
    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div className="flex items-start gap-4">
                     {/* App Icon Pattern - Large for Product */}
                     <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                         <span className="material-symbols-outlined text-3xl">inventory_2</span>
                     </div>
                     <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{product.name}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{product.sku}</span>
                            {product.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />}
                        </div>
                    </div>
                </div>
                
                <div className="flex space-x-3">
                    <Link to={`/products/${product.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-xl flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors gap-2">
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        Editar Producto
                    </Link>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left: Inventory & Lots */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">warehouse</span>
                                Inventario y Lotes
                            </h3>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Stock Total</p>
                                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalStock.toLocaleString()} <span className="text-sm text-slate-500 font-normal">{product.unitDefault}</span></p>
                            </div>
                        </div>
                        
                         {lotsLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
                             lots.length > 0 ? (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {lots.map(lot => (
                                        <LotCard key={lot.id} lot={lot} unit={product.unitDefault} locationsMap={locationsMap} />
                                    ))}
                                 </div>
                             ) : (
                                 <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                                     <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                                     <p className="text-slate-500">No hay lotes registrados para este producto.</p>
                                 </div>
                             )
                         )}
                    </div>
                </div>

                {/* Right: Info & Notes */}
                <div className="lg:col-span-1 space-y-8">
                    <InfoCard title="Información General" icon="info">
                        <InfoRow label="SKU" value={<span className="font-mono font-semibold">{product.sku}</span>} />
                        <InfoRow label="Categoría" value={categoryName} />
                        <InfoRow label="Unidad Default" value={product.unitDefault} />
                        <InfoRow label="Moneda Base" value={product.currency} />
                        <InfoRow label="Precio Mín. Default" value={`$${product.pricing.min.toFixed(2)}`} />
                        <InfoRow label="Estado" value={product.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />} />
                    </InfoCard>
                    
                     <NotesSection 
                        entityId={product.id}
                        entityType="product"
                        notes={productNotes}
                        onNoteAdded={handleNoteAdded}
                        onNoteUpdated={handleNoteUpdated}
                        onNoteDeleted={handleNoteDeleted}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;