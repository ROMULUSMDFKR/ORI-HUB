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
    const { showToast } = useToast();

    React.useEffect(() => {
        if(initialBrands) {
            setBrands(initialBrands);
        }
    }, [initialBrands]);

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
                    {b.logoUrl ? (
                        <img src={b.logoUrl} alt={b.name} className="w-8 h-8 object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-500">storefront</span>
                        </div>
                    )}
                    <span className="font-semibold">{b.name}</span>
                </div>
            )
        },
        {
            header: 'Sitio Web',
            accessor: (b: Brand) => b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{b.website}</a> : '-'
        },
        {
            header: 'Acciones',
            accessor: (b: Brand) => (
                <button
                    onClick={() => setLinkingBrand(b)}
                    className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm text-sm hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
                >
                    <span className="material-symbols-outlined mr-2 !text-base">hub</span>
                    Analizar y Vincular
                </button>
            ),
            className: 'text-right'
        }
    ];

    const renderContent = () => {
        if (loading) return <Spinner />;
        if (error) return <p className="text-red-500">Error al cargar las marcas.</p>;
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
        return <Table columns={columns} data={brands} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Marcas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona franquicias y cadenas para agrupar candidatos.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
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
