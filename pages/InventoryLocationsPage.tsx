
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

const LocationCard: React.FC<{ location: LocationInfo; onEdit: (loc: LocationInfo) => void }> = ({ location, onEdit }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative group">
        <button 
            onClick={() => onEdit(location)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar ubicación"
        >
            <span className="material-symbols-outlined text-base">edit</span>
        </button>
        <div className="flex items-start mb-4">
            <span className="material-symbols-outlined text-3xl text-indigo-600 dark:text-indigo-400 mr-4 mt-1">warehouse</span>
            <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{location.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-1">{location.id}</p>
                {location.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{location.description}</p>
                )}
            </div>
        </div>
        <div className="flex justify-around text-center border-t border-slate-200 dark:border-slate-700 pt-4">
            <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{location.skuCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">SKUs Distintos</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{location.totalQuantity.toLocaleString()}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unidades Totales</p>
            </div>
        </div>
    </div>
);

const InventoryLocationsPage: React.FC = () => {
    const { data: initialLocations, loading: locLoading } = useCollection<any>('locations');
    const { data: lotsData, loading: lotsLoading } = useCollection<ProductLot>('lots');
    const [locations, setLocations] = useState<any[] | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
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

        return locations.map((loc: any) => {
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
    }, [locations, lotsData]);
    
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
            <div className="space-y-6">
                <div className="flex justify-end items-center">
                    <button onClick={handleOpenCreate} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                        <span className="material-symbols-outlined mr-2">add</span>
                        Nueva Ubicación
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
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
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Ubicación <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Almacén Principal - Rack A1"
                            className="mt-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción / Notas</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ej: Productos frágiles, nivel superior..."
                            rows={3}
                            className="mt-1 w-full"
                        />
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={() => setIsDrawerOpen(false)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm">Cancelar</button>
                    <button onClick={handleSaveLocation} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">
                        {editingLocation ? 'Guardar Cambios' : 'Crear Ubicación'}
                    </button>
                </div>
            </Drawer>
        </>
    );
};

export default InventoryLocationsPage;
