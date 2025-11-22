
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Company, Prospect, Quote, User } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface QuoteCardProps {
  item: Quote;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, itemId: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ item, onDragStart }) => {
  const { data: companies } = useCollection<Company>('companies');
  const { data: prospects } = useCollection<Prospect>('prospects');
  const { data: users } = useCollection<User>('users');

  const recipient = useMemo(() => {
    if (item.companyId && companies) {
      return companies.find(c => c.id === item.companyId);
    }
    if (item.prospectId && prospects) {
      return prospects.find(p => p.id === item.prospectId);
    }
    return null;
  }, [item, companies, prospects]);
  
  const salesperson = useMemo(() => {
      return users?.find(u => u.id === item.salespersonId);
  }, [users, item.salespersonId]);

  const recipientName = item.companyId ? (recipient as Company)?.shortName || recipient?.name : recipient?.name;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing mb-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2">
            <Link to={`/hubs/quotes/${item.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline truncate">{item.folio}</h4>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={recipientName}>
                {recipientName || 'Destinatario no asignado'}
            </p>
        </div>
         <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-sm">more_horiz</span>
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700 py-1">
                     <Link to={`/hubs/quotes/${item.id}`} onClick={e => e.stopPropagation()} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined text-base mr-2">visibility</span>Ver Detalle
                    </Link>
                </div>
            )}
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <div className="flex items-center gap-2">
              {salesperson ? (
                  <img 
                    src={salesperson.avatarUrl} 
                    alt={salesperson.name} 
                    title={`Responsable: ${salesperson.name}`}
                    className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 object-cover"
                  />
              ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs text-slate-500">person</span>
                  </div>
              )}
           </div>
           <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">${(item.totals?.grandTotal || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
      </div>
    </div>
  );
};

export default QuoteCard;
