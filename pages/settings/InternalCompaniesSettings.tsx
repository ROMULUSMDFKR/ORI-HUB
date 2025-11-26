import React, { useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { InternalCompany } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';
import Badge from '../../components/ui/Badge';
import InternalCompanyDrawer from '../../components/settings/InternalCompanyDrawer';

const InternalCompaniesSettings: React.FC = () => {
    const { data: initialCompanies, loading, error } = useCollection<InternalCompany>('internalCompanies');
    const [companies, setCompanies] = useState<InternalCompany[] | null>(initialCompanies);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<InternalCompany | null>(null);

    React.useEffect(() => {
        if (initialCompanies) {
            setCompanies(initialCompanies);
        }
    }, [initialCompanies]);

    const handleSave = async (companyData: Omit<InternalCompany, 'id'>) => {
        try {
            if (editingCompany) {
                await api.updateDoc('internalCompanies', editingCompany.id, companyData);
                setCompanies(prev => prev!.map(c => c.id === editingCompany.id ? { ...c, ...companyData } : c));
            } else {
                const newCompany = await api.addDoc('internalCompanies', companyData);
                setCompanies(prev => [...(prev || []), newCompany]);
            }
            setIsDrawerOpen(false);
            setEditingCompany(null);
        } catch (error) {
            console.error("Error saving company:", error);
            alert("Hubo un error al guardar la empresa.");
        }
    };

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
        setEditingCompany(company);
        setIsDrawerOpen(true);
    };
    
    const handleCreate = () => {
        setEditingCompany(null);
        setIsDrawerOpen(true);
    };

    const columns = [
        { 
            header: 'Empresa', 
            accessor: (c: InternalCompany) => (
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden">
                        {c.logoUrl ? (
                            <img src={c.logoUrl} alt={c.name} className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{c.name.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{c.name}</p>
                        {c.website && (
                            <a 
                                href={c.website} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                {c.website.replace(/^https?:\/\//, '')}
                                <span className="material-symbols-outlined !text-[10px]">open_in_new</span>
                            </a>
                        )}
                    </div>
                </div>
            )
        },
        { 
            header: 'RFC', 
            accessor: (c: InternalCompany) => (
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">badge</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{c.rfc || 'N/A'}</span>
                </div>
            )
        },
        { 
            header: 'Estado', 
            accessor: (c: InternalCompany) => <Badge text={c.isActive ? 'Activa' : 'Inactiva'} color={c.isActive ? 'green' : 'gray'} />
        },
        {
            header: 'Acciones',
            accessor: (c: InternalCompany) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(c)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit_square</span>
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configura las entidades legales de tu grupo para la emisión de documentos.</p>
                </div>
                <button 
                    onClick={handleCreate} 
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-semibold"
                >
                    <span className="material-symbols-outlined">add_business</span>
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table columns={columns} data={companies} />
                </div>
            )}
            
            <InternalCompanyDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSave}
                company={editingCompany}
            />
        </div>
    );
};

export default InternalCompaniesSettings;