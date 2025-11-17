import React, { useState, useMemo } from 'react';
import Drawer from '../ui/Drawer';
import { useCollection } from '../../hooks/useCollection';
import { Company, Prospect, Quote, SalesOrder } from '../../types';
import Spinner from '../ui/Spinner';
import Checkbox from '../ui/Checkbox';

interface LinkEntityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (links: any) => void;
  linkedEntities: any;
}

type EntityType = 'company' | 'prospect' | 'quote' | 'salesOrder';

const LinkEntityDrawer: React.FC<LinkEntityDrawerProps> = ({ isOpen, onClose, onLink, linkedEntities }) => {
  const [activeTab, setActiveTab] = useState<EntityType>('company');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(linkedEntities);

  const { data: companies, loading: cLoading } = useCollection<Company>('companies');
  const { data: prospects, loading: pLoading } = useCollection<Prospect>('prospects');
  const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
  const { data: salesOrders, loading: soLoading } = useCollection<SalesOrder>('salesOrders');

  const loading = cLoading || pLoading || qLoading || soLoading;

  const handleToggleSelection = (entityType: EntityType, id: string) => {
    setSelected((prev: any) => {
      const key = `${entityType}Id`;
      const currentId = prev[key];
      
      // Allow only one link per type for simplicity for now
      if (currentId === id) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: id };
    });
  };

  const handleLink = () => {
    onLink(selected);
    onClose();
  };
  
  const dataMap = {
      company: companies,
      prospect: prospects,
      quote: quotes,
      salesOrder: salesOrders,
  };

  const currentData = useMemo(() => {
      const data = dataMap[activeTab] || [];
      if (!searchTerm) return data;
      return data.filter((item: any) => 
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.folio?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [activeTab, searchTerm, companies, prospects, quotes, salesOrders]);

  const tabs: { id: EntityType, name: string }[] = [
    { id: 'company', name: 'Clientes' },
    { id: 'prospect', name: 'Prospectos' },
    { id: 'quote', name: 'Cotizaciones' },
    { id: 'salesOrder', name: 'Órdenes de Venta' },
  ];

  const renderListItem = (item: any) => {
      let title = item.name || item.folio || item.id;
      let subTitle = '';
      if(activeTab === 'company') subTitle = (item as Company).shortName || (item as Company).rfc || '';
      if(activeTab === 'prospect') subTitle = (item as Prospect).stage;

      const isSelected = selected[`${activeTab}Id`] === item.id;

      return (
        <li 
          key={item.id} 
          onClick={() => handleToggleSelection(activeTab, item.id)} 
          className={`p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''}`}
        >
            <Checkbox checked={isSelected} onChange={() => {}} />
            <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{title}</p>
                {subTitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subTitle}</p>}
            </div>
        </li>
      );
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Vincular Entidades">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <input 
                type="text" 
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="flex space-x-4 px-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.name}
                    </button>
                ))}
            </nav>
        </div>
        <div className="flex-1 overflow-y-auto">
            {loading ? <Spinner/> : (
                <ul>
                    {currentData.map(renderListItem)}
                </ul>
            )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button onClick={handleLink} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">
                Vincular
            </button>
        </div>
      </div>
    </Drawer>
  );
};

export default LinkEntityDrawer;
