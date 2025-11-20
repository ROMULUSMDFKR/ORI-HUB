import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Prospect, ProspectStage, Task, MotivationalQuote, SalesOrder, SalesOrderStatus, Company, User } from '../types';
import AiAssistantWidget from '../components/dashboard/AiAssistantWidget';
import CustomSelect from '../components/ui/CustomSelect';
import { useCollection } from '../hooks/useCollection';
import Spinner from '../components/ui/Spinner';


// --- New KPI Card Components ---

interface DashboardPageProps {
    user: User;
}

const WavyBg: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full opacity-10">
      <path d="M-50,20 C100,100 200,-50 350,50 L350,150 L-50,150 Z" fill="currentColor" />
      <path d="M-50,50 C100,-50 200,100 350,20 L350,150 L-50,150 Z" fill="currentColor" opacity="0.5"/>
    </svg>
);

const MiniChart: React.FC<{ data: number[], isPrimary: boolean }> = ({ data, isPrimary }) => {
    const maxVal = Math.max(...data);
    return (
        <div className="absolute bottom-5 right-5 flex items-end h-12 w-24 gap-1">
            {data.map((val, index) => (
                <div 
                    key={index} 
                    className={`${isPrimary ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-600'} rounded-t-sm w-full transition-all duration-500 ease-in-out`}
                    style={{ height: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%` }}
                ></div>
            ))}
        </div>
    );
};

const StyledKpiCard: React.FC<{
    title: string;
    value: string;
    change: number;
    chartData: number[];
    variant?: 'primary' | 'default';
    className?: string;
}> = ({ title, value, change, chartData, variant = 'default', className = '' }) => {
    const isPositive = change >= 0;
    const [period, setPeriod] = useState('monthly');
    const containerClasses = variant === 'primary' 
        ? 'bg-indigo-600 text-white p-6 rounded-xl relative overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1' 
        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-6 rounded-xl relative overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-slate-200 dark:border-slate-700';
    
    const kpiSelectOptions = [
      { value: 'monthly', name: 'Mensual' },
      { value: 'semiannual', name: 'Semestral' },
      { value: 'annual', name: 'Anual' }
    ];

    return (
        <div className={`${containerClasses} ${className}`}>
            {variant === 'primary' && <div className="text-white"><WavyBg /></div>}
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <h3 className={`text-base font-semibold ${variant === 'primary' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
                     <CustomSelect 
                      options={kpiSelectOptions}
                      value={period}
                      onChange={setPeriod}
                      buttonClassName={`w-auto text-xs font-medium rounded-md px-2 py-1 border-none focus:ring-0 appearance-none ${variant === 'primary' ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                      dropdownClassName="w-32"
                    />
                </div>
                <p className="text-4xl font-bold mt-2">{value}</p>
                <p className={`text-sm mt-4 flex items-center gap-1 ${isPositive ? (variant === 'primary' ? 'text-green-300' : 'text-green-600 dark:text-green-400') : (variant === 'primary' ? 'text-red-300' : 'text-red-600 dark:text-red-400')}`}>
                    <span className="material-symbols-outlined text-base">{isPositive ? 'trending_up' : 'trending_down'}</span>
                    <span className="font-semibold">{isPositive ? '+' : ''}{change.toFixed(1)}%</span> vs. mes anterior
                </p>
                <MiniChart data={chartData} isPrimary={variant === 'primary'} />
            </div>
        </div>
    );
};

const SmallKpiCard: React.FC<{ title: string; value: string; icon: string; linkTo: string; className?: string }> = ({ title, value, icon, linkTo, className = '' }) => (
  <Link to={linkTo} className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-slate-200 dark:border-slate-700 flex items-center justify-between group ${className}`}>
    <div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
    </div>
    <span className="material-symbols-outlined text-4xl text-indigo-300 dark:text-indigo-700/80 group-hover:text-indigo-500 transition-colors">{icon}</span>
  </Link>
);

const MyWorkList: React.FC<{ tasks: Task[] }> = ({ tasks }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md h-full border border-slate-200 dark:border-slate-700 flex flex-col">
      <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Mi Trabajo Hoy</h3>
      <ul className="space-y-2 flex-1 overflow-y-auto pr-2 -mr-2">
        {tasks.length > 0 ? tasks.map(task => (
          <li key={task.id}>
              <Link to={`/tasks/${task.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50">
              <div className="flex items-center">
                  <span className={`material-symbols-outlined text-xl mr-3 ${task.status === 'Hecho' ? 'text-green-500' : 'text-slate-400'}`}>
                  {task.status === 'Hecho' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <p className={`text-sm font-medium ${task.status === 'Hecho' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
              </div>
              { task.dueAt && <span className="text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full">Hoy</span>}
              </Link>
          </li>
        )) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center h-full">
              <span className="material-symbols-outlined text-5xl text-green-500">task_alt</span>
              <p className="font-semibold mt-4 text-slate-800 dark:text-slate-200">¡Todo al día!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No tienes tareas programadas para hoy.</p>
          </div>
        )}
      </ul>
      <div className="mt-4">
        <Link to="/tasks/new" className="w-full text-center bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold py-2.5 rounded-lg flex items-center justify-center text-sm hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors">
          <span className="material-symbols-outlined mr-2 !text-base">add</span>
          Nueva Tarea Rápida
        </Link>
      </div>
    </div>
  );

const ActiveDeliveries: React.FC<{ salesOrders: SalesOrder[], companies: Company[] }> = ({ salesOrders, companies }) => {
    const activeOrders = useMemo(() => salesOrders.filter(
        o => o.status === SalesOrderStatus.EnPreparacion || o.status === SalesOrderStatus.EnTransito
    ), [salesOrders]);

    const companiesMap = useMemo(() => new Map(companies.map(c => [c.id, c.shortName || c.name])), [companies]);

    const getStatusInfo = (status: SalesOrderStatus) => {
        switch (status) {
            case SalesOrderStatus.EnPreparacion:
                return { text: "En Preparación", color: "bg-yellow-500", progress: 25 };
            case SalesOrderStatus.EnTransito:
                return { text: "En Tránsito", color: "bg-blue-500", progress: 75 };
            default:
                return { text: "Pendiente", color: "bg-gray-500", progress: 0 };
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md h-full border border-slate-200 dark:border-slate-700 flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Seguimiento de Entregas Activas</h3>
            {activeOrders.length > 0 ? (
                <ul className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2">
                    {activeOrders.map(order => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                            <li key={order.id}>
                                <Link to={`/hubs/sales-orders/${order.id}`} className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">{order.id}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{companiesMap.get(order.companyId) || 'N/A'}</p>
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span>{statusInfo.text}</span>
                                            <span>{statusInfo.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                            <div className={`${statusInfo.color} h-1.5 rounded-full`} style={{ width: `${statusInfo.progress}%` }}></div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center">
                     <span className="material-symbols-outlined text-4xl text-slate-400">local_shipping</span>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No hay entregas activas en este momento.</p>
                 </div>
            )}
        </div>
    );
};


const PipelineSummary: React.FC<{prospects: Prospect[]}> = ({prospects}) => {
    const stageCounts = useMemo(() => {
        return prospects.reduce((acc, prospect) => {
            acc[prospect.stage] = (acc[prospect.stage] || 0) + 1;
            return acc;
        }, {} as Record<ProspectStage, number>);
    }, [prospects]);
    
    const totalProspects = prospects.length;

    const summaryStages = [
        ProspectStage.Nueva,
        ProspectStage.Contactado,
        ProspectStage.Calificado,
        ProspectStage.Propuesta,
        ProspectStage.Negociacion
    ];

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Resumen de Pipeline de Prospectos</h3>
                <Link to="/hubs/prospects" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todo</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center">
                {summaryStages.map(stage => {
                    const count = stageCounts[stage] || 0;
                    const percentage = totalProspects > 0 ? (count / totalProspects) * 100 : 0;
                     return (
                         <div key={stage} className="flex flex-col items-center">
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{count}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stage}</p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                                <div className="bg-indigo-500 h-1 rounded-full" style={{width: `${percentage}%`}}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


const DashboardPage: React.FC<DashboardPageProps> = ({ user: currentUser }) => {
    const { data: quotes } = useCollection<MotivationalQuote>('motivationalQuotes');
    const { data: allTasks, loading: tLoading } = useCollection<Task>('tasks');
    const { data: allProspects, loading: pLoading } = useCollection<Prospect>('prospects');
    const { data: allSalesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');
    const { data: allCompanies, loading: cLoading } = useCollection<Company>('companies');
    
    const loading = tLoading || pLoading || soLoading || cLoading;

    const greetingInfo = useMemo(() => {
        const hour = new Date().getHours();
        let timeOfDay: 'morning' | 'afternoon' | 'evening';
        let greeting: string;

        if (hour >= 5 && hour < 12) {
            timeOfDay = 'morning';
            greeting = 'Buenos días';
        } else if (hour >= 12 && hour < 20) {
            timeOfDay = 'afternoon';
            greeting = 'Buenas tardes';
        } else {
            timeOfDay = 'evening';
            greeting = 'Buenas noches';
        }
        
        if (!quotes) {
            return { greeting, quote: '¡Que tengas un día productivo!' };
        }

        const userRole = currentUser.role;

        const roleSpecificQuotes = quotes.filter(q => 
            q.timeOfDay.includes(timeOfDay) && q.roles.includes(userRole)
        );
        
        const generalQuotes = quotes.filter(q => 
            q.timeOfDay.includes(timeOfDay) && q.roles.includes('General')
        );

        const applicableQuotes = roleSpecificQuotes.length > 0 ? roleSpecificQuotes : generalQuotes;

        if (applicableQuotes.length === 0) {
            return { greeting, quote: '¡Que tengas un día productivo!' };
        }
        
        const quoteIndex = Math.floor(Math.random() * applicableQuotes.length);
        const selectedQuote = applicableQuotes[quoteIndex];

        return { greeting, quote: selectedQuote.text };

    }, [quotes, currentUser.role]);


    const { totalRevenue, revenueChange, revenueChartData } = useMemo(() => {
        const sales = allSalesOrders || [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const salesCurrentMonth = sales.filter(o => {
            const date = new Date(o.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, o) => sum + o.total, 0);

        const prevMonthDate = new Date(today);
        prevMonthDate.setMonth(today.getMonth() - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const salesPrevMonth = sales.filter(o => {
            const date = new Date(o.createdAt);
            return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
        }).reduce((sum, o) => sum + o.total, 0);

        const change = salesPrevMonth > 0 ? ((salesCurrentMonth - salesPrevMonth) / salesPrevMonth) * 100 : (salesCurrentMonth > 0 ? 100 : 0);
        
        const chartData = [15000, 25000, 20000, 40000, 35000, salesCurrentMonth > 0 ? salesCurrentMonth : 30000];

        return {
            totalRevenue: salesCurrentMonth,
            revenueChange: change,
            revenueChartData: chartData,
        };
    }, [allSalesOrders]);

    const { newProspects, prospectsChange, prospectsChartData } = useMemo(() => {
        const prospects = allProspects || [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const prospectsCurrentMonth = prospects.filter(p => {
            const date = new Date(p.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        
        const prevMonthDate = new Date(today);
        prevMonthDate.setMonth(today.getMonth() - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const prospectsPrevMonth = prospects.filter(p => {
            const date = new Date(p.createdAt);
            return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
        }).length;

        const change = prospectsPrevMonth > 0 ? ((prospectsCurrentMonth - prospectsPrevMonth) / prospectsPrevMonth) * 100 : (prospectsCurrentMonth > 0 ? 100 : 0);
        
        const chartData = [5, 8, 6, 12, 10, prospectsCurrentMonth > 0 ? prospectsCurrentMonth : 7];

        return {
            newProspects: prospectsCurrentMonth,
            prospectsChange: change,
            prospectsChartData: chartData,
        };
    }, [allProspects]);

  const tasksToday = useMemo(() => {
    if (!allTasks) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return allTasks.filter(task => {
        if (!task.dueAt) return false;
        const dueDate = new Date(task.dueAt);
        return dueDate >= today && dueDate < tomorrow;
    });
  }, [allTasks]);

  const today = new Date();
  const dateFormatted = {
    dayOfMonth: today.getDate(),
    dayOfWeek: today.toLocaleDateString('es-MX', { weekday: 'long' }),
    month: today.toLocaleDateString('es-MX', { month: 'long' }),
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spinner /></div>;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 dark:text-slate-400">{greetingInfo.quote}</p>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            {greetingInfo.greeting}, {currentUser.name.split(' ')[0]}! 👋
          </h1>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600">{dateFormatted.dayOfMonth}</div>
                <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{dateFormatted.dayOfWeek}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{dateFormatted.month}</p>
                </div>
            </div>
            <Link to="/tasks?view=mine" className="bg-indigo-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                Ver mis Tareas ({tasksToday.length})
            </Link>
        </div>
      </div>
      
      <AiAssistantWidget tasks={allTasks || []} prospects={allProspects || []} salesOrders={allSalesOrders || []} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(currentUser.role === 'Ventas' || currentUser.role === 'Admin') && (
              <StyledKpiCard
                  title="Ingresos del Mes"
                  value={`$${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  change={revenueChange}
                  chartData={revenueChartData}
                  variant="primary"
              />
          )}
          <StyledKpiCard
              title="Nuevos Prospectos (Mes)"
              value={newProspects.toString()}
              change={prospectsChange}
              chartData={prospectsChartData}
          />
          <SmallKpiCard title="Tareas para Hoy" value={tasksToday.length.toString()} icon="task_alt" linkTo="/tasks?view=mine" />
          <SmallKpiCard title="Entregas Programadas" value={(allSalesOrders || []).filter(o => o.status === SalesOrderStatus.EnPreparacion).length.toString()} icon="local_shipping" linkTo="/logistics/deliveries" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
              <MyWorkList tasks={tasksToday} />
          </div>
          <div className="lg:col-span-5">
              <ActiveDeliveries salesOrders={allSalesOrders || []} companies={allCompanies || []} />
          </div>
      </div>
      
      <div className="grid grid-cols-1">
          <PipelineSummary prospects={allProspects || []} />
      </div>
    </div>
  );
};

export default DashboardPage;