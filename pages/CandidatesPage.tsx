import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Candidate, CandidateStatus, CandidateTag } from '../types';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import FilterButton from '../components/ui/FilterButton';

const categoryTranslations: Record<string, string> = {
    "Wholesaler": "Mayorista",
    "Tire shop": "Llantera",
    "Auto repair shop": "Taller mecánico"
};

const extractState = (address?: string): string | null => {
    if (!address) return null;
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 2) {
        // Typically the second to last part is the state abbreviation, e.g., 'Qro.'
        const statePart = parts[parts.length - 2];
        // Handle cases like '76020 Santiago de Querétaro'
        if (statePart.match(/^\d{5}\s/)) {
            return parts[parts.length-1];
        }
        return statePart;
    }
    return null;
}

const extractCity = (address?: string): string | null => {
    if (!address) return null;
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 2) {
        // The city is often the third to last part, sometimes with a zip code.
        const cityWithZip = parts[parts.length - 3];
        // Remove zip code if present
        return cityWithZip.replace(/^\d{5}\s/, '');
    }
    return null;
}


const CandidatesPage: React.FC = () => {
    const { data: candidates, loading, error } = useCollection<Candidate>('candidates');
    const navigate = useNavigate();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');

    const filteredData = useMemo(() => {
        if (!candidates) return [];
        return candidates.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            const tagMatch = tagFilter === 'all' || c.tags.includes(tagFilter as CandidateTag);
            const companyMatch = companyFilter === 'all' || c.assignedCompanyId === companyFilter;
            const categoryMatch = categoryFilter === 'all' || c.rawCategories?.includes(categoryFilter);
            const locationMatch = locationFilter === 'all' || extractState(c.address) === locationFilter;
            return statusMatch && tagMatch && companyMatch && categoryMatch && locationMatch;
        });
    }, [candidates, statusFilter, tagFilter, companyFilter, categoryFilter, locationFilter]);
    
    const getStatusColor = (status: CandidateStatus) => {
        switch (status) {
            case CandidateStatus.Aprobado: return 'green';
            case CandidateStatus.Pendiente: return 'yellow';
            case CandidateStatus.Rechazado: return 'gray';
            case CandidateStatus.ListaNegra: return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        { 
            header: 'Nombre', 
            accessor: (c: Candidate) => (
                <Link to={`/prospecting/candidates/${c.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {c.name}
                </Link>
            )
        },
        { 
            header: 'Categorías (Fuente)', 
            accessor: (c: Candidate) => (
                <div className="flex flex-wrap gap-1">
                    {c.rawCategories?.slice(0, 2).map(cat => <Badge key={cat} text={categoryTranslations[cat] || cat} />)}
                </div>
            )
        },
        { 
            header: 'Ciudad', 
            accessor: (c: Candidate) => {
                const city = extractCity(c.address);
                return <span className="text-sm text-slate-500 dark:text-slate-400">{city || '-'}</span>;
            }
        },
        { 
            header: 'Estado', 
            accessor: (c: Candidate) => {
                const state = extractState(c.address);
                return <span className="text-sm text-slate-500 dark:text-slate-400">{state || '-'}</span>;
            }
        },
        {
            header: 'Perfilado Para',
            accessor: (c: Candidate) => c.assignedCompanyId ? <Badge text={c.assignedCompanyId} color="blue" /> : <span className="text-sm text-slate-500 dark:text-slate-400">-</span>
        },
        { header: 'Estado', accessor: (c: Candidate) => <Badge text={c.status} color={getStatusColor(c.status)} /> },
        { 
            header: 'Fecha Creación', 
            accessor: (c: Candidate) => <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(c.importedAt).toLocaleDateString('es-ES')}</span> 
        },
        { header: 'Etiquetas', accessor: (c: Candidate) => <div className="flex flex-wrap gap-1">{c.tags.map(t => <Badge key={t} text={t} color="blue" />)}</div> }
    ];

    const statusOptions = Object.values(CandidateStatus).map(s => ({ value: s, label: s }));
    const tagOptions: {value: CandidateTag, label: CandidateTag}[] = (['Alto Potencial', 'Potencial Distribuidor', 'Consumidor Directo', 'Para seguimiento', 'No Relevante', 'Lista Negra'] as const).map(t => ({ value: t, label: t }));
    const companyOptions = [{value: 'Puredef', label: 'Puredef'}, {value: 'Trade Aitirik', label: 'Trade Aitirik'}, {value: 'Santzer', label: 'Santzer'}];
    const categoryOptions = useMemo(() => {
        if (!candidates) return [];
        const allCategories = candidates.flatMap(c => c.rawCategories || []);
        const uniqueCategories = [...new Set(allCategories)];
        return uniqueCategories.map(cat => ({
            value: cat,
            label: categoryTranslations[cat] || cat
        }));
    }, [candidates]);
    const locationOptions = useMemo(() => {
        if (!candidates) return [];
        const uniqueStates = [...new Set(candidates.map(c => extractState(c.address)).filter(Boolean) as string[])];
        return uniqueStates.sort().map(state => ({
            value: state,
            label: state
        }));
    }, [candidates]);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Candidatos de Prospección</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona, califica y convierte datos crudos en prospectos de valor.</p>
                </div>
                <Link to="/prospecting/upload" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">upload</span>
                    Importar Candidatos
                </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-slate-200 dark:border-slate-700">
                <FilterButton label="Estado" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                <FilterButton label="Etiqueta" options={tagOptions} selectedValue={tagFilter} onSelect={setTagFilter} />
                <FilterButton label="Compañía" options={companyOptions} selectedValue={companyFilter} onSelect={setCompanyFilter} allLabel="Cualquiera" />
                <FilterButton label="Categoría" options={categoryOptions} selectedValue={categoryFilter} onSelect={setCategoryFilter} />
                <FilterButton label="Ubicación" options={locationOptions} selectedValue={locationFilter} onSelect={setLocationFilter} />
            </div>
            
            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : error ? (
                <p className="text-center text-red-500 py-12">Error al cargar los candidatos.</p>
            ) : !filteredData || filteredData.length === 0 ? (
                <EmptyState
                    icon="group_add"
                    title="No hay candidatos"
                    message="Importa una nueva lista de candidatos para empezar a calificar."
                    actionText="Importar Datos"
                    onAction={() => navigate('/prospecting/upload')}
                />
            ) : (
                <Table columns={columns} data={filteredData} />
            )}
        </div>
    );
};

export default CandidatesPage;