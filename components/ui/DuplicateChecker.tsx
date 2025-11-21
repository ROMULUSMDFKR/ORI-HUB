
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Prospect, Company } from '../../types';

interface DuplicateCheckerProps {
  searchTerm: string;
  existingProspects: Prospect[];
  existingCompanies: Company[];
}

const DuplicateChecker: React.FC<DuplicateCheckerProps> = ({ searchTerm, existingProspects, existingCompanies }) => {
  const matchingProspects = useMemo(() => {
    if (!searchTerm || searchTerm.length < 3) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return existingProspects.filter(p => p.name.toLowerCase().includes(lowerTerm));
  }, [searchTerm, existingProspects]);

  const matchingCompanies = useMemo(() => {
    if (!searchTerm || searchTerm.length < 3) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return existingCompanies.filter(c => 
      c.name.toLowerCase().includes(lowerTerm) ||
      (c.shortName && c.shortName.toLowerCase().includes(lowerTerm))
    );
  }, [searchTerm, existingCompanies]);

  const hasMatches = matchingProspects.length > 0 || matchingCompanies.length > 0;

  if (!hasMatches) {
    return null;
  }

  return (
    <div className="mt-2 w-full bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-lg border border-amber-200 dark:border-amber-700 max-h-60 overflow-y-auto animate-slide-in-up">
      <div className="p-3 sticky top-0 bg-amber-50 dark:bg-amber-900/90 backdrop-blur-sm border-b border-amber-100 dark:border-amber-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">warning</span>
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Posibles duplicados detectados</p>
      </div>
      <ul className="p-2 space-y-1">
        {matchingCompanies.map(company => (
          <li key={`c-${company.id}`}>
            <Link to={`/crm/clients/${company.id}`} target="_blank" className="block p-2 text-sm hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-md group transition-colors">
              <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {company.shortName || company.name}
                  </p>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">CLIENTE</span>
              </div>
              {company.shortName && company.name !== company.shortName && <p className="text-xs text-slate-500 dark:text-slate-400">{company.name}</p>}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Etapa: {company.stage}</p>
            </Link>
          </li>
        ))}
        {matchingProspects.map(prospect => (
          <li key={`p-${prospect.id}`}>
            <Link to={`/hubs/prospects/${prospect.id}`} target="_blank" className="block p-2 text-sm hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-md group transition-colors">
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{prospect.name}</p>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">PROSPECTO</span>
                </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Etapa: {prospect.stage}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DuplicateChecker;
