
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Expense } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import FilterButton from '../../components/ui/FilterButton';

// KPI Card following "App Icon Pattern"
const ExpenseKpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }[color] || "bg-slate-100 text-slate-600";

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
            </div>
        </div>
    );
};

const ExpensesPage: React.FC = () => {
    const { data: expenses, loading } = useCollection<Expense>('expenses');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const { totalLast30Days, avgExpense, filteredExpenses } = useMemo(() => {
        if (!expenses) return { totalLast30Days: 0, avgExpense: 0, filteredExpenses: [] };
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // KPIs Logic
        const recentExpenses = expenses.filter(exp => new Date(exp.date) > thirtyDaysAgo);
        const total = recentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avg = expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0;

        // Filtering Logic
        let result = expenses;
        if (categoryFilter !== 'all') {
            result = result.filter(e => e.category === categoryFilter);
        }
        if (searchTerm) {
            result = result.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return { 
            totalLast30Days: total, 
            avgExpense: avg, 
            filteredExpenses: result.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [expenses, categoryFilter, searchTerm]);

    const getCategoryColor = (category: Expense['category']) => {
        const colors: Record<Expense['category'], 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
            'Logística': 'blue',
            'Materia Prima': 'yellow',
            'Oficina': 'green',
            'Nómina': 'red',
            'Marketing': 'gray',
            'Otros': 'gray'
        };
        return colors[category] || 'gray';
    };
    
    const columns = [
        { header: 'Fecha', accessor: (exp: Expense) => <span className="text-slate-600 dark:text-slate-300">{new Date(exp.date).toLocaleDateString()}</span> },
        { 
            header: 'Descripción', 
            accessor: (exp: Expense) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-slate-500 text-sm">receipt</span>
                    </div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{exp.description}</span>
                </div>
            )
        },
        { header: 'Categoría', accessor: (exp: Expense) => <Badge text={exp.category} color={getCategoryColor(exp.category)} /> },
        { header: 'Monto', accessor: (exp: Expense) => <span className="font-bold text-slate-800 dark:text-slate-200">{`$${(exp.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`}</span>, className: 'text-right' },
    ];
    
    const categoryOptions = [
        { value: 'Logística', label: 'Logística' },
        { value: 'Materia Prima', label: 'Materia Prima' },
        { value: 'Oficina', label: 'Oficina' },
        { value: 'Nómina', label: 'Nómina' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Otros', label: 'Otros' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gastos</h1>
                     <p className="text-slate-500 dark:text-slate-400 mt-1">Registro y control de egresos operativos.</p>
                </div>
                <Link to="/finance/expenses/new" className="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined">add_circle</span>
                    Registrar Gasto
                </Link>
            </div>

            {/* KPIs */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ExpenseKpiCard title="Gasto Total (30 días)" value={`$${(totalLast30Days/1000).toFixed(1)}k`} icon="shopping_bag" color="red" />
                <ExpenseKpiCard title="Gasto Promedio" value={`$${(avgExpense/1000).toFixed(1)}k`} icon="analytics" color="amber" />
            </div>

             {/* Toolbar */}
             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 {/* Input Safe Pattern */}
                <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por concepto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                </div>
                <FilterButton 
                    label="Categoría"
                    options={categoryOptions}
                    selectedValue={categoryFilter}
                    onSelect={setCategoryFilter}
                />
            </div>

             {/* Table */}
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : filteredExpenses.length > 0 ? (
                    <Table columns={columns} data={filteredExpenses} />
                ) : (
                     <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-400">savings</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sin gastos registrados</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">No se encontraron gastos con los filtros actuales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpensesPage;
