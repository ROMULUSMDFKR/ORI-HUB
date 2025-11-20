
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { ImportHistory, User, Candidate } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { api } from '../../api/firebaseApi';
import EditHistoryDrawer from '../../components/prospecting/EditHistoryDrawer';
import { useToast } from '../../hooks/useToast';

const ImportHistoryPage: React.FC = () => {
    const { data: initialHistory, loading: historyLoading } = useCollection<ImportHistory>('importHistory');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [history, setHistory] = useState<ImportHistory[] | null>(null);
    const { showToast } = useToast();

    const [editingHistory, setEditingHistory] = useState<ImportHistory | null>(null);
    const [deletingHistory, setDeletingHistory] = useState<ImportHistory | null>(null);

    useEffect(() => {
        if(initialHistory) {
            setHistory(initialHistory);
        }
    }, [initialHistory]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const sortedHistory = useMemo(() => {
        if (!history) return [];
        return [...history].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
    }, [history]);

    const handleEdit = (record: ImportHistory) => {
        setEditingHistory(record);
    };
    
    const handleUpdateHistory = async (updatedCriteria: ImportHistory['searchCriteria']) => {
        if (!editingHistory) return;
        try {
            await api.updateDoc('importHistory', editingHistory.id, { searchCriteria: updatedCriteria });
            setHistory(prev => prev!.map(h => h.id === editingHistory.id ? { ...h, searchCriteria: updatedCriteria } : h));
            setEditingHistory(null);
            showToast('success', 'Registro de historial actualizado.');
        } catch (error) {
            console.error('Error updating history:', error);
            showToast('error', 'No se pudo actualizar el registro.');
        }
    };

    const handleDelete = (record: ImportHistory) => {
        setDeletingHistory(record);
    };

    const handleConfirmDelete = async () => {
        if (!deletingHistory) return;

        try {
            const allCandidates = await api.getCollection('candidates') as Candidate[];
            const candidatesToDelete = allCandidates.filter(c => c.importHistoryId === deletingHistory.id);

            for (const candidate of candidatesToDelete) {
                await api.deleteDoc('candidates', candidate.id);
            }
            
            await api.deleteDoc('importHistory', deletingHistory.id);
            
            setHistory(prev => prev!.filter(h => h.id !== deletingHistory.id));
            showToast('success', `Se eliminó el lote y ${candidatesToDelete.length} candidatos asociados.`);

        } catch (error) {
            console.error("Error deleting import batch:", error);
            showToast('error', "Ocurrió un error al eliminar el lote de importación.");
        } finally {
            setDeletingHistory(null);
        }
    };

    const columns = [
        { 
            header: 'Fecha de Importación', 
            accessor: (h: ImportHistory) => <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(h.importedAt).toLocaleString()}</span>
        },
        { 
            header: 'Criterios de Búsqueda', 
            accessor: (h: ImportHistory) => (
                <div className="text-xs">
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-xs" title={h.searchCriteria.searchTerms.join(', ')}>
                        {h.searchCriteria.searchTerms.join(', ')}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                        {h.searchCriteria.location} &bull; {h.searchCriteria.profiledCompany}
                    </p>
                </div>
            )
        },
        { 
            header: 'Nuevos', 
            accessor: (h: ImportHistory) => <span className="text-green-600 font-bold">{h.newCandidates}</span>,
            className: 'text-center'
        },
        { 
            header: 'Omitidos', 
            accessor: (h: ImportHistory) => <span className="text-slate-500 dark:text-slate-400">{h.duplicatesSkipped}</span>,
            className: 'text-center'
        },
        { 
            header: 'Importado por', 
            accessor: (h: ImportHistory) => usersMap.get(h.importedById) || h.importedById
        },
        { 
            header: 'Estado', 
            accessor: (h: ImportHistory) => <Badge text={h.status} color={h.status === 'Completed' ? 'green' : (h.status === 'In Progress' ? 'yellow' : (h.status === 'Cancelled' ? 'gray' : 'red'))} />
        },
        {
            header: 'Acciones',
            accessor: (h: ImportHistory) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(h)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar criterios">
                        <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                     <button onClick={() => handleDelete(h)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Eliminar lote y candidatos">
                        <span className="material-symbols-outlined text-base text-red-500">delete</span>
                    </button>
                </div>
            )
        }
    ];

    const loading = historyLoading || usersLoading;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Historial de Importaciones</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Revisa el registro de todos los lotes de candidatos importados al sistema.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : !sortedHistory || sortedHistory.length === 0 ? (
                <EmptyState
                    icon="history"
                    title="No hay historial de importaciones"
                    message="Una vez que importes tu primer lote de candidatos, aparecerá un registro aquí."
                />
            ) : (
                <Table columns={columns} data={sortedHistory} />
            )}

            {editingHistory && (
                <EditHistoryDrawer 
                    isOpen={!!editingHistory}
                    onClose={() => setEditingHistory(null)}
                    onSave={handleUpdateHistory}
                    historyRecord={editingHistory}
                />
            )}

            {deletingHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setDeletingHistory(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Confirmar Eliminación</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            ¿Estás seguro de que quieres eliminar este lote de importación? Se eliminarán permanentemente <b>{deletingHistory.newCandidates}</b> candidatos asociados a este lote. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeletingHistory(null)} className="bg-slate-200 dark:bg-slate-700 py-2 px-4 rounded-lg font-semibold">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Eliminar Lote</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportHistoryPage;
