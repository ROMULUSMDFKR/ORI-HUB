import React from 'react';
import { useParams, Link } from 'react-router-dom';

const PurchaseOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Detalle de Orden de Compra: {id}</h1>
                <Link to="/purchase/orders" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    &larr; Volver a Órdenes de Compra
                </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400">Los detalles de la orden de compra <span className="font-mono">{id}</span> se mostrarán aquí.</p>
            </div>
        </div>
    );
};

export default PurchaseOrderDetailPage;
