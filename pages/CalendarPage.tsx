
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, Delivery, Prospect, Sample, PurchaseOrder, Company, Birthday, Supplier } from '../types';
import Spinner from '../components/ui/Spinner';
import { getOverdueStatus } from '../utils/time';
import EventDrawer from '../components/calendar/EventDrawer';
import { useAuth } from '../hooks/useAuth';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const EVENT_TYPES = {
  task: { label: 'Tareas', color: 'bg-blue-500', textColor: 'text-blue-500', icon: 'task_alt', bgSoft: 'bg-blue-50 dark:bg-blue-900/20' },
  delivery: { label: 'Entregas', color: 'bg-green-500', textColor: 'text-green-500', icon: 'local_shipping', bgSoft: 'bg-green-50 dark:bg-green-900/20' },
  prospectAction: { label: 'Acciones Prospecto', color: 'bg-purple-500', textColor: 'text-purple-500', icon: 'person_search', bgSoft: 'bg-purple-50 dark:bg-purple-900/20' },
  sampleRequest: { label: 'Muestras', color: 'bg-orange-500', textColor: 'text-orange-500', icon: 'science', bgSoft: 'bg-orange-50 dark:bg-orange-900/20' },
  purchaseOrder: { label: 'Órdenes de Compra', color: 'bg-slate-500', textColor: 'text-slate-500', icon: 'receipt_long', bgSoft: 'bg-slate-50 dark:bg-slate-900/20' },
  birthday: { label: 'Cumpleaños', color: 'bg-pink-500', textColor: 'text-pink-500', icon: 'cake', bgSoft: 'bg-pink-50 dark:bg-pink-900/20' },
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: keyof typeof EVENT_TYPES;
  link: string;
  isOverdue?: boolean;
  data: any;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const startOfWeek = (date: Date): Date => {
  const dt = new Date(date);
  const day = dt.getDay();
  const diff = dt.getDate() - day; // adjust when day is sunday
  return new Date(dt.setDate(diff));
}

const TimeIndicator: React.FC<{ now: Date; view: 'list' | 'week' }> = ({ now, view }) => {
    if (view === 'list') {
        return (
            <div className="relative h-0 my-4 w-full flex items-center">
              <div className="absolute left-0 w-full border-t-2 border-red-500 border-dashed opacity-50"></div>
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 text-xs font-bold text-red-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900 z-10 shadow-sm">
                AHORA: {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
        );
    }
    // Week view style
    return (
        <div className="relative my-2 w-full h-0.5 bg-red-500 z-20 pointer-events-none">
            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 shadow-sm"></div>
            <span className="absolute -left-16 -top-2.5 text-xs font-bold text-red-500 bg-white dark:bg-slate-800 px-1 rounded shadow-sm">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    );
};

const CalendarPage: React.FC = () => {
    const { data: tasks, loading: tasksLoading } = useCollection<Task>('tasks');
    const { data: deliveries, loading: delLoading } = useCollection<Delivery>('deliveries');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: samples, loading: sLoading } = useCollection<Sample>('samples');
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: birthdays, loading: bLoading } = useCollection<Birthday>('birthdays');
    const { data: suppliers, loading: supLoading } = useCollection<Supplier>('suppliers');
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(new Date());
    const [view, setView] = useState('month');
    const [filters, setFilters] = useState(
      Object.keys(EVENT_TYPES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    const [showMyEvents, setShowMyEvents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const { user: currentUser } = useAuth();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update time every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (tasks) {
            setLocalTasks(tasks);
        }
    }, [tasks]);
    
    const suppliersMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name])), [suppliers]);

    const handleAddTask = (newTask: Task) => {
        setLocalTasks(prev => (prev ? [...prev, newTask] : [newTask]));
    };

    const allEvents = useMemo<CalendarEvent[]>(() => {
        const events: CalendarEvent[] = [];

        localTasks?.forEach(t => {
            if (t.dueAt) {
                const { isOverdue } = getOverdueStatus(t.dueAt, t.status);
                events.push({ 
                    id: `t-${t.id}`, 
                    title: isOverdue ? `[Vencida] ${t.title}` : t.title, 
                    start: new Date(t.dueAt), 
                    type: 'task', 
                    link: `/tasks/${t.id}`,
                    isOverdue,
                    data: t
                });
            }
        });
        
        deliveries?.forEach(d => events.push({ id: `d-${d.id}`, title: `Entrega a ${companies?.find(c => c.id === d.companyId)?.shortName || 'Cliente'}`, start: new Date(d.scheduledDate), type: 'delivery', link: `/logistics/deliveries`, data: d }));
        prospects?.forEach(p => p.nextAction?.dueDate && events.push({ id: `p-${p.id}`, title: p.nextAction.description, start: new Date(p.nextAction.dueDate), type: 'prospectAction', link: `/hubs/prospects/${p.id}`, data: p }));
        
        samples?.forEach(s => {
          events.push({ id: `sr-${s.id}`, title: `Muestra: ${s.name}`, start: new Date(s.requestDate), type: 'sampleRequest', link: `/hubs/samples/${s.id}`, data: s });
        });
        
        // Update: Better Purchase Order Title using Supplier Name
        purchaseOrders?.forEach(po => {
            const supplierName = suppliersMap.get(po.supplierId) || 'Proveedor';
            const date = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : new Date(po.createdAt);
            events.push({ 
                id: `po-${po.id}`, 
                title: `OC: ${supplierName} - $${(po.total || 0).toLocaleString()}`, 
                start: date, 
                type: 'purchaseOrder', 
                link: `/purchase/orders/${po.id}`, 
                data: po 
            });
        });
        
        birthdays?.forEach(b => {
            const [year, month, day] = b.date.split('-').map(Number);
            // Create date for current calendar year to make it recurrent visually (basic impl)
            const currentYear = currentDate.getFullYear();
            const eventDate = new Date(currentYear, month - 1, day);
            events.push({
                id: `b-${b.id}`,
                title: `Cumpleaños de ${b.name}`,
                start: eventDate,
                type: 'birthday',
                link: '/profile', 
                data: b
            });
        });
        
        return events.sort((a,b) => a.start.getTime() - b.start.getTime());
    }, [localTasks, deliveries, prospects, samples, purchaseOrders, companies, birthdays, currentDate, suppliersMap]);

    const filteredEvents = useMemo(() => {
        if (!currentUser) return [];
        return allEvents.filter(event => {
            const typeMatch = filters[event.type];
            if (!typeMatch) return false;

            // Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!event.title.toLowerCase().includes(term)) return false;
            }

            if (showMyEvents) {
                switch(event.type) {
                    case 'task':
                        return (event.data as Task).assignees.includes(currentUser.id) || (event.data as Task).watchers.includes(currentUser.id);
                    case 'prospectAction':
                        return (event.data as Prospect).ownerId === currentUser.id;
                    case 'delivery':
                        return currentUser.role === 'Logística' || currentUser.role === 'Admin';
                    case 'sampleRequest':
                        return (event.data as Sample).ownerId === currentUser.id;
                    case 'birthday':
                        return (event.data as Birthday).userId === currentUser.id;
                    default:
                        return true; 
                }
            }
            return true;
        });
    }, [allEvents, filters, showMyEvents, currentUser, searchTerm]);
    
    const { year, month } = { year: currentDate.getFullYear(), month: currentDate.getMonth() };

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(new Date(year, month - 1, 1));
        if (view === 'week') setCurrentDate(addDays(currentDate, -7));
        if (view === 'day') setCurrentDate(addDays(currentDate, -1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(new Date(year, month + 1, 1));
        if (view === 'week') setCurrentDate(addDays(currentDate, 7));
        if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    };
    
    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    const headerTitle = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
        let title = formatter.format(currentDate);
        if (view === 'week') {
          const start = startOfWeek(currentDate);
          const end = addDays(start, 6);
          title = `${start.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})} - ${end.toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'})}`;
        }
        if (view === 'day') {
          title = currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        return title.charAt(0).toUpperCase() + title.slice(1);
    }, [currentDate, view]);

    const loading = tasksLoading || delLoading || pLoading || sLoading || poLoading || cLoading || bLoading || supLoading;

    const MonthView = () => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();
        const calendarDays = useMemo(() => {
            const days = [];
            for (let i = 0; i < startDayOfWeek; i++) {
                days.push({ key: `prev-${i}`, date: null, isCurrentMonth: false });
            }
            for (let day = 1; day <= daysInMonth; day++) {
                days.push({ key: day, date: new Date(year, month, day), isCurrentMonth: true });
            }
            while (days.length % 7 !== 0) {
                days.push({ key: `next-${days.length}`, date: null, isCurrentMonth: false });
            }
            return days;
        }, [year, month, daysInMonth, startDayOfWeek]);

        return (
            <>
                <div className="grid grid-cols-7 text-center font-bold text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => ( <div key={day} className="py-3">{day}</div> ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                   {calendarDays.map(({ key, date, isCurrentMonth }) => {
                       const dayEvents = date ? filteredEvents.filter(e => e.start.toDateString() === date.toDateString()) : [];
                       const isToday = date?.toDateString() === new Date().toDateString();
                       return (
                           <div key={key} className={`border-r border-b border-slate-200 dark:border-slate-700 p-1 min-h-[100px] flex flex-col transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${!isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-900/30' : ''}`}>
                                {date && (
                                    <div className="flex justify-end p-1">
                                        <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1 flex-1 overflow-hidden">
                                    {dayEvents.slice(0, 3).map(event => {
                                        const eventConfig = EVENT_TYPES[event.type];
                                        // Use softer background for month view
                                        const colorClass = event.isOverdue ? 'bg-red-100 text-red-700 border-red-200' : `${eventConfig.bgSoft} ${eventConfig.textColor}`;
                                        return (
                                            <Link to={event.link} key={event.id} className={`block text-[10px] px-1.5 py-0.5 rounded border border-transparent hover:border-current transition-all truncate font-medium ${colorClass}`}>
                                                {event.title}
                                            </Link>
                                        )
                                    })}
                                    {dayEvents.length > 3 && (
                                        <p className="text-[10px] font-bold text-slate-400 text-center hover:text-indigo-500 cursor-pointer">+ {dayEvents.length - 3} más</p>
                                    )}
                                </div>
                           </div>
                       );
                   })}
                </div>
            </>
        );
    };

    const WeekView = () => {
        const start = startOfWeek(currentDate);
        const days = Array.from({length: 7}).map((_, i) => addDays(start, i));
        
        return (
             <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 text-center text-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
                    {days.map(day => {
                        const isToday = day.toDateString() === now.toDateString();
                        return (
                            <div key={day.toISOString()} className="py-3 border-r border-slate-100 dark:border-slate-700 last:border-0">
                                <p className={`text-xs font-bold uppercase mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}>{day.toLocaleDateString('es-ES', {weekday: 'short'})}</p>
                                <div className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-7 min-h-[500px]">
                    {days.map(day => {
                        const dayEvents = filteredEvents.filter(e => e.start.toDateString() === day.toDateString());
                        const isToday = day.toDateString() === now.toDateString();
                        
                        return (
                            <div key={day.toISOString()} className={`border-r border-slate-200 dark:border-slate-700 p-2 space-y-2 relative ${isToday ? 'bg-indigo-50/10' : ''}`}>
                                {isToday && <TimeIndicator now={now} view="week" />}
                                {dayEvents.map(event => {
                                     const eventConfig = EVENT_TYPES[event.type];
                                     const colorClass = event.isOverdue ? 'bg-red-500 text-white' : `${eventConfig.color} text-white`;
                                     return (
                                        <Link to={event.link} key={event.id} className={`block text-xs p-2 rounded-md shadow-sm hover:shadow-md transition-all ${colorClass}`}>
                                            <p className="font-semibold truncate">{event.title}</p>
                                            <div className="flex items-center gap-1 mt-1 opacity-90">
                                                <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                <span>{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                                            </div>
                                        </Link>
                                     )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };
    
    const DayView = () => {
         const dayEvents = filteredEvents.filter(e => e.start.toDateString() === currentDate.toDateString());
         const isToday = currentDate.toDateString() === now.toDateString();
         
         // Simplified logic for day view list
         const sortedEvents = dayEvents.sort((a,b) => a.start.getTime() - b.start.getTime());

         const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
            const colorClass = event.isOverdue 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200' 
                : `${eventConfig.bgSoft} border-${eventConfig.color.split('-')[1]}-500 ${eventConfig.textColor}`;
            
            return (
                <Link to={event.link} key={event.id} className={`flex items-center gap-4 p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 mb-3`}>
                    <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                        <div className={`mt-1 p-1 rounded-full ${eventConfig.bgSoft}`}>
                             <span className={`material-symbols-outlined text-lg ${eventConfig.textColor}`}>{eventConfig.icon}</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-base">{event.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-0.5">{eventConfig.label}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </Link>
            )
         }

         return (
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/30">
                 {isToday && <TimeIndicator now={now} view="list" />}
                 {sortedEvents.length > 0 ? sortedEvents.map(renderEvent) : (
                     <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                         <span className="material-symbols-outlined text-5xl mb-2">event_busy</span>
                         <p>No hay eventos para este día.</p>
                     </div>
                 )}
             </div>
         );
    };
    
    const ListView = () => {
        const futureEvents = filteredEvents.filter(e => e.start >= new Date(new Date().setHours(0,0,0,0))).sort((a,b) => a.start.getTime() - b.start.getTime());

        const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
             return (
                <Link to={event.link} key={event.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                    {/* App Icon Pattern for Date */}
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                        <span className="text-xs font-bold text-slate-500 uppercase">{event.start.toLocaleDateString('es-ES', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{event.start.getDate()}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                             <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${eventConfig.bgSoft} ${eventConfig.textColor}`}>
                                <span className="material-symbols-outlined text-[12px]">{eventConfig.icon}</span>
                                {eventConfig.label}
                             </span>
                             {event.isOverdue && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">Vencido</span>}
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{event.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-500 transition-colors">arrow_forward</span>
                </Link>
            )
        }

        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50 dark:bg-slate-900/30">
                 <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Próximos Eventos</h3>
                 {futureEvents.length > 0 ? futureEvents.map(renderEvent) : <p className="text-center text-slate-500 py-8">No hay eventos próximos.</p>}
            </div>
        )
    };
    
    const renderView = () => {
        switch (view) {
            case 'month': return <MonthView />;
            case 'week': return <WeekView />;
            case 'day': return <DayView />;
            case 'list': return <ListView />;
            default: return null;
        }
    }

    if (loading || !currentUser) return <div className="flex justify-center items-center h-full"><Spinner/></div>

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
                {/* Sidebar */}
                <div className="w-full lg:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
                        <button onClick={() => setIsDrawerOpen(true)} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all transform hover:scale-[1.02]">
                            <span className="material-symbols-outlined">add_circle</span>
                            Nuevo Evento
                        </button>
                        
                        {/* Search - Input Safe Pattern */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar eventos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                         <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 mb-6 border border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Solo mis eventos</span>
                            <ToggleSwitch enabled={showMyEvents} onToggle={() => setShowMyEvents(!showMyEvents)} />
                        </div>
                        
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Filtros</h3>
                            <div className="space-y-2">
                                {Object.entries(EVENT_TYPES).map(([key, config]) => {
                                    const isSelected = filters[key as keyof typeof filters];
                                    return (
                                        <button 
                                            key={key} 
                                            onClick={() => setFilters(f => ({...f, [key]: !f[key as keyof typeof filters]}))}
                                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all border ${isSelected ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 shadow-sm' : 'bg-transparent border-transparent opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            {/* App Icon Pattern for Legend */}
                                            <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${config.bgSoft}`}>
                                                <span className={`material-symbols-outlined text-lg ${config.textColor}`}>{config.icon}</span>
                                            </div>
                                            <span className={`text-sm font-medium flex-1 text-left ${isSelected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>{config.label}</span>
                                            {isSelected && <span className="material-symbols-outlined text-indigo-500 text-base">check</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-w-0 overflow-hidden">
                    {/* Calendar Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 gap-4 bg-white dark:bg-slate-800 z-20">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 capitalize">{headerTitle}</h2>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                                <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:text-indigo-600 transition-all shadow-sm hover:shadow"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                                <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 uppercase tracking-wide">Hoy</button>
                                <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:text-indigo-600 transition-all shadow-sm hover:shadow"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                            </div>
                        </div>
                         <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                            {[{id: 'month', label: 'Mes'}, {id: 'week', label: 'Semana'}, {id: 'day', label: 'Día'}, {id: 'list', label: 'Agenda'}].map(v => (
                              <button 
                                key={v.id} 
                                onClick={() => setView(v.id)} 
                                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${view === v.id ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                              >
                                  {v.label}
                              </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                         {renderView()}
                    </div>
                </div>
            </div>
            <EventDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleAddTask} />
        </>
    );
};

export default CalendarPage;
