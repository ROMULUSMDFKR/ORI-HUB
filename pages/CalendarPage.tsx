
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, Delivery, Prospect, Sample, PurchaseOrder, Quote, Company, Birthday } from '../types';
// FIX: Se eliminó la importación de datos falsos.
import Spinner from '../components/ui/Spinner';
import { getOverdueStatus } from '../utils/time';
import EventDrawer from '../components/calendar/EventDrawer';
import { useAuth } from '../hooks/useAuth';

const EVENT_TYPES = {
  task: { label: 'Tareas', icon: 'task_alt', color: 'bg-blue-500', textColor: 'text-blue-500', borderColor: 'border-blue-500', selectedBg: 'bg-blue-500', selectedText: 'text-white' },
  delivery: { label: 'Entregas', icon: 'local_shipping', color: 'bg-emerald-500', textColor: 'text-emerald-500', borderColor: 'border-emerald-500', selectedBg: 'bg-emerald-500', selectedText: 'text-white' },
  prospectAction: { label: 'Prospectos', icon: 'person_search', color: 'bg-purple-500', textColor: 'text-purple-500', borderColor: 'border-purple-500', selectedBg: 'bg-purple-500', selectedText: 'text-white' },
  sampleRequest: { label: 'Muestras', icon: 'science', color: 'bg-amber-500', textColor: 'text-amber-500', borderColor: 'border-amber-500', selectedBg: 'bg-amber-500', selectedText: 'text-white' },
  purchaseOrder: { label: 'Compras', icon: 'shopping_cart', color: 'bg-slate-500', textColor: 'text-slate-500', borderColor: 'border-slate-500', selectedBg: 'bg-slate-500', selectedText: 'text-white' },
  birthday: { label: 'Cumpleaños', icon: 'cake', color: 'bg-pink-500', textColor: 'text-pink-500', borderColor: 'border-pink-500', selectedBg: 'bg-pink-500', selectedText: 'text-white' },
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
              <div className="absolute left-0 w-full border-t border-red-500 border-dashed"></div>
              <span className="absolute left-0 -top-2.5 text-[10px] font-bold text-red-500 bg-white dark:bg-slate-800 pr-2 z-10 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                AHORA: {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
        );
    }
    // Week view style
    return (
        <div className="relative my-2 w-full h-px bg-red-500 z-20 pointer-events-none">
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500"></div>
            <span className="absolute -left-14 -top-2 text-[10px] font-bold text-red-500 bg-white dark:bg-slate-800 pr-1 rounded shadow-sm border border-red-100">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(new Date());
    const [view, setView] = useState('month');
    const [filters, setFilters] = useState(
      Object.keys(EVENT_TYPES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    const [showMyEvents, setShowMyEvents] = useState(false);
    // FIX: Se obtiene el usuario actual desde el hook de autenticación.
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
                    title: isOverdue ? `(Vencida) ${t.title}` : t.title, 
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
          events.push({ id: `sr-${s.id}`, title: `Muestra: ${s.name}`, start: new Date(s.requestDate), type: 'sampleRequest', link: '/hubs/samples', data: s });
        });
        
        purchaseOrders?.forEach(po => events.push({ id: `po-${po.id}`, title: `OC: ${po.id}`, start: new Date(po.createdAt), type: 'purchaseOrder', link: '/purchase/orders', data: po }));
        
        birthdays?.forEach(b => {
            const [year, month, day] = b.date.split('-').map(Number);
            // Create birthday for current year context to show up in calendar
            // Note: In a real app, handle leap years properly
            const currentYearBirthday = new Date(currentDate.getFullYear(), month - 1, day);
            events.push({
                id: `b-${b.id}`,
                title: `Cumpleaños de ${b.name}`,
                start: currentYearBirthday,
                type: 'birthday',
                link: '/profile', // Placeholder link
                data: b
            });
        });
        
        return events.sort((a,b) => a.start.getTime() - b.start.getTime());
    }, [localTasks, deliveries, prospects, samples, purchaseOrders, companies, birthdays, currentDate]);

    const filteredEvents = useMemo(() => {
        // FIX: Se comprueba que currentUser exista antes de filtrar.
        if (!currentUser) return [];
        return allEvents.filter(event => {
            const typeMatch = filters[event.type];
            if (!typeMatch) return false;

            if (showMyEvents) {
                switch(event.type) {
                    case 'task':
                        return (event.data as Task).assignees.includes(currentUser.id) || (event.data as Task).watchers.includes(currentUser.id);
                    case 'prospectAction':
                        return (event.data as Prospect).ownerId === currentUser.id;
                    case 'delivery':
                        return currentUser.role === 'Logística';
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
    }, [allEvents, filters, showMyEvents, currentUser]);
    
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

    const loading = tasksLoading || delLoading || pLoading || sLoading || poLoading || cLoading || bLoading;

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
                <div className="grid grid-cols-7 text-center py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => ( 
                        <div key={day} className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{day}</div> 
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 bg-slate-100 dark:bg-slate-900 gap-px border-b border-slate-200 dark:border-slate-700">
                   {calendarDays.map(({ key, date, isCurrentMonth }) => {
                       const dayEvents = date ? filteredEvents.filter(e => e.start.toDateString() === date.toDateString()) : [];
                       const isToday = date?.toDateString() === new Date().toDateString();
                       
                       return (
                           <div key={key} className={`bg-white dark:bg-slate-800 min-h-[100px] relative group transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                                {date && (
                                    <div className="p-2">
                                        <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-all
                                            ${isToday 
                                                ? 'bg-indigo-600 text-white shadow-md scale-110' 
                                                : isCurrentMonth ? 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-700' : 'text-slate-400 dark:text-slate-600'}
                                        `}>
                                            {date.getDate()}
                                        </div>
                                        
                                        <div className="space-y-1 mt-1">
                                            {dayEvents.slice(0, 4).map(event => {
                                                const eventConfig = EVENT_TYPES[event.type];
                                                return (
                                                    <Link 
                                                        to={event.link} 
                                                        key={event.id} 
                                                        className={`block text-[10px] font-medium px-1.5 py-0.5 rounded border truncate transition-all hover:scale-[1.02] hover:shadow-sm
                                                            ${event.isOverdue 
                                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' 
                                                                : `bg-white dark:bg-slate-700 ${eventConfig.textColor} ${eventConfig.borderColor} dark:border-opacity-50`}
                                                        `}
                                                        title={event.title}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined !text-[10px]">{eventConfig.icon}</span>
                                                            <span className="truncate">{event.title}</span>
                                                        </div>
                                                    </Link>
                                                )
                                            })}
                                            {dayEvents.length > 4 && (
                                                <p className="text-[10px] font-bold text-slate-400 pl-1 hover:text-indigo-600 cursor-pointer">
                                                    + {dayEvents.length - 4} más...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                <div className="grid grid-cols-7 text-center border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
                    {days.map(day => {
                        const isToday = day.toDateString() === now.toDateString();
                        return ( 
                            <div key={day.toISOString()} className={`py-3 border-r border-slate-100 dark:border-slate-700 last:border-0 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                <p className={`text-xs font-bold uppercase mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {day.toLocaleDateString('es-ES', {weekday: 'short'})}
                                </p>
                                <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
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
                            <div key={day.toISOString()} className={`border-r border-slate-200 dark:border-slate-700 p-2 space-y-2 relative ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''}`}>
                                {dayEvents.map(event => {
                                     const eventConfig = EVENT_TYPES[event.type];
                                     return (
                                        <Link 
                                            to={event.link} 
                                            key={event.id} 
                                            className={`block p-2 rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md
                                                ${event.isOverdue 
                                                    ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' 
                                                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'}
                                            `}
                                        >
                                            <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${eventConfig.textColor}`}>
                                                <span className="material-symbols-outlined !text-xs">{eventConfig.icon}</span>
                                                {eventConfig.label}
                                            </div>
                                            <p className="text-xs font-medium line-clamp-2">{event.title}</p>
                                            <p className="text-[10px] opacity-70 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[10px]">schedule</span>
                                                {event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                            </p>
                                        </Link>
                                     )
                                })}
                                {isToday && <TimeIndicator now={now} view="week" />}
                                {dayEvents.length === 0 && !isToday && (
                                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>
                                )}
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
         const pastEvents = isToday ? dayEvents.filter(e => e.start <= now) : dayEvents;
         const futureEvents = isToday ? dayEvents.filter(e => e.start > now) : [];

         const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
            const borderClass = event.isOverdue ? 'border-l-4 border-red-500' : `border-l-4 ${eventConfig.borderColor}`;
            
            return (
                <Link 
                    to={event.link} 
                    key={event.id} 
                    className={`flex items-start gap-4 p-4 rounded-r-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all border-y border-r border-slate-100 dark:border-slate-700 ${borderClass}`}
                >
                    <div className="w-20 text-right">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    <div className="flex-1">
                        <div className={`text-xs font-bold uppercase mb-1 flex items-center gap-1 ${eventConfig.textColor}`}>
                             <span className="material-symbols-outlined !text-sm">{eventConfig.icon}</span>
                             {eventConfig.label}
                        </div>
                        <p className={`font-semibold text-base ${event.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{event.title}</p>
                    </div>
                </Link>
            )
         }

         return (
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                 <div className="max-w-3xl mx-auto space-y-3">
                    {pastEvents.map(renderEvent)}
                    {isToday && <TimeIndicator now={now} view="list" />}
                    {futureEvents.map(renderEvent)}
                    
                    {dayEvents.length === 0 && (
                        <div className="text-center py-20 opacity-60">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-slate-400">event_busy</span>
                            </div>
                            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Sin eventos para este día</h3>
                            <p className="text-sm text-slate-500">¡Disfruta tu tiempo libre o planifica nuevas tareas!</p>
                        </div>
                    )}
                 </div>
             </div>
         );
    };
    
    const ListView = () => {
        const pastEvents = filteredEvents.filter(e => e.start <= now);
        const futureEvents = filteredEvents.filter(e => e.start > now);

        const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
            return (
                <Link to={event.link} key={event.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm ${event.isOverdue ? 'bg-red-500' : eventConfig.color}`}>
                        <span className="material-symbols-outlined">{eventConfig.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                         <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">{event.title}</p>
                         <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-xs">event</span> {event.start.toLocaleDateString()}</span>
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-xs">schedule</span> {event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                         </div>
                    </div>
                    <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${eventConfig.textColor} ${eventConfig.borderColor} bg-white dark:bg-slate-800`}>
                            {eventConfig.label}
                        </span>
                    </div>
                </Link>
            )
        }

        return (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-4xl mx-auto space-y-3">
                     {pastEvents.map(renderEvent)}
                     <TimeIndicator now={now} view="list" />
                     {futureEvents.map(renderEvent)}
                     {filteredEvents.length === 0 && (
                        <div className="text-center py-10">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">filter_list_off</span>
                            <p className="text-slate-500 dark:text-slate-400">No hay eventos que coincidan con los filtros.</p>
                        </div>
                     )}
                </div>
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
            <div className="flex gap-6 h-[calc(100vh-100px)]">
                {/* Sidebar */}
                <div className="w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <button onClick={() => setIsDrawerOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all active:scale-95">
                        <span className="material-symbols-outlined">add_circle</span>
                        Añadir Evento
                    </button>
                    
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="my-events-toggle" className="font-bold text-sm text-slate-700 dark:text-slate-200">Solo mis eventos</label>
                            <button type="button" onClick={() => setShowMyEvents(!showMyEvents)} className={`${showMyEvents ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex items-center h-5 rounded-full w-9 transition-colors shadow-inner`}>
                                <span className={`${showMyEvents ? 'translate-x-4' : 'translate-x-1'} inline-block w-3 h-3 transform bg-white rounded-full transition-transform shadow-sm`}/>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Filtra para ver únicamente tareas y citas asignadas a ti.</p>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">filter_alt</span> Filtros de Calendario
                      </h3>
                      <div className="space-y-2">
                          {Object.entries(EVENT_TYPES).map(([key, {label, color, icon, selectedBg, selectedText}]) => {
                            const isSelected = filters[key as keyof typeof filters];
                            // Count events for this type
                            const count = allEvents.filter(e => e.type === key).length;
                            
                            return (
                              <button 
                                key={key} 
                                onClick={() => setFilters(f => ({...f, [key]: !f[key as keyof typeof filters]}))}
                                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 border ${isSelected ? `${selectedBg} ${selectedText} border-transparent shadow-sm` : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined !text-lg">{icon}</span>
                                    <span className="text-sm font-medium">{label}</span>
                                </div>
                                {count > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-600'}`}>{count}</span>
                                )}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                    
                    <div className="mt-auto p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-center">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{filteredEvents.length}</span>
                        <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Eventos visibles</p>
                    </div>
                </div>

                {/* Main Calendar */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                                <button onClick={handlePrev} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md shadow-sm transition-all text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined !text-lg">chevron_left</span></button>
                                <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-all">Hoy</button>
                                <button onClick={handleNext} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md shadow-sm transition-all text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined !text-lg">chevron_right</span></button>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{headerTitle}</h2>
                        </div>
                        
                         <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                            {[{id: 'month', label: 'Mes'}, {id: 'week', label: 'Semana'}, {id: 'day', label: 'Día'}, {id: 'list', label: 'Agenda'}].map(v => (
                              <button 
                                key={v.id} 
                                onClick={() => setView(v.id)} 
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${view === v.id ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                              >
                                  {v.label}
                              </button>
                            ))}
                        </div>
                    </div>
                    
                    {renderView()}

                </div>
            </div>
            <EventDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleAddTask} />
        </>
    );
};

export default CalendarPage;
