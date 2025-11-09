
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { Task, LogisticsDelivery, Prospect, Sample, PurchaseOrder, ActivityLog, Company, Quote } from '../types';
import Spinner from '../components/ui/Spinner';
import { getOverdueStatus } from '../utils/time';

const EVENT_TYPES = {
  task: { label: 'Tareas', color: 'bg-blue-500', textColor: 'text-blue-500', overdueColor: 'bg-red-500' },
  delivery: { label: 'Entregas', color: 'bg-green-500', textColor: 'text-green-500' },
  prospectAction: { label: 'Acciones Prospecto', color: 'bg-purple-500', textColor: 'text-purple-500' },
  sampleRequest: { label: 'Solicitud Muestras', color: 'bg-orange-500', textColor: 'text-orange-500' },
  sampleArrival: { label: 'Llegada Muestras', color: 'bg-cyan-500', textColor: 'text-cyan-500' },
  purchaseOrder: { label: 'Órdenes de Compra', color: 'bg-gray-500', textColor: 'text-gray-500' },
  quoteSent: { label: 'Cotizaciones Enviadas', color: 'bg-pink-500', textColor: 'text-pink-500' },
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  type: keyof typeof EVENT_TYPES;
  link: string;
  isOverdue?: boolean;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const CalendarPage: React.FC = () => {
    const { data: tasks, loading: tasksLoading } = useCollection<Task>('tasks');
    const { data: deliveries, loading: delLoading } = useCollection<LogisticsDelivery>('deliveries');
    const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: samples, loading: sLoading } = useCollection<Sample>('samples');
    const { data: purchaseOrders, loading: poLoading } = useCollection<PurchaseOrder>('purchaseOrders');
    const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [filters, setFilters] = useState(
      Object.keys(EVENT_TYPES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    const allEvents = useMemo<CalendarEvent[]>(() => {
        const events: CalendarEvent[] = [];

        tasks?.forEach(t => {
            if (t.dueAt) {
                const { isOverdue } = getOverdueStatus(t.dueAt, t.status);
                events.push({ 
                    id: `t-${t.id}`, 
                    title: isOverdue ? `[Vencida] ${t.title}` : t.title, 
                    start: new Date(t.dueAt), 
                    type: 'task', 
                    link: `/tasks/${t.id}`,
                    isOverdue 
                });
            }
        });
        
        deliveries?.forEach(d => events.push({ id: `d-${d.id}`, title: `Entrega a ${companies?.find(c => c.id === d.companyId)?.shortName || 'Cliente'}`, start: new Date(d.scheduledDate), type: 'delivery', link: `/logistics/deliveries` }));
        prospects?.forEach(p => p.nextAction?.dueDate && events.push({ id: `p-${p.id}`, title: p.nextAction.description, start: new Date(p.nextAction.dueDate), type: 'prospectAction', link: `/crm/prospects/${p.id}` }));
        
        samples?.forEach(s => {
          events.push({ id: `sr-${s.id}`, title: `Muestra: ${s.name}`, start: new Date(s.requestDate), type: 'sampleRequest', link: '/hubs/samples' });
          events.push({ id: `sa-${s.id}`, title: `Llegada Muestra: ${s.name}`, start: addDays(new Date(s.requestDate), 7), type: 'sampleArrival', link: '/hubs/samples' });
        });
        
        purchaseOrders?.forEach(po => events.push({ id: `po-${po.id}`, title: `OC: ${po.id}`, start: new Date(po.createdAt), type: 'purchaseOrder', link: '/purchase-orders' }));
        
        quotes?.forEach(q => {
             events.push({ id: `q-${q.id}`, title: `Cotización ${q.id}`, start: new Date(), type: 'quoteSent', link: '/hubs/quotes' });
        });
        
        return events.sort((a,b) => a.start.getTime() - b.start.getTime());
    }, [tasks, deliveries, prospects, samples, purchaseOrders, quotes, companies]);

    const filteredEvents = useMemo(() => allEvents.filter(event => filters[event.type]), [allEvents, filters]);
    
    // Calendar Grid logic
    const { year, month } = { year: currentDate.getFullYear(), month: currentDate.getMonth() };
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

    const loading = tasksLoading || delLoading || pLoading || sLoading || poLoading || qLoading || cLoading;

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner/></div>

    return (
        <div className="flex gap-6 h-[calc(100vh-120px)]">
            {/* Sidebar */}
            <div className="w-72 bg-surface rounded-xl shadow-sm p-4 flex flex-col gap-4">
                <button className="bg-primary text-on-primary font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-sm hover:opacity-90">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Añadir Evento
                </button>
                {/* Mini Calendar would go here */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Filtros de Eventos</h3>
                  <div className="space-y-2">
                      {Object.entries(EVENT_TYPES).map(([key, {label, color}]) => (
                          <div key={key} className="flex items-center">
                              <input 
                                id={`filter-${key}`} 
                                type="checkbox"
                                checked={filters[key as keyof typeof filters]}
                                onChange={() => setFilters(f => ({...f, [key]: !f[key as keyof typeof filters]}))}
                                className="h-4 w-4 rounded border-gray-300 focus:ring-0"
                                style={{ accentColor: `var(--color-primary)` }}
                              />
                              <label htmlFor={`filter-${key}`} className="ml-3 text-sm flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${color}`}></span>
                                {label}
                              </label>
                          </div>
                      ))}
                  </div>
                </div>
            </div>

            {/* Main Calendar */}
            <div className="flex-1 bg-surface rounded-xl shadow-sm flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 rounded-full hover:bg-background"><span className="material-symbols-outlined">chevron_left</span></button>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 rounded-full hover:bg-background"><span className="material-symbols-outlined">chevron_right</span></button>
                        <h2 className="text-xl font-bold ml-2">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                    </div>
                     <div className="flex items-center gap-1 bg-background p-1 rounded-lg">
                        {['Month', 'Week', 'Day', 'List'].map(v => (
                          <button key={v} onClick={() => setView(v.toLowerCase())} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === v.toLowerCase() ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-secondary'}`}>
                              {v}
                          </button>
                        ))}
                    </div>
                </div>
                
                 {view === 'month' && (
                    <>
                        <div className="grid grid-cols-7 text-center font-semibold text-sm border-b">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ( <div key={day} className="py-2">{day}</div> ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1">
                           {calendarDays.map(({ key, date, isCurrentMonth }) => {
                               const dayEvents = date ? filteredEvents.filter(e => e.start.toDateString() === date.toDateString()) : [];
                               const isToday = date?.toDateString() === new Date().toDateString();
                               return (
                                   <div key={key} className={`border-r border-b p-2 overflow-hidden ${!isCurrentMonth ? 'bg-background' : ''}`}>
                                        <div className={`text-sm text-right ${isToday ? 'bg-primary text-on-primary rounded-full w-6 h-6 flex items-center justify-center ml-auto font-bold' : ''}`}>
                                            {date?.getDate()}
                                        </div>
                                        <div className="space-y-1 mt-1">
                                            {dayEvents.slice(0, 2).map(event => {
                                                const eventConfig = EVENT_TYPES[event.type];
                                                const colorClass = event.isOverdue && eventConfig.overdueColor ? eventConfig.overdueColor : eventConfig.color;
                                                return (
                                                    <Link to={event.link} key={event.id} className={`block text-white text-xs p-1 rounded truncate ${colorClass}`}>
                                                        {event.title}
                                                    </Link>
                                                )
                                            })}
                                            {dayEvents.length > 2 && (
                                                <p className="text-xs font-semibold text-on-surface-secondary">+ {dayEvents.length - 2} más</p>
                                            )}
                                        </div>
                                   </div>
                               );
                           })}
                        </div>
                    </>
                )}
                {view !== 'month' && (
                  <div className="flex-1 flex items-center justify-center text-on-surface-secondary">
                      Vista de {view} próximamente.
                  </div>
                )}
            </div>
        </div>
    );
};

export default CalendarPage;
