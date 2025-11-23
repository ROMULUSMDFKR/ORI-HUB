
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
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-indigo-500">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode, icon?: string }> = ({label, value, icon}) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 text-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
             {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
             <span className="font-medium">{label}</span>
        </div>
        <div className="font-semibold text-slate-800 dark:text-slate-200 text-right">{value}</div>
    </div>
);

const StockLevelBar: React.FC<{ current: number, min: number, max: number, unit: string }> = ({ current, min, max, unit }) => {
    // Avoid division by zero
    const effectiveMax = max > 0 ? max : (current * 1.5 || 100);
    const percentage = Math.min((current / effectiveMax) * 100, 100);
    const reorderPercentage = Math.min((min / effectiveMax) * 100, 100);
    
    let colorClass = 'bg-green-500';
    if (current <= min) colorClass = 'bg-red-500';
    else if (current <= min * 1.2) colorClass = 'bg-yellow-500';

    return (
        <div className="mt-2">
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-500 dark:text-slate-400">
                <span>0</span>
                <span>Reorden: {min} {unit}</span>
                <span>Máx: {max} {unit}</span>
            </div>
            <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                {/* Reorder Marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-black/30 dark:bg-white/30 z-10" style={{ left: `${reorderPercentage}%` }}></div>
            </div>
            <p className="text-center text-xs mt-1 font-bold text-slate-600 dark:text-slate-300">{percentage.toFixed(0)}% Lleno</p>
        </div>
    );
};

const LotCard: React.FC<{lot: ProductLot, unit: string, locationsMap: Map<string, string>}> = ({ lot, unit, locationsMap }) => {
    const remainingQty = useMemo(() => lot.stock.reduce((sum, s) => sum + s.qty, 0), [lot.stock]);
    const consumption = ((lot.initialQty - remainingQty) / lot.initialQty) * 100;

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-700/20 space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">{lot.code}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Entrada: {new Date(lot.receptionDate).toLocaleDateString()}</p>
                </div>
                <Badge text={lot.status} color={lot.status === 'Disponible' ? 'green' : 'yellow'} />
            </div>
            
            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                    <span>Costo: ${lot.unitCost.toFixed(2)}</span>
                    <span>Venta Mín: ${lot.pricing.min.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                    <span>Inicial: {lot.initialQty.toLocaleString()}</span>
                    <span className="text-indigo-600 dark:text-indigo-400">Actual: {remainingQty.toLocaleString()} {unit}</span>
                </div>
            </div>
            
            {lot.stock.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {lot.stock.map(s => (
                        <span key={s.locationId} className="text-[10px] bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {locationsMap.get(s.locationId) || s.locationId}: <b>{s.qty}</b>
                        </span>
                    ))}
                </div>
            )}
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

    // Handlers for notes
    const handleNoteAdded = async (note: Note) => { try { await api.addDoc('notes', note); showToast('success', 'Nota guardada.'); } catch { showToast('error', 'Error.'); } };
    const handleNoteUpdated = async (noteId: string, newText: string) => { try { await api.updateDoc('notes', noteId, { text: newText }); showToast('success', 'Nota actualizada.'); } catch { showToast('error', 'Error.'); } };
    const handleNoteDeleted = async (noteId: string) => { try { await api.deleteDoc('notes', noteId); showToast('success', 'Nota eliminada.'); } catch { showToast('error', 'Error.'); } };

    if (productLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (productError || !product) return <div className="text-center p-12">Producto no encontrado</div>;
    
    // Derived Metrics
    const margin = product.pricing.min - (product.costPrice || 0);
    const marginPercent = product.pricing.min > 0 ? (margin / product.pricing.min) * 100 : 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                     <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl">image</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{product.name}</h1>
                             {product.brand && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wide">{product.brand}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded border border-slate-200 dark:border-slate-600">{product.sku}</span>
                            <span>•</span>
                            <span>{categoryName}</span>
                            <span>•</span>
                            {product.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />}
                        </div>
                         {product.tags && product.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                                {product.tags.map(t => <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">#{t}</span>)}
                            </div>
                        )}
                    </div>
                </div>
                <Link to={`/products/${product.id}/edit`} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2 text-base">edit</span>
                    Editar
                </Link>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: General & Description */}
                <div className="space-y-6">
                    <InfoCard title="Información General" icon="info">
                        <InfoRow label="SKU" value={<span className="font-mono">{product.sku}</span>} icon="qr_code" />
                        <InfoRow label="Código de Barras" value={product.barcode || '-'} icon="barcode_reader" />
                        <InfoRow label="Categoría" value={categoryName} icon="category" />
                        <InfoRow label="Marca" value={product.brand || '-'} icon="branding_watermark" />
                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</p>
                             <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{product.description || 'Sin descripción disponible.'}</p>
                        </div>
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

                {/* Column 2: Logistics & Financials */}
                <div className="space-y-6">
                    <InfoCard title="Logística" icon="local_shipping">
                        <InfoRow label="Peso Unitario" value={product.weight ? `${product.weight} kg` : '-'} icon="scale" />
                        <InfoRow 
                            label="Dimensiones" 
                            value={product.dimensions?.length 
                                ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.height} ${product.dimensions.unit}` 
                                : '-'} 
                            icon="aspect_ratio" 
                        />
                         <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                             <span className="material-symbols-outlined text-blue-500 text-2xl">package_2</span>
                             <div>
                                 <p className="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase">Unidad de Manejo</p>
                                 <p className="font-semibold text-slate-800 dark:text-slate-200">{product.unitDefault}</p>
                             </div>
                         </div>
                    </InfoCard>

                    <InfoCard title="Datos Financieros" icon="monetization_on">
                         <div className="grid grid-cols-2 gap-4 mb-4">
                             <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                                 <p className="text-xs text-slate-500 uppercase font-bold">Costo Est.</p>
                                 <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${product.costPrice?.toFixed(2) || '0.00'}</p>
                             </div>
                             <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-100 dark:border-green-800">
                                 <p className="text-xs text-green-600 uppercase font-bold">Precio Mín.</p>
                                 <p className="text-lg font-bold text-green-700 dark:text-green-400">${product.pricing.min.toFixed(2)}</p>
                             </div>
                         </div>
                         <InfoRow label="Moneda Base" value={product.currency || 'MXN'} icon="currency_exchange" />
                         <InfoRow label="Margen Teórico" value={`${marginPercent.toFixed(1)}% ($${margin.toFixed(2)})`} icon="trending_up" />
                    </InfoCard>
                </div>

                {/* Column 3: Inventory & Lots */}
                <div className="space-y-6">
                    <InfoCard title="Estado de Inventario" icon="inventory">
                         <div className="text-center mb-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold">Stock Total Disponible</p>
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 my-1">{totalStock.toLocaleString()}</p>
                            <p className="text-sm text-slate-400">{product.unitDefault}</p>
                        </div>
                        
                        <StockLevelBar 
                            current={totalStock} 
                            min={product.reorderPoint || 0} 
                            max={product.maxStock || 0}
                            unit={product.unitDefault}
                        />

                        <div className="mt-6">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                                <span>Lotes Activos</span>
                                <span className="text-xs font-normal bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{lots.length}</span>
                            </h4>
                            {lotsLoading ? <Spinner /> : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                    {lots.length > 0 ? lots.map(lot => (
                                        <LotCard key={lot.id} lot={lot} unit={product.unitDefault} locationsMap={locationsMap} />
                                    )) : <p className="text-sm text-slate-400 italic text-center py-4">No hay lotes disponibles.</p>}
                                </div>
                            )}
                        </div>
                    </InfoCard>
                </div>

            </div>
        </div>
    );
};

export default ProductDetailPage;
