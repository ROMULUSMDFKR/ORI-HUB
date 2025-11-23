
import React, { useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { InternalCompany } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';
import Badge from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

const InternalCompaniesSettings: React.FC = () => {
    const { data: initialCompanies, loading, error } = useCollection<InternalCompany>('internalCompanies');
    const [companies, setCompanies] = useState<InternalCompany[] | null>(initialCompanies);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (initialCompanies) {
            setCompanies(initialCompanies);
        }
    }, [initialCompanies]);


    const handleDelete = async (company: InternalCompany) => {
        if (window.confirm(`¿Estás seguro de eliminar "${company.name}"? Esta acción no se puede deshacer.`)) {
            try {
                await api.deleteDoc('internalCompanies', company.id);
                setCompanies(prev => prev!.filter(c => c.id !== company.id));
            } catch (error) {
                console.error("Error deleting company:", error);
                alert("No se pudo eliminar la empresa.");
            }
        }
    };

    const handleEdit = (company: InternalCompany) => {
        navigate(`/settings/internal-companies/${company.id}/edit`);
    };
    
    const handleCreate = () => {
        navigate(`/settings/internal-companies/new`);
    };

    const columns = [
        { 
            header: 'Nombre / Razón Social', 
            accessor: (c: InternalCompany) => (
                <div className="flex items-center gap-3">
                    {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-8 h-8 object-contain rounded" /> : <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold">{c.name.substring(0, 2).toUpperCase()}</div>}
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                        {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">{c.website}</a>}
                    </div>
                </div>
            )
        },
        { header: 'RFC', accessor: (c: InternalCompany) => c.rfc || '-' },
        { 
            header: 'Estado', 
            accessor: (c: InternalCompany) => <Badge text={c.isActive ? 'Activa' : 'Inactiva'} color={c.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (c: InternalCompany) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(c)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Mis Empresas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura las entidades de tu grupo (ej. Santzer, Puredef) que emitirán cotizaciones.</p>
                </div>
                <button onClick={handleCreate} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Empresa
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : !companies || companies.length === 0 ? (
                <EmptyState
                    icon="domain"
                    title="No hay empresas registradas"
                    message="Registra las empresas de tu grupo para poder generar cotizaciones a su nombre."
                    actionText="Crear Empresa"
                    onAction={handleCreate}
                />
            ) : (
                <Table columns={columns} data={companies} />
            )}
        </div>
    );
};

export default InternalCompaniesSettings;
