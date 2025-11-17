

import React from 'react';

interface ContentLayoutProps {
  children: React.ReactNode;
}

const ContentLayout: React.FC<ContentLayoutProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900/50">
      {children}
    </main>
  );
};

export default ContentLayout;