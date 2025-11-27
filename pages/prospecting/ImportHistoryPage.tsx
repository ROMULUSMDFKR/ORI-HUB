
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
import { useNavigate } from 'react-router-dom';

const ImportHistoryPage: React.FC = () => {
    const { data: initialHistory, loading: historyLoading } = useCollection<ImportHistory>('importHistory');
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const [history, setHistory] = useState<ImportHistory[] | null>(null);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [editingHistory, setEditingHistory] = useState<ImportHistory | null>(null);
    const [deletingHistory, setDeletingHistory] = useState<ImportHistory | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if(initialHistory) {
            setHistory(initialHistory);
        }
    }, [initialHistory]);

    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

    const sortedHistory = useMemo(() => {
        if (!history) return [];
        let data = [...history].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
        
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(h => 
                h.searchCriteria.searchTerms.some(t => t.toLowerCase().includes(lowerTerm)) ||
                usersMap.get(h.importedById)?.toLowerCase().includes(lowerTerm)
            );
        }
        return data;
    }, [history, searchTerm, usersMap]);

    const handleEdit = (record: ImportHistory) => {
        setEditingHistory(record);
    };

    const handleRetry = (record: ImportHistory) => {
        navigate('/prospecting/upload', { state: { retryCriteria: record.searchCriteria } });
    };
    
    const handleViewResults = (record: ImportHistory) => {
        navigate('/prospecting/candidates', { state: { importHistoryId: record.id } });
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
            accessor: (h: ImportHistory) => (
                 <div className="flex items-center gap-3">
                     {/* App Icon Pattern */}
                     <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">history</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{new Date(h.importedAt).toLocaleString()}</span>
                </div>
            )
        },
        { 
            header: 'Criterios de Búsqueda', 
            accessor: (h: ImportHistory) => (
                <div className="text-xs">
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-xs" title={h.searchCriteria.searchTerms.join(', ')}>
                        {h.searchCriteria.searchTerms.join(', ')}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {h.searchCriteria.location} &bull; {h.searchCriteria.profiledCompany || 'Sin perfil'}
                    </p>
                </div>
            )
        },
        { 
            header: 'Resultados', 
            accessor: (h: ImportHistory) => (
                <div className="flex gap-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200">+{h.newCandidates} Nuevos</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">{h.duplicatesSkipped} Omitidos</span>
                </div>
            )
        },
        { 
            header: 'Importado por', 
            accessor: (h: ImportHistory) => <span className="text-sm text-slate-600 dark:text-slate-300">{usersMap.get(h.importedById) || h.importedById}</span>
        },
        { 
            header: 'Estado', 
            accessor: (h: ImportHistory) => <Badge text={h.status} color={h.status === 'Completed' ? 'green' : (h.status === 'In Progress' ? 'yellow' : (h.status === 'Cancelled' ? 'gray' : 'red'))} />
        },
        {
            header: 'Acciones',
            accessor: (h: ImportHistory) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleViewResults(h)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600" title="Ver resultados">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button onClick={() => handleRetry(h)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600" title="Reintentar">
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                    <button onClick={() => handleEdit(h)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Editar criterios">
                        <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                     <button onClick={() => handleDelete(h)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Eliminar">
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    const loading = historyLoading || usersLoading;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Historial de Importaciones</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Registro de lotes importados y resultados.</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por término o usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : !sortedHistory || sortedHistory.length === 0 ? (
                    <EmptyState
                        icon="history"
                        title="No hay historial"
                        message="Una vez que importes candidatos, el registro aparecerá aquí."
                    />
                ) : (
                    <Table columns={columns} data={sortedHistory} />
                )}
            </div>

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
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                         <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                            <h3 className="text-lg font-bold">Confirmar Eliminación</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                            ¿Estás seguro de que quieres eliminar este lote? Se eliminarán permanentemente <b>{deletingHistory.newCandidates}</b> candidatos asociados. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingHistory(null)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-4 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors shadow-sm">Eliminar Lote</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportHistoryPage;
