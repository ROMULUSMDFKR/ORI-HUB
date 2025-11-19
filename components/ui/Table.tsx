
import React, { useState, useMemo } from 'react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  itemsPerPage?: number;
  onRowClick?: (item: T) => void;
}

const Table = <T extends { id: string }>({ columns, data, itemsPerPage = 10, onRowClick }: TableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const totalPages = Math.ceil(data.length / pageSize);
  
  // Reset to page 1 if data changes and current page becomes invalid
  React.useEffect(() => {
      if(currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
      }
  }, [data.length, totalPages, currentPage]);
  
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPaginationButtons = () => {
    const pageButtons: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
    } else {
      pageButtons.push(1);
      if (currentPage > 4) pageButtons.push('...');
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
          start = 2;
          end = 4;
      }
      if (currentPage >= totalPages - 2) {
          start = totalPages - 3;
          end = totalPages - 1;
      }

      for (let i = start; i <= end; i++) pageButtons.push(i);
      if (currentPage < totalPages - 3) pageButtons.push('...');
      pageButtons.push(totalPages);
    }
    return pageButtons;
  }

  const pages = useMemo(() => getPaginationButtons(), [totalPages, currentPage]);

  const startItem = data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, data.length);
  
  const commonButtonClasses = "relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:z-20 focus:outline-offset-0";
  const activeClasses = "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
  const defaultClasses = "text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700";
  const disabledClasses = "text-slate-300 dark:text-slate-500 cursor-not-allowed";
  
  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {columns.map((col, index) => (
                <th key={index} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${col.className}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((col, index) => (
                  <td key={index} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 ${col.className}`}>
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-700 gap-4">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-slate-500 dark:text-slate-400">Filas:</label>
                    <select 
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-slate-900 dark:text-slate-200 dark:bg-slate-700 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{startItem}</span>-<span className="font-medium text-slate-700 dark:text-slate-200">{endItem}</span> de <span className="font-medium text-slate-700 dark:text-slate-200">{data.length}</span>
                </p>
            </div>
            {totalPages > 1 && (
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`${commonButtonClasses} rounded-l-md ${currentPage === 1 ? disabledClasses : defaultClasses}`}
                >
                    <span className="sr-only">Anterior</span>
                    <span className="material-symbols-outlined !text-base">chevron_left</span>
                </button>
                {pages.map((page, index) => 
                    typeof page === 'number' ? (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(page)}
                            aria-current={currentPage === page ? 'page' : undefined}
                            className={`${commonButtonClasses} ${currentPage === page ? activeClasses : defaultClasses}`}
                        >
                            {page}
                        </button>
                    ) : (
                        <span key={index} className={`${commonButtonClasses} ${defaultClasses}`}>...</span>
                    )
                )}
                <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`${commonButtonClasses} rounded-r-md ${currentPage === totalPages ? disabledClasses : defaultClasses}`}
                >
                    <span className="sr-only">Siguiente</span>
                     <span className="material-symbols-outlined !text-base">chevron_right</span>
                </button>
            </nav>
            )}
        </div>
      )}
    </div>
  );
};

export default Table;
