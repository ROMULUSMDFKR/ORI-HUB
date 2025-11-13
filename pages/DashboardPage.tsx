import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_PROSPECTS, MOCK_TASKS, MOCK_SALES_ORDERS } from '../data/mockData';
import { Prospect, ProspectStage, Task } from '../types';
import AiAssistantWidget from '../components/dashboard/AiAssistantWidget';


// --- New KPI Card Components ---

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
                    className={`${isPrimary ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-600'} rounded-t-sm w-full transition-all duration-500 ease-in-out`}
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
}> = ({ title, value, change, chartData, variant = 'default' }) => {
    const isPositive = change >= 0;
    const containerClasses = variant === 'primary' 
        ? 'bg-indigo-600 text-white p-5 rounded-xl relative overflow-hidden shadow-lg' 
        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700';
    
    return (
        <div className={containerClasses}>
            {variant === 'primary' && <div className="text-white"><WavyBg /></div>}
            <div className="relative z-10">
                <div className="flex justify-between items-center">
                    <h3 className={`text-base font-semibold ${variant === 'primary' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
                    <select className="bg-transparent text-xs rounded-md px-2 py-1 border-none focus:ring-0 appearance-none dark:bg-slate-700/50 bg-slate-50" style={{backgroundColor: variant === 'primary' ? 'rgba(255,255,255,0.1)' : undefined, color: variant === 'primary' ? 'white' : 'inherit'}}>
                        <option className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Mensual</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Semestral</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Anual</option>
                    </select>
                </div>
                <p className="text-4xl font-bold mt-2">{value}</p>
                <p className={`text-sm mt-4 ${isPositive ? (variant === 'primary' ? 'text-green-300' : 'text-green-600 dark:text-green-400') : (variant === 'primary' ? 'text-red-300' : 'text-red-600 dark:text-red-400')}`}>
                    <span className="font-semibold">{isPositive ? '+' : ''}{change.toFixed(1)}%</span> mes anterior
                </p>
                <MiniChart data={chartData} isPrimary={variant === 'primary'} />
            </div>
        </div>
    );
};

const SmallKpiCard: React.FC<{ title: string; value: string; icon: string; linkTo: string; }> = ({ title, value, icon, linkTo }) => (
  <Link to={linkTo} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
    </div>
    <span className="material-symbols-outlined text-3xl text-indigo-500/70 dark:text-indigo-500/70">{icon}</span>
  </Link>
);


const MyWorkList: React.FC<{ tasks: Task[] }> = ({ tasks }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm h-full border border-slate-200 dark:border-slate-700">
    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Mi Trabajo Hoy</h3>
    <ul className="space-y-3">
      {tasks.map(task => (
        <li key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
          <div className="flex items-center">
            <span className={`material-symbols-outlined text-lg mr-3 ${task.status === 'Por Hacer' ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {task.status === 'Por Hacer' ? 'radio_button_unchecked' : 'check_circle'}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
            </div>
          </div>
          <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded-full">Hoy</span>
        </li>
      ))}
    </ul>
  </div>
);

const PipelineSummary: React.FC<{prospects: Prospect[]}> = ({prospects}) => {
    const stageCounts = prospects.reduce((acc, prospect) => {
        acc[prospect.stage] = (acc[prospect.stage] || 0) + 1;
        return acc;
    }, {} as Record<ProspectStage, number>);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Resumen de Pipeline</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                {Object.values(ProspectStage).slice(0, 5).map(stage => (
                     <div key={stage}>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stageCounts[stage] || 0}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{stage}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}


const DashboardPage: React.FC = () => {
    const { totalRevenue, revenueChange, revenueChartData } = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const salesCurrentMonth = MOCK_SALES_ORDERS.filter(o => {
            const date = new Date(o.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, o) => sum + o.total, 0);

        const prevMonthDate = new Date(today);
        prevMonthDate.setMonth(today.getMonth() - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const salesPrevMonth = MOCK_SALES_ORDERS.filter(o => {
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
    }, []);

    const { newProspects, prospectsChange, prospectsChartData } = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const prospectsCurrentMonth = MOCK_PROSPECTS.filter(p => {
            const date = new Date(p.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        
        const prevMonthDate = new Date(today);
        prevMonthDate.setMonth(today.getMonth() - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const prospectsPrevMonth = MOCK_PROSPECTS.filter(p => {
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
    }, []);

  const tasksToday = MOCK_TASKS.length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Hoy</h2>

      <AiAssistantWidget tasks={MOCK_TASKS} prospects={MOCK_PROSPECTS} salesOrders={MOCK_SALES_ORDERS} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StyledKpiCard
            title="Ingresos del Mes"
            value={`$${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            change={revenueChange}
            chartData={revenueChartData}
            variant="primary"
        />
        <StyledKpiCard
            title="Nuevos Prospectos (Mes)"
            value={newProspects.toString()}
            change={prospectsChange}
            chartData={prospectsChartData}
        />
        <SmallKpiCard title="Tareas para Hoy" value={tasksToday.toString()} icon="task_alt" linkTo="/tasks" />
        <SmallKpiCard title="Entregas Programadas" value="8" icon="local_shipping" linkTo="/logistics/deliveries" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <PipelineSummary prospects={MOCK_PROSPECTS} />
        </div>
        <div className="lg:col-span-1">
            <MyWorkList tasks={MOCK_TASKS} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;