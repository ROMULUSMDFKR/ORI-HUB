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

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
)

const LotCard: React.FC<{lot: ProductLot, unit: string, locationsMap: Map<string, string>}> = ({ lot, unit, locationsMap }) => {
    const remainingQty = useMemo(() => lot.stock.reduce((sum, s) => sum + s.qty, 0), [lot.stock]);
    const consumption = ((lot.initialQty - remainingQty) / lot.initialQty) * 100;

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 font-mono">{lot.code}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recibido: {new Date(lot.receptionDate).toLocaleDateString()}</p>
                </div>
                <Badge text={lot.status} color={lot.status === 'Disponible' ? 'green' : 'yellow'} />
            </div>
            
            <div className="text-sm space-y-1">
                <p><strong>Costo:</strong> ${lot.unitCost.toFixed(2)} | <strong>Venta Mín:</strong> ${lot.pricing.min.toFixed(2)}</p>
                <p><strong>Inicial:</strong> {lot.initialQty.toLocaleString()} {unit} | <strong>Disp:</strong> <span className="font-bold">{remainingQty.toLocaleString()} {unit}</span></p>
            </div>
            
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Consumo</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{consumption.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${consumption}%` }}></div>
                </div>
            </div>

            <div>
                <h5 className="text-xs font-semibold mt-2">Distribución:</h5>
                <div className="flex flex-wrap gap-2 mt-1">
                    {lot.stock.map(s => (
                        <div key={s.locationId} className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">
                            {locationsMap.get(s.locationId) || s.locationId}: <span className="font-bold">{s.qty.toLocaleString()}</span> {unit}
                        </div>
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
            if (allNotes) {
                (allNotes as Note[]).unshift(note);
            }
        } catch (error) {
            console.error("Error adding note:", error);
            showToast('error', 'No se pudo guardar la nota.');
        }
    };

    const handleNoteUpdated = async (noteId: string, newText: string) => {
        try {
            await api.updateDoc('notes', noteId, { text: newText });
            showToast('success', 'Nota actualizada correctamente.');
            
            // Optimistic update
            if (allNotes) {
                const noteIndex = allNotes.findIndex(n => n.id === noteId);
                if (noteIndex > -1) {
                    allNotes[noteIndex].text = newText;
                }
            }
        } catch (error) {
            console.error("Error updating note:", error);
            showToast('error', 'No se pudo actualizar la nota.');
        }
    };

    const handleNoteDeleted = async (noteId: string) => {
        try {
            await api.deleteDoc('notes', noteId);
            showToast('success', 'Nota eliminada correctamente.');

            // Optimistic update
            if (allNotes) {
                const noteIndex = allNotes.findIndex(n => n.id === noteId);
                if (noteIndex > -1) {
                    allNotes.splice(noteIndex, 1);
                }
            }
        } catch (error) {
            console.error("Error deleting note:", error);
            showToast('error', 'No se pudo eliminar la nota.');
        }
    };

    if (productLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (productError || !product) return <div className="text-center p-12">Producto no encontrado</div>;
    
    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{product.name}</h2>
                    <div className="flex items-center space-x-2 mt-2">
                        <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{product.sku}</span>
                        <span className="text-gray-300">•</span>
                        {product.isActive ? <Badge text="Activo" color="green" /> : <Badge text="Inactivo" color="red" />}
                    </div>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                    <Link to={`/products/${product.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar Producto
                    </Link>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title="Inventario y Lotes">
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Stock Total Disponible</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalStock.toLocaleString()} <span className="text-xl font-normal">{product.unitDefault}</span></p>
                        </div>
                         {lotsLoading ? <Spinner /> : (
                             <div className="space-y-4">
                                {lots.map(lot => (
                                    <LotCard key={lot.id} lot={lot} unit={product.unitDefault} locationsMap={locationsMap} />
                                ))}
                             </div>
                         )}
                    </InfoCard>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Información General">
                        <InfoRow label="SKU" value={<span className="font-mono">{product.sku}</span>} />
                        <InfoRow label="Categoría" value={categoryName} />
                        <InfoRow label="Unidad Default" value={product.unitDefault} />
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