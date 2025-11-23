
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ProductLot, Location } from '../../types';
import Spinner from '../components/ui/Spinner';
import { api } from '../api/firebaseApi';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/ui/CustomSelect';
import { useNavigate } from 'react-router-dom';

const LocationCard: React.FC<{ location: Location; onEdit: (id: string) => void; totalQuantity: number }> = ({ location, onEdit, totalQuantity }) => {
    const usagePercent = location.capacity && location.capacity > 0 ? Math.min((totalQuantity / location.capacity) * 100, 100) : 0;
    
    const typeIcons: Record<string, string> = {
        'Estantería': 'shelves',
        'Piso': 'grid_on',
        'Refrigerado': 'ac_unit',
        'Muelle': 'local_shipping',
        'Cuarentena': 'warning',
    };

    const icon = typeIcons[location.type || 'Estantería'] || 'warehouse';

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative group h-full flex flex-col">
            <button 
                onClick={() => onEdit(location.id)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar ubicación"
            >
                <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{location.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{location.type || 'General'}</p>
                </div>
            </div>
            
            <div className="flex-1">
                 {location.zone && <p className="text-xs font-semibold text-indigo-600 mb-1">{location.zone}</p>}
                 {location.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{location.description}</p>
                )}
                {location.dimensions && location.dimensions.width > 0 && (
                    <p className="text-xs text-slate-400 mb-2">
                        {location.dimensions.width}x{location.dimensions.height}x{location.dimensions.depth} {location.dimensions.unit}
                    </p>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    <span>Ocupación</span>
                    <span>{totalQuantity.toLocaleString()} / {location.capacity ? location.capacity.toLocaleString() : '∞'}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${location.capacity ? usagePercent : 0}%` }} 
                    ></div>
                </div>
            </div>
        </div>
    );
};

const InventoryLocationsPage: React.FC = () => {
    const { data: locations, loading: locLoading } = useCollection<Location>('locations');
    const { data: lotsData, loading: lotsLoading } = useCollection<ProductLot>('lots');
    const navigate = useNavigate();

    const locationStats = useMemo(() => {
        if (!locations || !lotsData) return new Map<string, number>();
        
        const stats = new Map<string, number>();
        locations.forEach(loc => stats.set(loc.id, 0));

        lotsData.forEach(lot => {
            lot.stock.forEach(s => {
                const current = stats.get(s.locationId) || 0;
                stats.set(s.locationId, current + s.qty);
            });
        });
        return stats;
    }, [locations, lotsData]);
    
    const handleCreate = () => navigate('/inventory/locations/new');
    const handleEdit = (id: string) => navigate(`/inventory/locations/${id}/edit`);

    const loading = locLoading || lotsLoading;

    return (
        <div className="space-y-6">
                <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Mapa de Almacén</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona las zonas de almacenamiento y su capacidad.</p>
                </div>
                <button onClick={handleCreate} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Ubicación
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {locations?.map(loc => (
                        <LocationCard 
                            key={loc.id} 
                            location={loc} 
                            onEdit={handleEdit} 
                            totalQuantity={locationStats.get(loc.id) || 0}
                        />
                    ))}
                    {!locations?.length && (
                            <div className="col-span-full text-center py-12 text-slate-500">No hay ubicaciones definidas.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryLocationsPage;
