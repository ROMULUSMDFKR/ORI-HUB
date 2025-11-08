



import React, { useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import CrmPage from './pages/CrmPage';
import CrmPipelinePage from './pages/CrmPipelinePage';
import EditClientPage from './pages/EditClientPage';
import NewQuotePage from './pages/NewQuotePage';
import ArchivesPage from './pages/ArchivesPage';
import SamplesPipelinePage from './pages/SamplesPipelinePage';
import QuotesPipelinePage from './pages/QuotesPipelinePage';
import SalesOrdersPipelinePage from './pages/SalesOrdersPipelinePage';
import CompaniesPipelinePage from './pages/CompaniesPipelinePage';
import ProductsListPage from './pages/ProductsListPage';
import ProductCategoriesPage from './pages/ProductCategoriesPage';
import NewProductPage from './pages/NewProductPage';
import ProductDetailPage from './pages/ProductDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import NewProspectPage from './pages/NewProspectPage';
import ProspectDetailPage from './pages/ProspectDetailPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import EditProspectPage from './pages/EditProspectPage';
import ClientDetailPage from './pages/ClientDetailPage';
import EditSupplierPage from './pages/EditSupplierPage';
import CrmSuppliersListPage from './pages/CrmSuppliersListPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import AuditPage from './pages/AuditPage';
import LogisticsDeliveriesPage from './pages/LogisticsDeliveriesPage';
import LogisticsProvidersPage from './pages/LogisticsProvidersPage';
import LogisticsPricingPage from './pages/LogisticsPricingPage';
import InventoryStockPage from './pages/InventoryStockPage';
import InventoryMovementsPage from './pages/InventoryMovementsPage';
import InventoryAlertsPage from './pages/InventoryAlertsPage';
import InventoryLocationsPage from './pages/InventoryLocationsPage';
import CalendarPage from './pages/CalendarPage';
import InternalChatPage from './pages/InternalChatPage';
import AiAssistantPage from './pages/AiAssistantPage';
import EmailsPage from './pages/EmailsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-background text-on-surface">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  </div>
);

const App: React.FC = () => {
  useLayoutEffect(() => {
    try {
      const savedTheme = localStorage.getItem('crm-theme');
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key]);
        }
      }
    } catch (error) {
      console.error("Failed to apply theme from localStorage", error);
    }
  }, []);

  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<DashboardPage />} />
          
          {/* CRM / Ventas */}
          <Route path="/crm" element={<Navigate to="/crm/lists" replace />} />
          <Route path="/crm/pipeline" element={<Navigate to="/hubs/prospects" replace />} />
          <Route path="/crm/lists" element={<CrmPage />} />
          <Route path="/crm/clients" element={<Navigate to="/crm/lists?view=companies" replace />} />
          <Route path="/crm/clients/:id" element={<ClientDetailPage />} />
          <Route path="/crm/clients/:id/edit" element={<EditClientPage />} />
          <Route path="/crm/contacts" element={<Navigate to="/crm/lists?view=contacts" replace />} />
          <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
          
          <Route path="/crm/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="/crm/suppliers/:id/edit" element={<EditSupplierPage />} />
          <Route path="/crm/prospects/new" element={<NewProspectPage />} />
          <Route path="/crm/prospects/:id" element={<ProspectDetailPage />} />
          <Route path="/crm/prospects/:id/edit" element={<EditProspectPage />} />

          {/* Hubs */}
          <Route path="/hubs/prospects" element={<CrmPipelinePage />} />
          <Route path="/hubs/samples" element={<SamplesPipelinePage />} />
          <Route path="/hubs/quotes" element={<QuotesPipelinePage />} />
          <Route path="/hubs/quotes/new" element={<NewQuotePage />} />
          <Route path="/hubs/sales-orders" element={<SalesOrdersPipelinePage />} />
          <Route path="/hubs/companies" element={<CompaniesPipelinePage />} />

          {/* Products */}
          <Route path="/products/list" element={<ProductsListPage />} />
          <Route path="/products/categories" element={<ProductCategoriesPage />} />
          <Route path="/products/new" element={<NewProductPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />

          {/* Purchase */}
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase/suppliers" element={<CrmSuppliersListPage />} />

          {/* Inventory */}
          <Route path="/inventory/stock" element={<InventoryStockPage />} />
          <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
          <Route path="/inventory/alerts" element={<InventoryAlertsPage />} />
          <Route path="/inventory/locations" element={<InventoryLocationsPage />} />

          {/* Logistics */}
          <Route path="/logistics/deliveries" element={<LogisticsDeliveriesPage />} />
          <Route path="/logistics/providers" element={<LogisticsProvidersPage />} />
          <Route path="/logistics/pricing" element={<LogisticsPricingPage />} />

          {/* Other */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/projects" element={<ProjectsPage />} />
          <Route path="/archives" element={<ArchivesPage />} />

          {/* New Routes */}
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/communication/chat" element={<InternalChatPage />} />
          <Route path="/communication/emails" element={<EmailsPage />} />
          <Route path="/communication/ai-assistant" element={<AiAssistantPage />} />
          
          {/* FIX: Corrected typo from 'Path' to 'Route' for proper routing. */}
          <Route path="/insights/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />


          <Route path="*" element={<div className="text-center p-12">Página no encontrada</div>} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
};

export default App;