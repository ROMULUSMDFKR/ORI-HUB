import React, { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { ImportSource, User } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../api/firebaseApi';
import { useAuth } from '../../hooks/useAuth';
import NewSourceDrawer from '../../components/prospecting/NewSourceDrawer';
import Badge from '../../components/ui/Badge';

const ImportSourcesPage: React.FC = () => {
    const { data: sources, loading: sourcesLoading } = useCollection<ImportSource>('importSources');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { user: currentUser } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    // FIX: Se actualizó el tipo del parámetro para reflejar correctamente los datos que se reciben.
    const handleSaveNewSource = async (newSourceData: Omit<ImportSource, 'id' | 'createdById'>) => {
        if (!currentUser) return;
        try {
            await api.addDoc('importSources', { ...newSourceData, createdById: currentUser.id });
            setIsDrawerOpen(false);
            // Data will refresh automatically due to useCollection hook
        } catch (error) {
            console.error("Error creating new source:", error);
            alert("No se pudo crear la nueva fuente.");
        }
    };

    const columns = [
        { 
            header: 'Nombre de la Búsqueda', 
            accessor: (s: ImportSource) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
        },
        { 
            header: 'Descripción (Criterios)', 
            accessor: (s: ImportSource) => <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-md" title={s.description}>{s.description}</p>
        },
        { 
            header: 'Etiquetas', 
            accessor: (s: ImportSource) => <div className="flex flex-wrap gap-1">{s.tags.map(t => <Badge key={t} text={t} />)}</div>
        },
        { 
            header: 'Creado por', 
            accessor: (s: ImportSource) => usersMap.get(s.createdById) || 'N/A'
        },
        { 
            header: 'Fecha', 
            accessor: (s: ImportSource) => new Date(s.createdAt).toLocaleDateString()
        },
    ];

    const loading = sourcesLoading || usersLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Fuentes de Importación</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona los criterios de búsqueda que usas para encontrar candidatos.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nueva Fuente
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : !sources || sources.length === 0 ? (
                <EmptyState
                    icon="data_source"
                    title="No hay fuentes de importación"
                    message="Crea tu primera fuente para registrar los parámetros de búsqueda de tus candidatos."
                    actionText="Crear Fuente"
                    onAction={() => setIsDrawerOpen(true)}
                />
            ) : (
                <Table columns={columns} data={sources} />
            )}
            
            <NewSourceDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveNewSource}
            />
        </div>
    );
};

export default ImportSourcesPage;