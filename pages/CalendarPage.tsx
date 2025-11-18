import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, LogisticsDelivery, Prospect, Sample, PurchaseOrder, Quote, Company, Birthday } from '../types';
// FIX: Se eliminó la importación de datos falsos.
import Spinner from '../components/ui/Spinner';
import { getOverdueStatus } from '../utils/time';
import EventDrawer from '../components/calendar/EventDrawer';
import { useAuth } from '../hooks/useAuth';

const EVENT_TYPES = {
  task: { label: 'Tareas', color: 'bg-blue-500', textColor: 'text-blue-500', borderColor: 'border-blue-500', selectedBg: 'bg-blue-500', selectedText: 'text-white' },
  delivery: { label: 'Entregas', color: 'bg-green-500', textColor: 'text-green-500', borderColor: 'border-green-500', selectedBg: 'bg-green-500', selectedText: 'text-white' },
  prospectAction: { label: 'Acciones Prospecto', color: 'bg-purple-500', textColor: 'text-purple-500', borderColor: 'border-purple-500', selectedBg: 'bg-purple-500', selectedText: 'text-white' },
  sampleRequest: { label: 'Muestras', color: 'bg-orange-500', textColor: 'text-orange-500', borderColor: 'border-orange-500', selectedBg: 'bg-orange-500', selectedText: 'text-white' },
  purchaseOrder: { label: 'Órdenes de Compra', color: 'bg-gray-500', textColor: 'text-gray-500', borderColor: 'border-gray-500', selectedBg: 'bg-gray-500', selectedText: 'text-white' },
  birthday: { label: 'Cumpleaños', color: 'bg-pink-500', textColor: 'text-pink-500', borderColor: 'border-pink-500', selectedBg: 'bg-pink-500', selectedText: 'text-white' },
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
            <div className="relative h-0 my-2 w-full flex items-center">
              <div className="absolute left-0 w-full border-t-2 border-red-500 border-dashed"></div>
              <span className="absolute left-0 -top-2 text-xs font-semibold text-red-500 bg-white dark:bg-slate-800 pr-2 z-10">
                {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
        );
    }
    // Week view style
    return (
        <div className="relative my-2 w-full h-px bg-red-500">
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500"></div>
            <span className="absolute -left-14 -top-2 text-xs font-semibold text-red-500 bg-white dark:bg-slate-800 pr-1 z-10">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    );
};

const CalendarPage: React.FC = () => {
    const { data: tasks, loading: tasksLoading } = useCollection<Task>('tasks');
    const { data: deliveries, loading: delLoading } = useCollection<LogisticsDelivery>('deliveries');
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
        prospects?.forEach(p => p.nextAction?.dueDate && events.push({ id: `p-${p.id}`, title: p.nextAction.description, start: new Date(p.nextAction.dueDate), type: 'prospectAction', link: `/crm/prospects/${p.id}`, data: p }));
        
        samples?.forEach(s => {
          events.push({ id: `sr-${s.id}`, title: `Muestra: ${s.name}`, start: new Date(s.requestDate), type: 'sampleRequest', link: '/hubs/samples', data: s });
        });
        
        purchaseOrders?.forEach(po => events.push({ id: `po-${po.id}`, title: `OC: ${po.id}`, start: new Date(po.createdAt), type: 'purchaseOrder', link: '/purchase-orders', data: po }));
        
        birthdays?.forEach(b => {
            const [year, month, day] = b.date.split('-').map(Number);
            const eventDate = new Date(currentDate.getFullYear(), month - 1, day);
            events.push({
                id: `b-${b.id}`,
                title: `Cumpleaños de ${b.name}`,
                start: eventDate,
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
                <div className="grid grid-cols-7 text-center font-semibold text-sm border-b border-slate-200 dark:border-slate-700">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => ( <div key={day} className="py-2">{day}</div> ))}
                </div>
                <div className="grid grid-cols-7 flex-1">
                   {calendarDays.map(({ key, date, isCurrentMonth }) => {
                       const dayEvents = date ? filteredEvents.filter(e => e.start.toDateString() === date.toDateString()) : [];
                       const isToday = date?.toDateString() === new Date().toDateString();
                       return (
                           <div key={key} className={`border-r border-b border-slate-200 dark:border-slate-700 p-2 overflow-hidden ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                                <div className={`text-sm text-right ${isToday ? 'bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center ml-auto font-bold' : ''}`}>
                                    {date?.getDate()}
                                </div>
                                <div className="space-y-1 mt-1 overflow-y-auto" style={{maxHeight: '80px'}}>
                                    {dayEvents.slice(0, 3).map(event => {
                                        const eventConfig = EVENT_TYPES[event.type];
                                        const colorClass = event.isOverdue ? 'bg-red-500' : eventConfig.color;
                                        return (
                                            <Link to={event.link} key={event.id} className={`block text-white text-xs p-1 rounded truncate ${colorClass}`}>
                                                {event.title}
                                            </Link>
                                        )
                                    })}
                                    {dayEvents.length > 3 && (
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">+ {dayEvents.length - 3} más</p>
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
                <div className="grid grid-cols-7 text-center font-semibold text-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    {days.map(day => ( <div key={day.toISOString()} className={`py-2 ${day.toDateString() === now.toDateString() ? 'text-indigo-600' : ''}`}>{day.toLocaleDateString('es-ES', {weekday: 'short'})} {day.getDate()}</div> ))}
                </div>
                <div className="grid grid-cols-7">
                    {days.map(day => {
                        const dayEvents = filteredEvents.filter(e => e.start.toDateString() === day.toDateString());
                        const isToday = day.toDateString() === now.toDateString();
                        const pastEvents = isToday ? dayEvents.filter(e => e.start <= now) : dayEvents;
                        const futureEvents = isToday ? dayEvents.filter(e => e.start > now) : [];
                        return (
                            <div key={day.toISOString()} className={`border-r border-slate-200 dark:border-slate-700 p-2 space-y-2 min-h-[100px] relative ${isToday ? 'bg-indigo-500/5' : ''}`}>
                                {pastEvents.map(event => {
                                     const eventConfig = EVENT_TYPES[event.type];
                                     const colorClass = event.isOverdue ? 'bg-red-500' : eventConfig.color;
                                     return (
                                        <Link to={event.link} key={event.id} className={`block text-white text-xs p-1.5 rounded truncate ${colorClass}`}>
                                            <p>{event.title}</p>
                                            <p className="opacity-75">{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                        </Link>
                                     )
                                })}
                                {isToday && <TimeIndicator now={now} view="week" />}
                                {futureEvents.map(event => {
                                     const eventConfig = EVENT_TYPES[event.type];
                                     const colorClass = event.isOverdue ? 'bg-red-500' : eventConfig.color;
                                     return (
                                        <Link to={event.link} key={event.id} className={`block text-white text-xs p-1.5 rounded truncate ${colorClass}`}>
                                            <p>{event.title}</p>
                                            <p className="opacity-75">{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
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
         const pastEvents = isToday ? dayEvents.filter(e => e.start <= now) : dayEvents;
         const futureEvents = isToday ? dayEvents.filter(e => e.start > now) : [];

         const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
            const colorClass = event.isOverdue ? 'bg-red-100 dark:bg-red-500/10 border-red-500' : `${eventConfig.color.replace('bg-', 'bg-')}/10 border-${eventConfig.color.split('-')[1]}-500`;
            return (
                <Link to={event.link} key={event.id} className={`flex items-start gap-4 p-3 rounded-lg border-l-4 ${colorClass}`}>
                    <div className="w-20 text-sm font-semibold">{event.start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    <div className="flex-1">
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-xs"><span className={`font-semibold ${eventConfig.textColor}`}>{eventConfig.label}</span></p>
                    </div>
                </Link>
            )
         }

         return (
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {pastEvents.map(renderEvent)}
                 {isToday && <TimeIndicator now={now} view="list" />}
                 {futureEvents.map(renderEvent)}
                 {dayEvents.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 pt-10">No hay eventos para este día.</p>}
             </div>
         );
    };
    
    const ListView = () => {
        const pastEvents = filteredEvents.filter(e => e.start <= now);
        const futureEvents = filteredEvents.filter(e => e.start > now);

        const renderEvent = (event: CalendarEvent) => {
            const eventConfig = EVENT_TYPES[event.type];
            const colorClass = event.isOverdue ? 'bg-red-100 dark:bg-red-500/10 border-red-500' : `${eventConfig.color.replace('bg-', 'bg-')}/10 border-${eventConfig.color.split('-')[1]}-500`;
            return (
                <Link to={event.link} key={event.id} className={`flex items-start gap-4 p-3 rounded-lg border-l-4 ${colorClass}`}>
                    <div className="w-32 text-sm font-semibold">{event.start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    <div className="flex-1">
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-xs"><span className={`font-semibold ${eventConfig.textColor}`}>{eventConfig.label}</span></p>
                    </div>
                </Link>
            )
        }

        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {pastEvents.map(renderEvent)}
                 <TimeIndicator now={now} view="list" />
                 {futureEvents.map(renderEvent)}
                 {filteredEvents.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 pt-10">No hay eventos que coincidan con los filtros.</p>}
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
            <div className="flex gap-6 h-[calc(100vh-120px)]">
                {/* Sidebar */}
                <div className="w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-col gap-6">
                    <button onClick={() => setIsDrawerOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90">
                        <span className="material-symbols-outlined mr-2">add</span>
                        Añadir Evento
                    </button>
                    
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <label htmlFor="my-events-toggle" className="font-semibold text-sm text-slate-800 dark:text-slate-200">Mis Eventos</label>
                        <button type="button" onClick={() => setShowMyEvents(!showMyEvents)} className={`${showMyEvents ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                            <span className={`${showMyEvents ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                        </button>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Filtros de Eventos</h3>
                      <div className="flex flex-wrap gap-2">
                          {Object.entries(EVENT_TYPES).map(([key, {label, color, borderColor, selectedBg, selectedText, textColor}]) => {
                            const isSelected = filters[key as keyof typeof filters];
                            return (
                              <button 
                                key={key} 
                                onClick={() => setFilters(f => ({...f, [key]: !f[key as keyof typeof filters]}))}
                                className={`px-3 py-1 text-sm font-medium rounded-full border-2 transition-colors ${isSelected ? `${selectedBg} ${selectedText} ${borderColor}` : `bg-white dark:bg-slate-800 ${textColor} ${borderColor}`}`}
                              >
                                {label}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                </div>

                {/* Main Calendar */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrev} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><span className="material-symbols-outlined">chevron_left</span></button>
                            <button onClick={handleNext} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><span className="material-symbols-outlined">chevron_right</span></button>
                            <h2 className="text-xl font-bold ml-2 text-slate-800 dark:text-slate-200">{headerTitle}</h2>
                        </div>
                         <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            {[{id: 'month', label: 'Mes'}, {id: 'week', label: 'Semana'}, {id: 'day', label: 'Día'}, {id: 'list', label: 'Lista'}].map(v => (
                              <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === v.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}`}>
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