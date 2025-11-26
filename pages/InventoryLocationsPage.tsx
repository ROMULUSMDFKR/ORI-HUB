
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ProductLot } from '../../types';
import Spinner from '../components/ui/Spinner';
import Drawer from '../components/ui/Drawer';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';

interface LocationInfo {
    id: string;
    name: string;
    description?: string;
    skuCount: number;
    totalQuantity: number;
}

// Enhanced Card with App Icon Pattern
const LocationCard: React.FC<{ location: LocationInfo; onEdit: (loc: LocationInfo) => void }> = ({ location, onEdit }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative group">
        <button 
            onClick={() => onEdit(location)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-700 rounded-lg"
            title="Editar ubicación"
        >
            <span className="material-symbols-outlined text-base">edit</span>
        </button>
        
        <div className="flex items-start mb-6">
            <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 flex items-center justify-center mr-4">
                 <span className="material-symbols-outlined text-3xl">warehouse</span>
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{location.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-1 uppercase">{location.id}</p>
                {location.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{location.description}</p>
                )}
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">SKUs</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{location.skuCount}</p>
            </div>
            <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Unidades</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{location.totalQuantity.toLocaleString()}</p>
            </div>
        </div>
    </div>
);

const InventoryLocationsPage: React.FC = () => {
    const { data: initialLocations, loading: locLoading } = useCollection<any>('locations');
    const { data: lotsData, loading: lotsLoading } = useCollection<ProductLot>('lots');
    const [locations, setLocations] = useState<any[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [editingLocation, setEditingLocation] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    
    const { showToast } = useToast();

    useEffect(() => {
        if (initialLocations) {
            setLocations(initialLocations);
        }
    }, [initialLocations]);

    const locationData = useMemo<LocationInfo[]>(() => {
        if (!locations || !lotsData) return [];
        
        const allLots = lotsData || [];
        const filteredLocs = locations.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return filteredLocs.map((loc: any) => {
            const lotsInLocation = allLots.filter(lot => lot.stock?.some((s: any) => s.locationId === loc.id));
            
            const skuCount = new Set(
                lotsInLocation.map(lot => lot.productId)
            ).size;
            
            const totalQuantity = allLots.reduce((sum, lot) => {
                const stockInLoc = lot.stock?.find((s: any) => s.locationId === loc.id);
                return sum + (stockInLoc ? stockInLoc.qty : 0);
            }, 0);

            return { 
                id: loc.id, 
                name: loc.name, 
                description: loc.description,
                skuCount, 
                totalQuantity 
            };
        });
    }, [locations, lotsData, searchTerm]);
    
    const handleOpenCreate = () => {
        setEditingLocation(null);
        setFormData({ name: '', description: '' });
        setIsDrawerOpen(true);
    };

    const handleOpenEdit = (location: LocationInfo) => {
        setEditingLocation(location);
        setFormData({ 
            name: location.name, 
            description: location.description || '' 
        });
        setIsDrawerOpen(true);
    };

    const handleSaveLocation = async () => {
        if (!formData.name.trim()) {
            showToast('warning', 'El nombre de la ubicación no puede estar vacío.');
            return;
        }

        try {
            if (editingLocation) {
                // Update existing
                await api.updateDoc('locations', editingLocation.id, formData);
                setLocations(prev => prev ? prev.map(l => l.id === editingLocation.id ? { ...l, ...formData } : l) : []);
                showToast('success', 'Ubicación actualizada correctamente.');
            } else {
                // Create new
                const newLocation = await api.addDoc('locations', formData);
                setLocations(prev => [...(prev || []), newLocation]);
                showToast('success', 'Ubicación creada correctamente.');
            }
            setIsDrawerOpen(false);
        } catch (error) {
            console.error("Error saving location:", error);
            showToast('error', "No se pudo guardar la ubicación.");
        }
    };

    const loading = locLoading || lotsLoading;

    return (
        <>
            <div className="space-y-8 pb-12">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Ubicaciones</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Mapa de almacenes, pasillos y zonas de almacenamiento.</p>
                    </div>
                </div>

                {/* Toolbar with Search */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                     {/* Input Safe Pattern */}
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar ubicación (ej. Pasillo A)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <button onClick={handleOpenCreate} className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors gap-2">
                        <span className="material-symbols-outlined">add_location_alt</span>
                        Nueva Ubicación
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : locationData.length === 0 ? (
                     <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">No se encontraron ubicaciones.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locationData.map(loc => (
                            <LocationCard key={loc.id} location={loc} onEdit={handleOpenEdit} />
                        ))}
                    </div>
                )}
            </div>
            
            <Drawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                title={editingLocation ? 'Editar Ubicación' : 'Crear Nueva Ubicación'}
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Ubicación <span className="text-red-500">*</span></label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">signpost</span>
                            </div>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej: Almacén Principal - Rack A1"
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción / Notas</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ej: Productos frágiles, nivel superior..."
                            rows={3}
                            className="block w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                        />
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={() => setIsDrawerOpen(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                    <button onClick={handleSaveLocation} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
                        {editingLocation ? 'Guardar Cambios' : 'Crear Ubicación'}
                    </button>
                </div>
            </Drawer>
        </>
    );
};

export default InventoryLocationsPage;
