import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Prospect } from '../../types';
import { MOCK_USERS } from '../../data/mockData';
import Badge from '../ui/Badge';

interface ProspectCardProps {
  prospect: Prospect;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, prospectId: string) => void;
}

const formatDistanceToNow = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "a";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
};

const InfoRow: React.FC<{ icon: string; text: React.ReactNode; isAlert?: boolean }> = ({ icon, text, isAlert = false }) => (
    <div className={`flex items-center text-xs ${isAlert ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
        <span className="material-symbols-outlined text-sm mr-2">{icon}</span>
        <span>{text}</span>
    </div>
);

const ProspectCard: React.FC<ProspectCardProps> = ({ prospect, onDragStart }) => {
  const owner = Object.values(MOCK_USERS).find(u => u.id === prospect.ownerId) || MOCK_USERS.admin;
  const [menuOpen, setMenuOpen] = useState(false);

  const priorityColor = {
    'Alta': 'red',
    'Media': 'yellow',
    'Baja': 'gray',
  }[prospect.priority || 'Baja'] as 'red' | 'yellow' | 'gray';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, prospect.id)}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-4 space-y-3"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
            <Link to={`/crm/prospects/${prospect.id}`} onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-sm text-text-main hover:underline">{prospect.name}</h4>
            </Link>
            <p className="text-xs text-secondary font-semibold">${prospect.estValue.toLocaleString('en-US')}</p>
        </div>
        <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-gray-100">
                <span className="material-symbols-outlined text-sm">more_horiz</span>
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><span className="material-symbols-outlined text-base mr-2">event</span>Programar acción</a>
                    <Link to={`/crm/prospects/${prospect.id}`} onClick={e => e.stopPropagation()} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><span className="material-symbols-outlined text-base mr-2">visibility</span>Abrir detalle</Link>
                    <a href="#" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"><span className="material-symbols-outlined text-base mr-2">delete</span>Eliminar</a>
                </div>
            )}
        </div>
      </div>

      {/* Body Info */}
      <div className="space-y-2">
         {prospect.nextAction && (
            <InfoRow 
                icon="flag" 
                text={<><strong>{prospect.nextAction.description}</strong> para {new Date(prospect.nextAction.dueDate).toLocaleDateString()}</>}
                isAlert={new Date(prospect.nextAction.dueDate) < new Date()}
            />
         )}
         {prospect.pausedInfo && (
            <InfoRow 
                icon="pause_circle" 
                text={<>Pausado: {prospect.pausedInfo.reason}</>}
            />
         )}
         <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center">
                <img src={owner.avatarUrl} alt={owner.name} title={owner.name} className="w-5 h-5 rounded-full mr-1" />
                <span>{prospect.origin || 'N/A'}</span>
            </div>
            <span><span className="material-symbols-outlined text-xs">schedule</span> {formatDistanceToNow(prospect.createdAt)}</span>
         </div>
      </div>
      
      {/* Footer Chips */}
      <div className="flex flex-wrap gap-1">
        {prospect.priority && <Badge text={prospect.priority} color={priorityColor} />}
        {prospect.industry && <Badge text={prospect.industry} color="blue" />}
        {prospect.productsOfInterest?.map(p => <Badge key={p} text={p} />)}
      </div>
    </div>
  );
};

export default ProspectCard;