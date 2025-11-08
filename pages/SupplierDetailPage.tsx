import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Supplier, SupplierRating, Note } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';

const InfoCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold border-b pb-3 mb-4 text-text-main">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({label, value}) => (
    <div className="grid grid-cols-3 gap-4 text-sm">
        <dt className="font-medium text-text-secondary">{label}</dt>
        <dd className="col-span-2 text-text-main">{value}</dd>
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

const NoteModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (text: string) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (text.trim()) {
            onSave(text);
            setText('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">Nueva Nota / Acción</h3>
                </div>
                <div className="p-6">
                    <textarea
                        rows={5}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        placeholder="Describe la acción o nota..."
                    />
                </div>
                <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg space-x-2">
                    <button onClick={onClose} className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleSave} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-primary-dark">Guardar</button>
                </div>
            </div>
        </div>
    );
};

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const user = MOCK_USERS[note.userId];
    return (
        <div className="bg-light-bg p-4 rounded-lg">
            <p className="text-sm text-text-main whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center text-xs text-text-secondary mt-2">
                {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};


const SupplierDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: supplier, loading, error } = useDoc<Supplier>('suppliers', id || '');
    const { data: allNotes } = useCollection<Note>('notes');
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);

    useEffect(() => {
        if (allNotes && id) {
            const supplierNotes = allNotes
                .filter(n => n.supplierId === id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(supplierNotes);
        }
    }, [allNotes, id]);

    const handleAddNote = (text: string) => {
        if (!id) return;
        const newNote: Note = {
            id: `note-${Date.now()}`,
            supplierId: id,
            text,
            userId: 'natalia', // Assuming current user
            createdAt: new Date().toISOString()
        };
        setNotes(prev => [newNote, ...prev]);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error || !supplier) return <div className="text-center p-12">Proveedor no encontrado</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-main">{supplier.name}</h2>
                    {supplier.rating && (
                        <div className="mt-2">
                            <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} />
                        </div>
                    )}
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                    <Link to={`/crm/suppliers/${supplier.id}/edit`} className="bg-white border border-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">edit</span>
                        Editar Proveedor
                    </Link>
                    <button onClick={() => setIsActionModalOpen(true)} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-primary-dark transition-colors">
                        <span className="material-symbols-outlined mr-2 text-base">add</span>
                        Nueva Acción
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title="Órdenes de Compra Recientes">
                        <p className="text-sm text-gray-500">El historial de órdenes de compra aparecerá aquí.</p>
                    </InfoCard>
                    <InfoCard title="Actividad Reciente">
                         {notes.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {notes.map(note => <NoteCard key={note.id} note={note} />)}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay actividad registrada para este proveedor.</p>
                        )}
                    </InfoCard>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title="Información General">
                        <InfoRow label="Nombre" value={supplier.name} />
                        <InfoRow label="Industria" value={supplier.industry || 'N/A'} />
                        <InfoRow label="Rating" value={supplier.rating ? <Badge text={supplier.rating} color={getRatingColor(supplier.rating)} /> : 'N/A'} />
                    </InfoCard>
                    <InfoCard title="Contactos">
                        <p className="text-sm text-gray-500">Los contactos asociados a este proveedor aparecerán aquí.</p>
                    </InfoCard>
                </div>
            </div>
            <NoteModal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} onSave={handleAddNote} />
        </div>
    );
};

export default SupplierDetailPage;