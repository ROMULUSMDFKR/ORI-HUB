import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { SalesOrder, SalesOrderStatus, Note, ActivityLog } from '../types';
import { SALES_ORDERS_PIPELINE_COLUMNS } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const SalesOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: salesOrder, loading, error } = useDoc<SalesOrder>('salesOrders', id || '');
    const { data: allNotes } = useCollection<Note>('notes');
    const [currentStatus, setCurrentStatus] = useState<SalesOrderStatus | undefined>();
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (salesOrder) {
            setCurrentStatus(salesOrder.status);
        }
    }, [salesOrder]);

    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
        }
    };
    
    const addActivityLog = async (description: string) => {
        if (!currentUser || !id) return;
        const log: Omit<ActivityLog, 'id'> = { salesOrderId: id, type: 'Cambio de Estado', description, userId: currentUser.id, createdAt: new Date().toISOString() };
        try {
            await api.addDoc('activities', log);
        } catch (error) {
            console.error("Error adding activity log:", error);
        }
    };

    const handleSaveStatus = async () => {
        if (currentStatus && id && currentStatus !== salesOrder?.status) {
             try {
                await api.updateDoc('salesOrders', id, { status: currentStatus });
                addActivityLog(`Estado de la orden actualizado de "${salesOrder?.status}" a "${currentStatus}"`);
                showToast('success', 'Estado de la orden actualizado.');
            } catch (error) {
                console.error("Error updating sales order status:", error);
                showToast('error', "Error al actualizar el estado.");
            }
        }
    };
    
    const salesOrderNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.salesOrderId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !salesOrder) return <div className="text-center p-12">Orden de Venta no encontrada</div>;
    
    const statusOptions = SALES_ORDERS_PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Orden de Venta: {salesOrder.id}</h1>
                    <p className="text-slate-500 dark:text-slate-400">Total: ${salesOrder.total.toLocaleString()}</p>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="w-48">
                        <CustomSelect options={statusOptions} value={currentStatus || ''} onChange={val => setCurrentStatus(val as SalesOrderStatus)} />
                    </div>
                     <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Detalles de la Orden</h3>
                        <p>Más detalles de la orden de venta aquí...</p>
                    </div>
                </div>
                <div className="md:col-span-1">
                    <NotesSection 
                        entityId={salesOrder.id}
                        entityType="salesOrder"
                        notes={salesOrderNotes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDetailPage;