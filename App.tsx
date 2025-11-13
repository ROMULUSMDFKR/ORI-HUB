

import React, { useState, useCallback, useEffect, lazy, Suspense, useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import QuickTaskModal from './components/layout/QuickTaskModal';

const PageLoader: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Lazy load all page components
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CrmPage = lazy(() => import('./pages/CrmPage'));
const CrmPipelinePage = lazy(() => import('./pages/CrmPipelinePage'));
const CrmClientsListPage = lazy(() => import('./pages/CrmClientsListPage'));
const CrmContactsListPage = lazy(() => import('./pages/CrmContactsListPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));
const NewQuotePage = lazy(() => import('./pages/NewQuotePage'));
const ArchivesPage = lazy(() => import('./pages/ArchivesPage'));
const SamplesPipelinePage = lazy(() => import('./pages/SamplesPipelinePage'));
const QuotesPipelinePage = lazy(() => import('./pages/QuotesPipelinePage'));
const SalesOrdersPipelinePage = lazy(() => import('./pages/SalesOrdersPipelinePage'));
const CompaniesPipelinePage = lazy(() => import('./pages/CompaniesPipelinePage'));
const ProductsListPage = lazy(() => import('./pages/ProductsListPage'));
const ProductCategoriesPage = lazy(() => import('./pages/ProductCategoriesPage'));
const NewProductPage = lazy(() => import('./pages/NewProductPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const NewProspectPage = lazy(() => import('./pages/NewProspectPage'));
const ProspectDetailPage = lazy(() => import('./pages/ProspectDetailPage'));
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'));
const EditProspectPage = lazy(() => import('./pages/EditProspectPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const EditSupplierPage = lazy(() => import('./pages/EditSupplierPage'));
const CrmSuppliersListPage = lazy(() => import('./pages/CrmSuppliersListPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const LogisticsDeliveriesPage = lazy(() => import('./pages/LogisticsDeliveriesPage'));
const LogisticsProvidersPage = lazy(() => import('./pages/LogisticsProvidersPage'));
const LogisticsPricingPage = lazy(() => import('./pages/LogisticsPricingPage'));
const InventoryStockPage = lazy(() => import('./pages/InventoryStockPage'));
const InventoryMovementsPage = lazy(() => import('./pages/InventoryMovementsPage'));
const InventoryAlertsPage = lazy(() => import('./pages/InventoryAlertsPage'));
const InventoryLocationsPage = lazy(() => import('./pages/InventoryLocationsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const InternalChatPage = lazy(() => import('./pages/InternalChatPage'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage'));
const EmailsPage = lazy(() => import('./pages/EmailsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EditProductPage = lazy(() => import('./pages/EditProductPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const NewTaskPage = lazy(() => import('./pages/NewTaskPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const EditTaskPage = lazy(() => import('./pages/EditTaskPage'));
const NewProjectPage = lazy(() => import('./pages/NewProjectPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const EditProjectPage = lazy(() => import('./pages/EditProjectPage'));
const CommissionsPage = lazy(() => import('./pages/finance/CommissionsPage'));
const CandidatesPage = lazy(() => import('./pages/CandidatesPage'));
const UploadCandidatesPage = lazy(() => import('./pages/UploadCandidatesPage'));
const CandidateDetailPage = lazy(() => import('./pages/CandidateDetailPage'));
const NewSalesOrderPage = lazy(() => import('./pages/NewSalesOrderPage'));
const NewClientPage = lazy(() => import('./pages/NewClientPage'));
const NewSamplePage = lazy(() => import('./pages/NewSamplePage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const PendingPaymentsPage = lazy(() => import('./pages/finance/PendingPaymentsPage'));
const ReceivedPaymentsPage = lazy(() => import('./pages/finance/ReceivedPaymentsPage'));
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const CashFlowPage = lazy(() => import('./pages/finance/CashFlowPage'));
const EditUserPage = lazy(() => import('./pages/EditUserPage'));

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(prev => !prev);
    }, []);

    const useApplyTheme = () => {
        useLayoutEffect(() => {
            const theme = localStorage.getItem('crm-theme-mode');
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }, []);
    };
    
    useApplyTheme();

    if (!isAuthenticated) {
        return (
             <HashRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/login" element={<LoginPage onLogin={() => setIsAuthenticated(true)} />} />
                        <Route path="/signup" element={<SignupPage onSignup={() => setIsAuthenticated(true)} />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                </Suspense>
            </HashRouter>
        )
    }

    return (
        <HashRouter>
            <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onLogout={() => setIsAuthenticated(false)} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/" element={<Navigate to="/today" />} />
                                <Route path="/today" element={<DashboardPage />} />

                                {/* Prospecting */}
                                <Route path="/prospecting/candidates" element={<CandidatesPage />} />
                                <Route path="/prospecting/candidates/:id" element={<CandidateDetailPage />} />
                                <Route path="/prospecting/upload" element={<UploadCandidatesPage />} />
                                
                                <Route path="/crm/lists" element={<CrmPage />} />
                                <Route path="/crm/clients/new" element={<NewClientPage />} />
                                <Route path="/crm/clients/:id" element={<ClientDetailPage />} />
                                <Route path="/crm/clients/:id/edit" element={<EditClientPage />} />
                                <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
                                
                                <Route path="/crm/prospects/new" element={<NewProspectPage />} />
                                <Route path="/crm/prospects/:id" element={<ProspectDetailPage />} />
                                <Route path="/crm/prospects/:id/edit" element={<EditProspectPage />} />

                                {/* Hubs */}
                                <Route path="/hubs/prospects" element={<CrmPipelinePage />} />
                                <Route path="/hubs/samples" element={<SamplesPipelinePage />} />
                                <Route path="/hubs/samples/new" element={<NewSamplePage />} />
                                <Route path="/hubs/quotes" element={<QuotesPipelinePage />} />
                                <Route path="/hubs/quotes/new" element={<NewQuotePage />} />
                                <Route path="/hubs/sales-orders" element={<SalesOrdersPipelinePage />} />
                                <Route path="/hubs/sales-orders/new" element={<NewSalesOrderPage />} />
                                <Route path="/hubs/companies" element={<CompaniesPipelinePage />} />

                                {/* Products */}
                                <Route path="/products/list" element={<ProductsListPage />} />
                                <Route path="/products/categories" element={<ProductCategoriesPage />} />
                                <Route path="/products/new" element={<NewProductPage />} />
                                <Route path="/products/:id" element={<ProductDetailPage />} />
                                <Route path="/products/:id/edit" element={<EditProductPage />} />

                                {/* Purchase */}
                                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                                <Route path="/purchase/suppliers" element={<CrmSuppliersListPage />} />
                                <Route path="/purchase/suppliers/:id" element={<SupplierDetailPage />} />
                                <Route path="/purchase/suppliers/:id/edit" element={<EditSupplierPage />} />
                                
                                {/* Inventory */}
                                <Route path="/inventory/stock" element={<InventoryStockPage />} />
                                <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
                                <Route path="/inventory/alerts" element={<InventoryAlertsPage />} />
                                <Route path="/inventory/locations" element={<InventoryLocationsPage />} />

                                {/* Logistics */}
                                <Route path="/logistics/deliveries" element={<LogisticsDeliveriesPage />} />
                                <Route path="/logistics/providers" element={<LogisticsProvidersPage />} />
                                <Route path="/logistics/pricing" element={<LogisticsPricingPage />} />

                                {/* Productivity */}
                                <Route path="/tasks" element={<TasksPage />} />
                                <Route path="/tasks/new" element={<NewTaskPage />} />
                                <Route path="/tasks/projects" element={<ProjectsPage />} />
                                <Route path="/tasks/projects/new" element={<NewProjectPage />} />
                                <Route path="/tasks/projects/:id" element={<ProjectDetailPage />} />
                                <Route path="/tasks/projects/:id/edit" element={<EditProjectPage />} />
                                <Route path="/tasks/:id" element={<TaskDetailPage />} />
                                <Route path="/tasks/:id/edit" element={<EditTaskPage />} />

                                <Route path="/calendar" element={<CalendarPage />} />
                                <Route path="/communication/chat" element={<InternalChatPage />} />
                                <Route path="/communication/emails" element={<EmailsPage />} />
                                <Route path="/communication/ai-assistant" element={<AiAssistantPage />} />

                                {/* Finance */}
                                <Route path="/billing" element={<BillingPage />} />
                                <Route path="/billing/new" element={<NewInvoicePage />} />
                                <Route path="/billing/:id" element={<InvoiceDetailPage />} />
                                <Route path="/finance/pending-payments" element={<PendingPaymentsPage />} />
                                <Route path="/finance/payments-received" element={<ReceivedPaymentsPage />} />
                                <Route path="/finance/expenses" element={<ExpensesPage />} />
                                <Route path="/finance/cash-flow" element={<CashFlowPage />} />
                                <Route path="/finance/commissions" element={<CommissionsPage />} />
                                
                                {/* System */}
                                <Route path="/archives" element={<ArchivesPage />} />
                                <Route path="/insights/audit" element={<AuditPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/settings/users/:id/edit" element={<EditUserPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                            </Routes>
                        </Suspense>
                    </main>
                </div>
                {isTaskModalOpen && <QuickTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={(task) => console.log('Quick task saved', task)} />}
            </div>
        </HashRouter>
    );
};

export default App;