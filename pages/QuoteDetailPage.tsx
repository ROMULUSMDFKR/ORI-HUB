import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Quote, QuoteStatus, Note } from '../types';
import { QUOTES_PIPELINE_COLUMNS } from '../constants';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import NotesSection from '../components/shared/NotesSection';
import { api } from '../api/firebaseApi';

const QuoteDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: quote, loading, error } = useDoc<Quote>('quotes', id || '');
    const { data: allNotes } = useCollection<Note>('notes');
    const [currentStatus, setCurrentStatus] = useState<QuoteStatus | undefined>();

    useEffect(() => {
        if (quote) {
            setCurrentStatus(quote.status);
        }
    }, [quote]);
    
    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
        }
    };

    const handleSaveStatus = async () => {
        if (currentStatus && id) {
            try {
                await api.updateDoc('quotes', id, { status: currentStatus });
                alert('Estado de la cotización actualizado.');
            } catch (error) {
                console.error("Error updating quote status:", error);
                alert("Error al actualizar el estado.");
            }
        }
    };
    
    const quoteNotes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.quoteId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !quote) return <div className="text-center p-12">Cotización no encontrada</div>;
    
    const statusOptions = QUOTES_PIPELINE_COLUMNS.map(c => ({ value: c.stage, name: c.stage }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Cotización: {quote.folio}</h1>
                    <p className="text-slate-500 dark:text-slate-400">Total: ${quote.totals.grandTotal.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-48">
                        <CustomSelect options={statusOptions} value={currentStatus || ''} onChange={val => setCurrentStatus(val as QuoteStatus)} />
                    </div>
                     <button onClick={handleSaveStatus} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 h-[42px]">Guardar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Detalles de la Cotización</h3>
                        <p>Más detalles de la cotización aquí...</p>
                    </div>
                </div>
                <div className="md:col-span-1">
                    <NotesSection 
                        entityId={quote.id}
                        entityType="quote"
                        notes={quoteNotes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
            </div>
        </div>
    );
};

export default QuoteDetailPage;