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
    if (searchTerm.length < 3) return [];
    return existingProspects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, existingProspects]);

  const matchingCompanies = useMemo(() => {
    if (searchTerm.length < 3) return [];
    return existingCompanies.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, existingCompanies]);

  const hasMatches = matchingProspects.length > 0 || matchingCompanies.length > 0;

  if (!hasMatches) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
      <div className="p-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">Posibles duplicados encontrados:</p>
        <ul>
          {matchingProspects.map(prospect => (
            <li key={`p-${prospect.id}`}>
              <Link to={`/crm/prospects/${prospect.id}`} className="block p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                <p className="font-medium text-slate-800 dark:text-slate-200">{prospect.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Prospecto &bull; {prospect.stage}</p>
              </Link>
            </li>
          ))}
          {matchingCompanies.map(company => (
            <li key={`c-${company.id}`}>
              <Link to={`/crm/clients/${company.id}`} className="block p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                 <p className="font-medium text-slate-800 dark:text-slate-200">{company.shortName || company.name}</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400">Empresa/Cliente &bull; {company.stage}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DuplicateChecker;