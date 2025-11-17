import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Supplier, SupplierRating, Note } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import NotesSection from '../components/shared/NotesSection';

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm">
        <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="col-span-2 text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
);

const getRatingColor = (rating?: SupplierRating) => {
    switch (rating) {
        case SupplierRating.Excelente: return 'green';
        case SupplierRating.Bueno: return 'blue';
        case SupplierRating.Regular: return 'yellow';
        default: return 'gray';
    }
};

const SupplierDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: supplier, loading, error } = useDoc<Supplier>('suppliers', id || '');
    const { data: allNotes, loading: notesLoading } = useCollection<Note>('notes');
    
    const notes = useMemo(() => {
        if (!allNotes || !id) return [];
        return allNotes
            .filter(n => n.supplierId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allNotes, id]);

    const handleNoteAdded = (note: Note) => {
        if (allNotes) {
            (allNotes as Note[]).unshift(note);
        }
    };

    if (loading || notesLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !supplier) return <div className="text-center p-12">Proveedor no encontrado</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{supplier.name}</h2>
                    {supplier.rating && (
                        <div className="mt-2">
                            <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} />
                        </div>
                    )}
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                    <Link to={`/purchase/suppliers/${supplier.id}/edit`} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar Proveedor
                    </Link>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title="Órdenes de Compra Recientes">
                        <p className="text-sm text-slate-500 dark:text-slate-400">El historial de órdenes de compra aparecerá aquí.</p>
                    </InfoCard>
                    <NotesSection 
                        entityId={supplier.id}
                        entityType="supplier"
                        notes={notes}
                        onNoteAdded={handleNoteAdded}
                    />
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Información General">
                        <InfoRow label="Nombre" value={supplier.name} />
                        <InfoRow label="Industria" value={supplier.industry || 'N/A'} />
                        <InfoRow label="Rating" value={supplier.rating ? <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} /> : 'N/A'} />
                    </InfoCard>
                    <InfoCard title="Contactos">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Los contactos asociados a este proveedor aparecerán aquí.</p>
                    </InfoCard>
                </div>
            </div>
        </div>
    );
};

export default SupplierDetailPage;
