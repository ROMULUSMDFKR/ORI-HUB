import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useCollection';
import { Expense } from '../../types';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const KpiCard: React.FC<{ title: string; value: string; icon: string; className?: string }> = ({ title, value, icon, className = 'bg-white dark:bg-slate-800' }) => (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{value}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-slate-500 dark:text-slate-400">{icon}</span>
        </div>
    </div>
);

const ExpensesPage: React.FC = () => {
    const { data: expenses, loading } = useCollection<Expense>('expenses');

    const { totalLast30Days, avgExpense } = useMemo(() => {
        if (!expenses) return { totalLast30Days: 0, avgExpense: 0 };
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const recentExpenses = expenses.filter(exp => new Date(exp.date) > thirtyDaysAgo);
        const total = recentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avg = expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0;

        return { totalLast30Days: total, avgExpense: avg };
    }, [expenses]);

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
        { header: 'Fecha', accessor: (exp: Expense) => new Date(exp.date).toLocaleDateString() },
        { header: 'Descripción', accessor: (exp: Expense) => exp.description },
        { header: 'Categoría', accessor: (exp: Expense) => <Badge text={exp.category} color={getCategoryColor(exp.category)} /> },
        { header: 'Monto', accessor: (exp: Expense) => `$${exp.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}`, className: 'text-right font-semibold' },
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gestión de Gastos</h1>
                <Link to="/finance/expenses/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center shadow-sm hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Registrar Nuevo Gasto
                </Link>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard title="Total Gastado (Últimos 30d)" value={`$${(totalLast30Days/1000).toFixed(1)}k`} icon="shopping_bag" />
                <KpiCard title="Gasto Promedio" value={`$${(avgExpense/1000).toFixed(1)}k`} icon="request_quote" />
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <Table columns={columns} data={expenses || []} />
            )}
        </div>
    );
};

export default ExpensesPage;