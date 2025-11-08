import React, { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { ProductLot } from '../types';
import Spinner from '../components/ui/Spinner';

interface LocationInfo {
    id: string;
    name: string;
    skuCount: number;
    totalQuantity: number;
}

const LocationCard: React.FC<{ location: LocationInfo }> = ({ location }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div className="flex items-center mb-4">
            <span className="material-symbols-outlined text-3xl text-primary mr-4">warehouse</span>
            <div>
                <h3 className="font-bold text-lg text-text-main">{location.name}</h3>
                <p className="text-sm text-text-secondary">{location.id}</p>
            </div>
        </div>
        <div className="flex justify-around text-center border-t pt-4">
            <div>
                <p className="text-2xl font-bold">{location.skuCount}</p>
                <p className="text-xs text-text-secondary">SKUs Distintos</p>
            </div>
            <div>
                <p className="text-2xl font-bold">{location.totalQuantity.toLocaleString()}</p>
                <p className="text-xs text-text-secondary">Unidades Totales</p>
            </div>
        </div>
    </div>
);

const InventoryLocationsPage: React.FC = () => {
    const { data: locations, loading: locLoading } = useCollection<any>('locations');
    const { data: lotsData, loading: lotsLoading } = useCollection<{[key: string]: ProductLot[]}>('lots');

    const locationData = useMemo<LocationInfo[]>(() => {
        if (!locations || !lotsData) return [];
        
        const lotsObject = (lotsData && lotsData.length > 0) ? lotsData[0] : {};
        const allLots = Object.values(lotsObject).flat();

        return locations.map((loc: any) => {
            const lotsInLocation = allLots.filter(lot => lot.stock.some(s => s.locationId === loc.id));
            
            const skuCount = new Set(
                lotsInLocation.map(lotInLoc => 
                    Object.keys(lotsObject).find(prodId => 
                        (lotsObject[prodId] || []).some(l => l.id === lotInLoc.id)
                    )
                )
            ).size;
            
            const totalQuantity = allLots.reduce((sum, lot) => {
                const stockInLoc = lot.stock.find(s => s.locationId === loc.id);
                return sum + (stockInLoc ? stockInLoc.qty : 0);
            }, 0);

            return { id: loc.id, name: loc.name, skuCount, totalQuantity };
        });
    }, [locations, lotsData]);

    const loading = locLoading || lotsLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main">Ubicaciones de Almacén</h2>
                    <p className="text-sm text-text-secondary mt-1">Gestiona tus bodegas y centros de distribución.</p>
                </div>
                <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Ubicación
                </button>
            </div>
            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locationData.map(loc => <LocationCard key={loc.id} location={loc} />)}
                </div>
            )}
        </div>
    );
};

export default InventoryLocationsPage;