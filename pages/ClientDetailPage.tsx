

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDoc } from '../hooks/useDoc';
import { useCollection } from '../hooks/useCollection';
import { Company, Stakeholder, Contact, Task, Note, ActivityLog, SalesOrder, SupportTicket, ArchiveFile, Priority, Product, SalesOrderStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { MOCK_USERS } from '../data/mockData';
import { GoogleGenAI } from '@google/genai';


// --- Reusable UI Components ---
const WavyBg = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full opacity-10">
      <path d="M-50,20 C100,100 200,-50 350,50 L350,150 L-50,150 Z" fill="currentColor" />
      <path d="M-50,50 C100,-50 200,100 350,20 L350,150 L-50,150 Z" fill="currentColor" opacity="0.5"/>
    </svg>
  );

const InfoRow: React.FC<{ icon: string; label: string; value: React.ReactNode; }> = ({ icon, label, value }) => (
    <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center text-on-surface-secondary">
            <span className="material-symbols-outlined text-base w-5 mr-3">{icon}</span>
            <span>{label}</span>
        </div>
        <div className="font-semibold text-on-surface text-right flex-shrink-0 ml-4 max-w-[60%] truncate">
            {value}
        </div>
    </div>
);

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-base transition-colors duration-200 ${
            isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
    >
        {label}
    </button>
);

const ProfileSection: React.FC<{ title: string; icon: string; children: React.ReactNode, className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-surface p-6 rounded-xl shadow-sm ${className}`}>
        <div className="flex items-center mb-4">
            <span className="material-symbols-outlined text-2xl text-accent mr-3">{icon}</span>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);

const ProfileDetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-2 gap-4 items-start py-2 text-sm border-b border-gray-100 last:border-b-0">
        <span className="text-on-surface-secondary">{label}</span>
        <span className="font-semibold text-on-surface text-right">{value}</span>
    </div>
);

// --- New Intelligent Components ---

const SuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-surface rounded-lg shadow-xl m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Cerrar">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};


const AlertsPanel: React.FC<{ alerts: string[] }> = ({ alerts }) => {
    if (alerts.length === 0) return null;
    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <span className="material-symbols-outlined text-yellow-500">warning</span>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700 font-semibold">Alertas Inteligentes</p>
                    <ul className="list-disc ml-5 mt-1">
                        {alerts.map((alert, index) => (
                           <li key={index} className="text-sm text-yellow-700">{alert}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const AnalyticsSection: React.FC<{ sales: SalesOrder[], products: any[] }> = ({ sales, products }) => {
    const { salesByMonth, maxSale } = React.useMemo(() => {
        const today = new Date();
        
        // Calculate sales for the last 6 months
        const salesByMonthData: Record<string, number> = {};
        const monthLabels: string[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('es-ES', { month: 'short' });
            monthLabels.push(monthLabel);
            salesByMonthData[monthLabel] = 0;
        }

        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        
        sales.forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (orderDate >= sixMonthsAgo) {
                const monthLabel = orderDate.toLocaleString('es-ES', { month: 'short' });
                if (salesByMonthData.hasOwnProperty(monthLabel)) {
                    salesByMonthData[monthLabel] += order.total;
                }
            }
        });
        
        const salesByMonth = monthLabels.map(label => [label, salesByMonthData[label]]);
        const maxSale = Math.max(...salesByMonth.map(([, total]) => Number(total)), 0);
        
        return { salesByMonth, maxSale };
    }, [sales]);
    
    const topProducts = React.useMemo(() => {
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      const productSales: Record<string, {name: string, total: number}> = {};

      sales
        .filter(order => new Date(order.createdAt) >= sixMonthsAgo) // Filter for last 6 months
        .forEach(order => {
            order.items?.forEach(item => {
            if(!productSales[item.productId]) {
                const product = products.find(p => p.id === item.productId);
                productSales[item.productId] = { name: product?.name || item.productName || item.productId, total: 0 };
            }
            productSales[item.productId].total += item.subtotal;
            })
        });
        
      return Object.values(productSales).sort((a,b) => b.total - a.total).slice(0, 3);
    }, [sales, products]);

    const [barWidths, setBarWidths] = React.useState<Record<string, number>>({});

    React.useEffect(() => {
        const maxTopProductValue = Math.max(...topProducts.map(p => p.total), 0);
        const newWidths: Record<string, number> = {};
        topProducts.forEach(p => {
            newWidths[p.name] = maxTopProductValue > 0 ? (p.total / maxTopProductValue) * 100 : 0;
        });

        // Timeout to allow initial render with 0 width and then animate
        const timer = setTimeout(() => {
            setBarWidths(newWidths);
        }, 100);

        return () => clearTimeout(timer);
    }, [topProducts]);

    const TOP_PRODUCT_COLORS = ['bg-accent', 'bg-primary', 'bg-gray-400'];

    return (
        <ProfileSection title="Análisis Rápido" icon="monitoring">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold mb-2">Ventas (Últimos 6 Meses)</h4>
                    <div className="flex items-end h-40 space-x-2 border-l border-b border-border p-2">
                        {salesByMonth.map(([month, total]) => (
                            <div key={month as string} className="flex-1 flex flex-col items-center justify-end" title={`$${(total as number).toLocaleString()}`}>
                                <div className="w-full bg-accent/30 hover:bg-accent/50 rounded-t-sm" style={{ height: `${maxSale > 0 ? ((total as number) / maxSale) * 100 : 0}%`, transition: 'height 0.5s ease-out' }}></div>
                                <p className="text-xs mt-1 text-center">{month as string}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-semibold mb-2">Productos Más Comprados (6 Meses)</h4>
                    <ul className="space-y-4">
                      {topProducts.map((p, index) => (
                        <li key={p.name} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span>{p.name}</span>
                            <span className="font-semibold">${p.total.toLocaleString()}</span>
                          </div>
                           <div className="bg-gray-200 rounded-full h-2.5">
                                <div
                                    className={`${TOP_PRODUCT_COLORS[index % TOP_PRODUCT_COLORS.length]} h-2.5 rounded-full transition-all ease-out duration-1000`}
                                    style={{ width: `${barWidths[p.name] || 0}%` }}
                                />
                            </div>
                        </li>
                      ))}
                    </ul>
                </div>
            </div>
        </ProfileSection>
    )
};


// --- Tab Content Components ---

const ContactsTab: React.FC<{ contacts: Contact[] }> = ({ contacts }) => {
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Lista de Contactos</h3>
                <button
                    onClick={() => alert('Funcionalidad para añadir nuevo contacto.')}
                    className="bg-primary text-on-primary font-semibold py-2 px-3 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm"
                >
                    <span className="material-symbols-outlined mr-2 !text-base">add</span>
                    Añadir Contacto
                </button>
            </div>
            {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay contactos asociados.</div>
            ) : (
                <ul className="divide-y divide-border">
                    {contacts.map(contact => (
                        <li key={contact.id} className="py-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-on-surface">{contact.name}</p>
                                <p className="text-sm text-on-surface-secondary">{contact.role}</p>
                            </div>
                            <div className="text-right">
                                 <a href={`mailto:${contact.email}`} className="text-sm text-accent hover:underline">{contact.email}</a>
                                 <p className="text-sm text-on-surface-secondary">{contact.phone}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const TasksTab: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    if (tasks.length === 0) return <div className="bg-surface p-6 rounded-xl shadow-sm text-center text-gray-500">No hay tareas asociadas.</div>;
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <ul className="space-y-3">
                {tasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                        <div className="flex items-center">
                            <span className={`material-symbols-outlined text-lg mr-3 ${task.status === 'Por Hacer' ? 'text-gray-400' : 'text-accent'}`}>
                                {task.status === 'Por Hacer' ? 'radio_button_unchecked' : 'check_circle'}
                            </span>
                            <div>
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-on-surface-secondary">Vence: {new Date(task.dueAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex -space-x-2">
                            {task.assignees.map(userId => {
                                const user = MOCK_USERS[userId];
                                return user ? <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border-2 border-white" /> : null;
                            })}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CommentCard: React.FC<{ note: Note; onUpdate: (id: string, text: string) => void; onDelete: (id: string) => void; }> = ({ note, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState(note.text);
    const user = MOCK_USERS[note.userId];

    const handleSave = () => {
        if (editText.trim() !== '') {
            onUpdate(note.id, editText);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditText(note.text);
        setIsEditing(false);
    };

    return (
        <div className="bg-surface-inset p-4 rounded-lg">
            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-surface text-on-surface"
                    />
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleCancel} className="bg-surface border border-border text-on-surface font-semibold py-1 px-3 rounded-lg text-sm shadow-sm hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="bg-primary text-on-primary font-semibold py-1 px-3 rounded-lg text-sm shadow-sm hover:opacity-90">
                            Guardar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm text-on-surface whitespace-pre-wrap">{note.text}</p>
                    <div className="flex items-center justify-between text-xs text-on-surface-secondary mt-2">
                        <div className="flex items-center">
                            {user && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full mr-2" />}
                            <span>{user?.name} &bull; {new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setIsEditing(true)} className="p-1 rounded-full text-gray-500 hover:text-primary">
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button onClick={() => onDelete(note.id)} className="p-1 rounded-full text-gray-500 hover:text-red-500">
                                <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const CommentsTab: React.FC<{ initialNotes: Note[]; companyId: string }> = ({ initialNotes, companyId }) => {
    const [notes, setNotes] = React.useState(initialNotes);
    const [newNote, setNewNote] = React.useState('');

    const handleAddNote = () => {
        if (newNote.trim() === '') return;
        const note: Note = {
            id: `note-${Date.now()}`,
            companyId: companyId,
            text: newNote,
            userId: 'natalia', // Assuming current user is Natalia
            createdAt: new Date().toISOString(),
        };
        setNotes([note, ...notes]);
        setNewNote('');
    };
    
    const handleUpdateNote = (id: string, text: string) => {
        setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
    };

    const handleDeleteNote = (id: string) => {
        setNotes(notes.filter(n => n.id !== id));
    };

    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm space-y-4">
             <div>
                <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-surface text-on-surface"
                    placeholder="Escribe un nuevo comentario..."
                />
                <div className="text-right mt-2">
                    <button onClick={handleAddNote} className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:opacity-90">
                        Agregar Comentario
                    </button>
                </div>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                 {notes.length > 0 ? notes.map(note => (
                   <CommentCard 
                        key={note.id} 
                        note={note}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                    />
                )) : <p className="text-sm text-gray-500 text-center py-4">No hay comentarios para esta empresa.</p>}
            </div>
        </div>
    );
};

const ActivityTab: React.FC<{ activities: ActivityLog[] }> = ({ activities }) => {
    if (activities.length === 0) return <div className="bg-surface p-6 rounded-xl shadow-sm text-center text-gray-500">No hay historial de actividad.</div>;

    const iconMap: Record<ActivityLog['type'], string> = { 'Llamada': 'call', 'Email': 'email', 'Reunión': 'groups', 'Cotización': 'request_quote', 'Nota': 'note', 'Email Sincronizado': 'mark_email_read', 'Reunión Sincronizada': 'calendar_month' };
    
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" /> : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className={`h-8 w-8 rounded-full bg-surface-inset flex items-center justify-center ring-8 ring-white ${(activity.type.includes('Sincronizado')) ? 'bg-blue-100' : ''}`}>
                                            <span className="material-symbols-outlined text-on-surface-secondary">{iconMap[activity.type]}</span>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <p className="text-sm text-gray-500">
                                            {activity.description} por <span className="font-medium text-gray-900">{MOCK_USERS[activity.userId]?.name}</span>
                                        </p>
                                        <time dateTime={activity.createdAt} className="text-right text-sm whitespace-nowrap text-gray-500">{new Date(activity.createdAt).toLocaleDateString()}</time>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const CommercialHistoryTab: React.FC<{ salesOrders: SalesOrder[] }> = ({ salesOrders }) => {
    if (salesOrders.length === 0) return <div className="bg-surface p-6 rounded-xl shadow-sm text-center text-gray-500">No hay órdenes de venta.</div>;
    
    const getStatusColor = (status: SalesOrderStatus) => {
        switch (status) {
            case SalesOrderStatus.Facturada:
            case SalesOrderStatus.Entregada:
                return 'green';
            case SalesOrderStatus.EnPreparacion:
            case SalesOrderStatus.EnTransito:
                return 'blue';
            case SalesOrderStatus.Pendiente:
                return 'yellow';
            default:
                return 'gray';
        }
    };

    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">ID Orden</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {salesOrders.map((order) => (
                            <tr key={order.id}>
                                <td className="px-4 py-3 font-medium text-accent cursor-pointer hover:underline">{order.id}</td>
                                <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3"><Badge text={order.status} color={getStatusColor(order.status)} /></td>
                                <td className="px-4 py-3 text-right font-semibold">${order.total.toLocaleString('en-US')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FilesTab: React.FC<{ files: ArchiveFile[] }> = ({ files }) => {
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Archivos Adjuntos</h3>
                <button
                    onClick={() => alert('Abrir modal para subir archivo.')}
                    className="bg-primary text-on-primary font-semibold py-2 px-3 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm"
                >
                    <span className="material-symbols-outlined mr-2 !text-base">upload_file</span>
                    Subir Archivo
                </button>
            </div>
            {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay archivos asociados.</div>
            ) : (
                <ul className="divide-y divide-border">
                    {files.map(file => (
                        <li key={file.id} className="py-3 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-on-surface">{file.name}</p>
                                <div className="flex space-x-2 mt-1">
                                    {file.tags.map(tag => <Badge key={tag} text={tag} color="blue" />)}
                                </div>
                            </div>
                            <a href={file.url} download className="text-accent hover:underline text-sm">Descargar</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const SupportTab: React.FC<{ tickets: SupportTicket[] }> = ({ tickets }) => {
    // FIX: Explicitly typed `priorityColor` to ensure its values align with `BadgeColor` type.
    const priorityColor: Record<Priority, 'red' | 'yellow' | 'gray'> = { [Priority.Alta]: 'red', [Priority.Media]: 'yellow', [Priority.Baja]: 'gray' };
    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tickets de Soporte</h3>
                <button
                    onClick={() => alert('Abrir formulario para nuevo ticket.')}
                    className="bg-primary text-on-primary font-semibold py-2 px-3 rounded-lg flex items-center shadow-sm hover:opacity-90 transition-colors text-sm"
                >
                    <span className="material-symbols-outlined mr-2 !text-base">add</span>
                    Nuevo Ticket
                </button>
            </div>
            {tickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay tickets de soporte.</div>
            ) : (
                <ul className="divide-y divide-border">
                    {tickets.map(ticket => (
                        <li key={ticket.id} className="py-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-on-surface">{ticket.title}</p>
                                <Badge text={ticket.status} color={ticket.status === 'Abierto' ? 'red' : 'green'}/>
                            </div>
                            <div className="flex items-center justify-between text-xs text-on-surface-secondary mt-1">
                                <span>Creado: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                <Badge text={`Prioridad: ${ticket.priority}`} color={priorityColor[ticket.priority]} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- Main Page Component ---

const ClientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = React.useState('Perfil');
    const [kpiPeriod, setKpiPeriod] = React.useState<'Mensual' | 'Semestral' | 'Anual'>('Mensual');
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = React.useState(false);
    const [suggestion, setSuggestion] = React.useState('');
    const [suggestionLoading, setSuggestionLoading] = React.useState(false);
    const [suggestionError, setSuggestionError] = React.useState('');


    // --- Data Fetching ---
    const { data: company, loading: companyLoading } = useDoc<Company>('companies', id || '');
    const { data: contacts } = useCollection<Contact>('contacts');
    const { data: tasks } = useCollection<Task>('tasks');
    const { data: notes } = useCollection<Note>('notes');
    const { data: activities } = useCollection<ActivityLog>('activities');
    const { data: salesOrders } = useCollection<SalesOrder>('salesOrders');
    const { data: tickets } = useCollection<SupportTicket>('supportTickets');
    const { data: files } = useCollection<ArchiveFile>('archives');
    const { data: products } = useCollection<Product>('products');

    // --- Memoized Data Filtering & Calculations ---
    const companyData = React.useMemo(() => {
        if (!company) return null;
        const companySales = salesOrders?.filter(so => so.companyId === company.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
        const companyActivities = activities?.filter(a => a.companyId === company.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
        
        const totalLifetimeSales = companySales.reduce((sum, order) => sum + order.total, 0);
        const avgTicket = companySales.length > 0 ? totalLifetimeSales / companySales.length : 0;
        
        const lastActivityDays = companyActivities.length > 0 ? (new Date().getTime() - new Date(companyActivities[0].createdAt).getTime()) / (1000 * 3600 * 24) : 999;
        const recencyScore = Math.max(0, 100 - lastActivityDays * 2); 
        const openTickets = tickets?.filter(t => t.companyId === company.id && t.status === 'Abierto').length || 0;
        const healthScoreValue = Math.max(0, Math.min(100, recencyScore - (openTickets * 20) + (companySales.length * 5)));
        const healthScoreLabel = healthScoreValue > 75 ? 'Saludable' : healthScoreValue > 40 ? 'Estable' : 'En Riesgo';
        
        const alerts: string[] = [];
        if (lastActivityDays > 30) alerts.push(`No ha habido contacto en ${Math.floor(lastActivityDays)} días.`);
        if (openTickets > 0) alerts.push(`Tiene ${openTickets} ticket(s) de soporte abiertos.`);

        return {
            company,
            contacts: contacts?.filter(c => c.companyId === company.id) || [],
            tasks: tasks?.filter(t => t.links?.companyId === company.id) || [],
            notes: notes?.filter(n => n.companyId === company.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [],
            activities: companyActivities,
            sales: companySales,
            tickets: tickets?.filter(t => t.companyId === company.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [],
            files: files?.filter(f => f.companyId === company.id) || [],
            kpis: { avgTicket, healthScore: { score: healthScoreValue, label: healthScoreLabel } },
            alerts,
        }
    }, [company, contacts, tasks, notes, activities, salesOrders, tickets, files]);

    const calculatedKpis = React.useMemo(() => {
        if (!companyData?.sales) return { currentPeriodTotal: 0, changeVsPrevious: 0, periodLabel: 'mes' };
    
        const now = new Date();
        let days, periodLabel;
    
        switch (kpiPeriod) {
            case 'Semestral':
                days = 180;
                periodLabel = 'semestre';
                break;
            case 'Anual':
                days = 365;
                periodLabel = 'año';
                break;
            case 'Mensual':
            default:
                days = 30;
                periodLabel = 'mes';
                break;
        }
    
        const currentPeriodStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const previousPeriodStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
        const previousPeriodEndDate = currentPeriodStartDate;
    
        const currentSales = companyData.sales
            .filter(o => new Date(o.createdAt) >= currentPeriodStartDate)
            .reduce((sum, o) => sum + o.total, 0);
    
        const previousSales = companyData.sales
            .filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= previousPeriodStartDate && orderDate < previousPeriodEndDate;
            })
            .reduce((sum, o) => sum + o.total, 0);
    
        const change = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : (currentSales > 0 ? 100 : 0);
    
        return {
            currentPeriodTotal: currentSales,
            changeVsPrevious: change,
            periodLabel: periodLabel,
        };
    }, [companyData?.sales, kpiPeriod]);

    const creator = MOCK_USERS[companyData?.company.createdById || ''];
    const owner = MOCK_USERS[companyData?.company.ownerId || ''];

    const handleSuggestAction = async () => {
        if (!companyData) return;
        setIsSuggestionModalOpen(true);
        setSuggestionLoading(true);
        setSuggestion('');
        setSuggestionError('');

        try {
            const context = `
                Cliente: ${companyData.company.name} (${companyData.company.shortName})
                Industria: ${companyData.company.industry}
                Responsable en nuestro equipo: ${owner?.name}
                Puntuación de Salud: ${companyData.kpis.healthScore.score.toFixed(0)}/100 (${companyData.kpis.healthScore.label})
                Alertas Actuales: ${companyData.alerts.join(', ') || 'Ninguna'}
                Ventas (${kpiPeriod}): $${calculatedKpis.currentPeriodTotal.toLocaleString()}
                Cambio vs periodo anterior: ${calculatedKpis.changeVsPrevious.toFixed(2)}%
                Últimas 5 actividades:
                ${companyData.activities.slice(0, 5).map(a => `- ${new Date(a.createdAt).toLocaleDateString()}: ${a.type} - ${a.description}`).join('\n')}
                Últimas 2 notas:
                ${companyData.notes.slice(0, 2).map(n => `- ${n.text}`).join('\n')}
            `;
            const prompt = `
                Eres un asistente experto en CRM para una empresa de distribución de productos químicos.
                Basado en el siguiente resumen de un cliente, sugiere una única, clara y accionable "próxima acción" para el vendedor.
                La sugerencia debe ser concisa (máximo 2-3 frases), directa y en español. No añadas introducciones como "Claro, aquí tienes..." ni saludos. Empieza directamente con la acción.

                Contexto del Cliente:
                ${context}

                Próxima acción sugerida:
            `;

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setSuggestion(response.text);

        } catch (error) {
            console.error("Error fetching suggestion:", error);
            setSuggestionError('No se pudo contactar al servicio de IA. Inténtalo de nuevo más tarde.');
        } finally {
            setSuggestionLoading(false);
        }
    };


    const loading = companyLoading || !companyData;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (!companyData) return <div className="text-center p-12">Empresa no encontrada</div>;

    const { company: currentCompany, kpis } = companyData;
    
    
    const renderProfileTab = () => (
        <div className="space-y-6">
            <ProfileSection icon="tune" title="Preferencias de Comunicación">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ProfileDetailItem label="Canal Preferido" value={currentCompany.profile?.communication?.channel || 'N/A'} />
                    <ProfileDetailItem label="Horario" value={currentCompany.profile?.communication?.time || 'N/A'} />
                    <ProfileDetailItem label="Disponibilidad" value={currentCompany.profile?.communication?.isAvailable ? <Badge text="Disponible" color="green" /> : <Badge text="No Disponible" />} />
                    <ProfileDetailItem label="Días" value={currentCompany.profile?.communication?.days?.join(', ') || 'N/A'} />
                    <ProfileDetailItem label="Idioma/Tono" value={currentCompany.profile?.communication?.tone || 'N/A'} />
                    <ProfileDetailItem label="Formalidad" value={currentCompany.profile?.communication?.formality || 'N/A'} />
                    <ProfileDetailItem label="Tiempo de Respuesta (SLA)" value={currentCompany.profile?.communication?.sla || 'N/A'} />
                    <ProfileDetailItem label="Formato Cotización" value={currentCompany.profile?.communication?.quoteFormat || 'N/A'} />
                </div>
            </ProfileSection>
            <ProfileSection icon="groups" title="Mapa de Decisión">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Nombre</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Rol</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Poder</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Contacto</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface">
                            {currentCompany.profile?.decisionMap?.map((person: Stakeholder) => (
                                <tr key={person.id} className="border-b">
                                    <td className="px-4 py-2 font-medium">{person.name}</td>
                                    <td className="px-4 py-2">{person.role}</td>
                                    <td className="px-4 py-2">{person.power}</td>
                                    <td className="px-4 py-2 text-accent hover:underline"><a href={`mailto:${person.contact}`}>{person.contact}</a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ProfileSection>
            <ProfileSection icon="cases" title="Caso de uso y Especificaciones">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ProfileDetailItem label="Aplicación" value={currentCompany.profile?.useCase?.application || 'N/A'} />
                    <ProfileDetailItem label="Productos de Interés" value={currentCompany.profile?.useCase?.productsOfInterest?.join(', ') || 'N/A'} />
                    <ProfileDetailItem label="Presentación" value={currentCompany.profile?.useCase?.presentation || 'N/A'} />
                    <ProfileDetailItem label="Frecuencia de Compra" value={currentCompany.profile?.useCase?.frequency || 'N/A'} />
                    <ProfileDetailItem label="Consumo Mensual" value={`${currentCompany.profile?.useCase?.monthlyConsumption || 0} ton`} />
                </div>
            </ProfileSection>
            <ProfileSection icon="local_shipping" title="Logística Operativa">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ProfileDetailItem label="Punto de Entrega" value={currentCompany.profile?.logistics?.deliveryPoints || 'N/A'} />
                    <ProfileDetailItem label="Ventana de Descarga" value={currentCompany.profile?.logistics?.downloadWindow || 'N/A'} />
                    <ProfileDetailItem label="Equipo en Sitio" value={currentCompany.profile?.logistics?.equipmentOnSite?.join(', ') || 'N/A'} />
                    <ProfileDetailItem label="Incoterm" value={currentCompany.profile?.logistics?.incoterm || 'N/A'} />
                </div>
            </ProfileSection>
            <ProfileSection icon="shopping_cart" title="Proceso de Compra">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ProfileDetailItem label="Requiere OC" value={currentCompany.profile?.purchaseProcess?.requiresOC ? 'Sí' : 'No'} />
                    <ProfileDetailItem label="Registro Proveedor" value={currentCompany.profile?.purchaseProcess?.requiresSupplierRegistry ? 'Sí' : 'No'} />
                    <ProfileDetailItem label="Licitación" value={currentCompany.profile?.purchaseProcess?.isTender ? 'Sí' : 'No'} />
                    <ProfileDetailItem label="Término de Pago" value={currentCompany.profile?.purchaseProcess?.paymentTerm || 'N/A'} />
                    <ProfileDetailItem label="Tipo de Compra" value={currentCompany.profile?.purchaseProcess?.purchaseType || 'N/A'} />
                    <ProfileDetailItem label="Presupuesto" value={`$${currentCompany.profile?.purchaseProcess?.budget?.toLocaleString() || 'N/A'}`} />
                    <div className="col-span-2">
                      <ProfileDetailItem label="Docs Requeridos" value={currentCompany.profile?.purchaseProcess?.requiredDocs?.join(', ') || 'N/A'} />
                    </div>
                    <div className="col-span-2">
                      <ProfileDetailItem label="Criterios Aprobación" value={currentCompany.profile?.purchaseProcess?.approvalCriteria?.join(', ') || 'N/A'} />
                    </div>
                </div>
            </ProfileSection>
            <ProfileSection icon="timer" title="Disparadores y Timing">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ProfileDetailItem label="Punto de Reposición" value={currentCompany.profile?.triggers?.restockPoint || 'N/A'} />
                    <ProfileDetailItem label="Lead Time Máximo" value={`${currentCompany.profile?.triggers?.maxDeliveryTime || 'N/A'} días`} />
                </div>
            </ProfileSection>
        </div>
    );

     const tabContent: Record<string, React.ReactNode> = {
        'Perfil': renderProfileTab(),
        'Contactos': <ContactsTab contacts={companyData.contacts} />,
        'Tareas': <TasksTab tasks={companyData.tasks} />,
        'Comentarios': <CommentsTab initialNotes={companyData.notes} companyId={currentCompany.id} />,
        'Historial Comercial': <CommercialHistoryTab salesOrders={companyData.sales} />,
        'Actividad': <ActivityTab activities={companyData.activities} />,
        'Archivos': <FilesTab files={companyData.files} />,
        'Soporte': <SupportTab tickets={companyData.tickets} />,
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-primary text-on-primary p-5 rounded-xl relative overflow-hidden shadow-lg">
                    <div className="text-on-primary"><WavyBg /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">{currentCompany.shortName}</h3>
                                <p className="text-xs text-on-primary/80">{currentCompany.name} (ID: {currentCompany.id})</p>
                            </div>
                             <select
                                value={kpiPeriod}
                                onChange={(e) => setKpiPeriod(e.target.value as any)}
                                className="bg-white/20 text-xs rounded-md px-2 py-1 border-none focus:ring-0 appearance-none"
                                style={{backgroundColor: 'rgba(0,0,0,0.05)', color: '#1F2937'}}
                            >
                                <option value="Mensual">Mensual</option>
                                <option value="Semestral">Semestral</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>
                        <p className="mt-4 text-sm text-on-primary/80">Ventas Totales ({kpiPeriod})</p>
                        <p className="text-4xl font-bold mt-1">${calculatedKpis.currentPeriodTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                         <p className={`text-sm mt-1 ${calculatedKpis.changeVsPrevious >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            <span className="font-semibold">
                                {calculatedKpis.changeVsPrevious >= 0 ? '+' : ''}{calculatedKpis.changeVsPrevious.toFixed(2)}%
                            </span> vs {calculatedKpis.periodLabel} anterior
                        </p>
                        <div className="absolute bottom-5 right-5 flex items-end h-12 w-24 gap-1">
                            <div className="bg-black/20 rounded-t-sm w-full" style={{height: '45%'}}></div>
                            <div className="bg-black/40 rounded-t-sm w-full" style={{height: '75%'}}></div>
                            <div className="bg-black/20 rounded-t-sm w-full" style={{height: '55%'}}></div>
                            <div className="bg-black/20 rounded-t-sm w-full" style={{height: '35%'}}></div>
                        </div>
                    </div>
                </div>

                 <AlertsPanel alerts={companyData.alerts} />
                
                <div className="bg-surface p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Datos Generales</h3>
                    <div className="space-y-1">
                        <InfoRow icon="factory" label="Industria" value={currentCompany.industry || 'N/A'} />
                        <InfoRow icon="person" label="Responsable" value={owner?.name || 'N/A'} />
                        <InfoRow icon="person_add" label="Creado por" value={`${creator?.name} el ${new Date(currentCompany.createdAt).toLocaleDateString()}`} />
                        <InfoRow icon="receipt_long" label="Ticket Promedio" value={`$${kpis.avgTicket.toLocaleString('en-US', {maximumFractionDigits: 0})}`} />
                        <InfoRow icon="health_and_safety" label="Puntuación de Salud" value={<span className="font-semibold">{`${kpis.healthScore.score.toFixed(0)}/100 (${kpis.healthScore.label})`}</span>} />

                        <div className="pt-4 flex items-center gap-3">
                            <Link to={`/crm/clients/${currentCompany.id}/edit`} className="flex-1 text-center bg-surface border border-border text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                                Editar Detalles
                            </Link>
                             <button className="flex-1 bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors">
                                Crear
                            </button>
                        </div>
                         <button 
                            onClick={handleSuggestAction}
                            disabled={suggestionLoading}
                            className="w-full mt-2 text-center bg-green-50 border border-green-200 text-green-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-100 transition-colors flex items-center justify-center disabled:bg-gray-200 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined mr-2">{suggestionLoading ? 'hourglass_top' : 'lightbulb'}</span>
                            {suggestionLoading ? 'Analizando...' : 'Acción Sugerida'}
                        </button>
                    </div>
                </div>

            </div>

            {/* Right Content */}
            <div className="lg:col-span-8 xl:col-span-9">
                <AnalyticsSection sales={companyData.sales} products={products || []} />
                <div className="border-b border-border mt-6">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        {Object.keys(tabContent).map(tabName => (
                             <TabButton key={tabName} label={tabName} isActive={activeTab === tabName} onClick={() => setActiveTab(tabName)} />
                        ))}
                    </nav>
                </div>
                <div className="mt-6">
                    {tabContent[activeTab]}
                </div>
            </div>
            
            <SuggestionModal
                isOpen={isSuggestionModalOpen}
                onClose={() => setIsSuggestionModalOpen(false)}
                title="Acción Sugerida por IA"
            >
                {suggestionLoading ? (
                    <div className="flex flex-col items-center justify-center h-32">
                        <Spinner />
                        <p className="mt-2 text-on-surface-secondary">Analizando datos del cliente...</p>
                    </div>
                ) : suggestionError ? (
                    <div className="text-red-600">
                        <p className="font-semibold">Error al generar sugerencia:</p>
                        <p>{suggestionError}</p>
                    </div>
                ) : (
                    <p className="text-on-surface whitespace-pre-wrap">{suggestion}</p>
                )}
            </SuggestionModal>
        </div>
    );
};

export default ClientDetailPage;