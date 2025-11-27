
import React, { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { Brand, Candidate } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';
import NewBrandDrawer from '../../components/prospecting/NewBrandDrawer';
import LinkCandidatesDrawer from '../../components/prospecting/LinkCandidatesDrawer';
import { useToast } from '../../hooks/useToast';

const BrandsPage: React.FC = () => {
    const { data: initialBrands, loading, error } = useCollection<Brand>('brands');
    const [brands, setBrands] = useState<Brand[] | null>(initialBrands);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [linkingBrand, setLinkingBrand] = useState<Brand | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    React.useEffect(() => {
        if(initialBrands) {
            setBrands(initialBrands);
        }
    }, [initialBrands]);
    
    const filteredBrands = useMemo(() => {
        if(!brands) return [];
        return brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [brands, searchTerm]);

    const handleSaveBrand = async (newBrandData: Omit<Brand, 'id'>) => {
        try {
            const newBrand = await api.addDoc('brands', newBrandData);
            setBrands(prev => [...(prev || []), newBrand]);
            setIsDrawerOpen(false);
            showToast('success', `Marca "${newBrand.name}" creada con éxito.`);
        } catch (error) {
            console.error("Error creating brand:", error);
            showToast('error', "No se pudo crear la marca.");
        }
    };
    
    const handleCandidatesLinked = async (brandId: string, candidateIds: string[]) => {
        try {
            for (const candidateId of candidateIds) {
                await api.updateDoc('candidates', candidateId, { brandId: brandId });
            }
            showToast('success', `${candidateIds.length} candidatos han sido vinculados a ${linkingBrand?.name}.`);
        } catch (error) {
            console.error("Error linking candidates:", error);
            showToast('error', 'Ocurrió un error al vincular los candidatos.');
        } finally {
            setLinkingBrand(null);
        }
    };


    const columns = [
        {
            header: 'Marca',
            accessor: (b: Brand) => (
                <div className="flex items-center gap-3">
                     {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden">
                        {b.logoUrl ? (
                            <img src={b.logoUrl} alt={b.name} className="h-full w-full object-contain" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400 text-xl">storefront</span>
                        )}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{b.name}</span>
                </div>
            )
        },
        {
            header: 'Sitio Web',
            accessor: (b: Brand) => b.website ? (
                <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-sm">
                    {b.website.replace(/^https?:\/\//, '')}
                    <span className="material-symbols-outlined !text-xs">open_in_new</span>
                </a>
            ) : <span className="text-slate-400 text-sm">-</span>
        },
        {
            header: 'Acciones',
            accessor: (b: Brand) => (
                <button
                    onClick={() => setLinkingBrand(b)}
                    className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-semibold py-1.5 px-3 rounded-lg flex items-center shadow-sm text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 transition-colors"
                >
                    <span className="material-symbols-outlined mr-1 !text-sm">hub</span>
                    Vincular
                </button>
            ),
            className: 'text-right'
        }
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
        if (error) return <p className="text-center text-red-500 py-12">Error al cargar las marcas.</p>;
        if (!brands || brands.length === 0) {
            return (
                <EmptyState
                    icon="storefront"
                    title="No hay marcas creadas"
                    message="Crea marcas para agrupar candidatos que pertenecen a una misma franquicia o cadena."
                    actionText="Crear Marca"
                    onAction={() => setIsDrawerOpen(true)}
                />
            );
        }
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table columns={columns} data={filteredBrands} />
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Marcas y Cadenas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona agrupaciones de candidatos (franquicias, grupos).</p>
                </div>
                
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                 {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm outline-none transition-shadow focus:shadow-md"
                    />
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors gap-2">
                    <span className="material-symbols-outlined">add_business</span>
                    Nueva Marca
                </button>
            </div>

            {renderContent()}

            <NewBrandDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveBrand}
            />
            {linkingBrand && (
                <LinkCandidatesDrawer
                    isOpen={!!linkingBrand}
                    onClose={() => setLinkingBrand(null)}
                    brand={linkingBrand}
                    onLinkCandidates={handleCandidatesLinked}
                />
            )}
        </div>
    );
};

export default BrandsPage;
