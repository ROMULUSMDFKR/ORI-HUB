
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sample, Company, Product, Prospect } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface SampleCardProps {
  item: Sample;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
  onArchive: (itemId: string) => void;
}

const SampleCard: React.FC<SampleCardProps> = ({ item, onDragStart, onArchive }) => {
  const { data: companies } = useCollection<Company>('companies');
  const { data: products } = useCollection<Product>('products');
  const { data: prospects } = useCollection<Prospect>('prospects');

  const recipient = useMemo(() => {
    if (item.companyId && companies) {
      return companies.find(c => c.id === item.companyId);
    }
    if (item.prospectId && prospects) {
      return prospects.find(p => p.id === item.prospectId);
    }
    return null;
  }, [item, companies, prospects]);

  const product = useMemo(() => products?.find(p => p.id === item.productId), [products, item.productId]);
  const recipientName = item.companyId ? (recipient as Company)?.shortName || recipient?.name : recipient?.name;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
        <div className="flex justify-between items-start">
            <Link to={`/hubs/samples/${item.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline">{item.name}</h4>
            </Link>
            <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-1">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700 py-1">
                         <Link to={`/hubs/samples/${item.id}`} onClick={e => e.stopPropagation()} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-base mr-2">visibility</span>Ver Detalle
                        </Link>
                         <div className="my-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                        <button onClick={() => onArchive(item.id)} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-base mr-2">archive</span>Archivar
                        </button>
                    </div>
                )}
            </div>
        </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{recipientName || 'Destinatario no encontrado'}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{product?.name || 'Producto no encontrado'}</p>
      <div className="text-right text-xs text-slate-500 dark:text-slate-400 mt-2">
        Solicitada: {new Date(item.requestDate).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SampleCard;
