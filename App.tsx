

import React, { useState, useCallback, useEffect, lazy, Suspense, useLayoutEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from './hooks/useAuth'; // Import the new hook

import Header from './components/layout/Header';
import QuickTaskModal from './components/layout/QuickTaskModal';
import PrimarySidebar from './components/layout/PrimarySidebar';
import ContentLayout from './components/layout/ContentLayout';
import { NAV_LINKS } from './constants';
import SecondarySidebar from './components/layout/SecondarySidebar';
import { User } from './types';

const PageLoader: React.FC = () => (
  <div className="w-full h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Lazy load all page components
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

// Prospecting
const CandidatesPage = lazy(() => import('./pages/CandidatesPage'));
const CandidateDetailPage = lazy(() => import('./pages/CandidateDetailPage'));
const UploadCandidatesPage = lazy(() => import('./pages/UploadCandidatesPage'));

// Hubs
const CrmPipelinePage = lazy(() => import('./pages/CrmPipelinePage'));
const SamplesPipelinePage = lazy(() => import('./pages/SamplesPipelinePage'));
const QuotesPipelinePage = lazy(() => import('./pages/QuotesPipelinePage'));
const SalesOrdersPipelinePage = lazy(() => import('./pages/SalesOrdersPipelinePage'));
const CompaniesPipelinePage = lazy(() => import('./pages/CompaniesPipelinePage'));

// Hubs Details
const ProspectDetailPage = lazy(() => import('./pages/ProspectDetailPage'));
const NewProspectPage = lazy(() => import('./pages/NewProspectPage'));
const EditProspectPage = lazy(() => import('./pages/EditProspectPage'));
const SampleDetailPage = lazy(() => import('./pages/SampleDetailPage'));
const NewSamplePage = lazy(() => import('./pages/NewSamplePage'));
const QuoteDetailPage = lazy(() => import('./pages/QuoteDetailPage'));
const NewQuotePage = lazy(() => import('./pages/NewQuotePage'));
const SalesOrderDetailPage = lazy(() => import('./pages/SalesOrderDetailPage'));
const NewSalesOrderPage = lazy(() => import('./pages/NewSalesOrderPage'));

// CRM Lists
const CrmClientsListPage = lazy(() => import('./pages/CrmClientsListPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));
const NewClientPage = lazy(() => import('./pages/NewClientPage'));
const CrmContactsListPage = lazy(() => import('./pages/CrmContactsListPage'));
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage'));

// Products
const ProductDashboardPage = lazy(() => import('./pages/ProductDashboardPage'));
const ProductsListPage = lazy(() => import('./pages/ProductsListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const EditProductPage = lazy(() => import('./pages/EditProductPage'));
const NewProductPage = lazy(() => import('./pages/NewProductPage'));
const ProductCategoriesPage = lazy(() => import('./pages/ProductCategoriesPage'));

// Purchases
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const CrmSuppliersListPage = lazy(() => import('./pages/CrmSuppliersListPage'));
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'));
const EditSupplierPage = lazy(() => import('./pages/EditSupplierPage'));

// Inventory
const InventoryStockPage = lazy(() => import('./pages/InventoryStockPage'));
const InventoryMovementsPage = lazy(() => import('./pages/InventoryMovementsPage'));
const InventoryAlertsPage = lazy(() => import('./pages/InventoryAlertsPage'));
const InventoryLocationsPage = lazy(() => import('./pages/InventoryLocationsPage'));

// Logistics
const LogisticsDeliveriesPage = lazy(() => import('./pages/LogisticsDeliveriesPage'));
const LogisticsProvidersPage = lazy(() => import('./pages/LogisticsProvidersPage'));
const LogisticsPricingPage = lazy(() => import('./pages/LogisticsPricingPage'));

// Productivity
const TasksPage = lazy(() => import('./pages/TasksPage'));
const NewTaskPage = lazy(() => import('./pages/NewTaskPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const EditTaskPage = lazy(() => import('./pages/EditTaskPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const NewProjectPage = lazy(() => import('./pages/NewProjectPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const EditProjectPage = lazy(() => import('./pages/EditProjectPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

// Communication
const InternalChatPage = lazy(() => import('./pages/InternalChatPage'));
const EmailsPage = lazy(() => import('./pages/EmailsPage'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage'));

// Finance
const BillingPage = lazy(() => import('./pages/BillingPage'));
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const SalesDashboardPage = lazy(() => import('./pages/finance/SalesDashboardPage'));
const PendingPaymentsPage = lazy(() => import('./pages/finance/PendingPaymentsPage'));
const ReceivedPaymentsPage = lazy(() => import('./pages/finance/ReceivedPaymentsPage'));
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const CashFlowPage = lazy(() => import('./pages/finance/CashFlowPage'));
const CommissionsPage = lazy(() => import('./pages/finance/CommissionsPage'));

// System & Settings
const ArchivesPage = lazy(() => import('./pages/ArchivesPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Settings Pages
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/settings/UserManagement'));
const EditUserPage = lazy(() => import('./pages/EditUserPage'));
const TeamManagementPage = lazy(() => import('./pages/settings/TeamManagement'));
const SecuritySettingsPage = lazy(() => import('./pages/settings/SecuritySettings'));
const EmailSettingsPage = lazy(() => import('./pages/settings/EmailSettings'));
const IndustryManagementPage = lazy(() => import('./pages/settings/IndustryManagement'));
const PipelineManagementPage = lazy(() => import('./pages/settings/PipelineManagement'));
const AiAccessSettingsPage = lazy(() => import('./pages/settings/AiAccessSettings'));
const EmailAppearancePage = lazy(() => import('./pages/CrmPage'));
const RoleManagementPage = lazy(() => import('./pages/settings/RoleManagementPage'));
const EditRolePage = lazy(() => import('./pages/settings/EditRolePage'));

// Auth & Onboarding
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'));

const AppContent: React.FC<{ user: User, onLogout: () => void, refreshUser: () => void }> = ({ user, onLogout, refreshUser }) => {
    const location = useLocation();
    const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
    const [headerTitle, setHeaderTitle] = useState('Hoy');

    const secondarySidebarContent = useMemo(() => {
        const currentTopLevelPath = `/${location.pathname.split('/')[1]}`;
        const mainLink = NAV_LINKS.find(link => 
            (link.sublinks && link.sublinks.some(sub => sub.path.startsWith(currentTopLevelPath))) ||
            (link.path && link.path.startsWith(currentTopLevelPath))
        );

        if (mainLink?.path === '/today') return null;

        if (mainLink && mainLink.sublinks) {
            return {
                title: mainLink.name,
                sublinks: mainLink.sublinks,
            };
        }
        return null;
    }, [location.pathname]);

    useLayoutEffect(() => {
        const currentTopLevelPath = `/${location.pathname.split('/')[1]}`;
        const mainLink = NAV_LINKS.find(link => 
            (link.sublinks && link.sublinks.some(sub => sub.path.startsWith(currentTopLevelPath))) ||
            (link.path && link.path.startsWith(currentTopLevelPath))
        );
        
        if (secondarySidebarContent) {
            setHeaderTitle('');
        } else if (mainLink) {
            setHeaderTitle(mainLink.name);
        } else {
            // Fallback for things like profile page which might not be in nav
            setHeaderTitle('Hoy');
        }
    }, [location.pathname, secondarySidebarContent]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsQuickTaskOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
            <PrimarySidebar />
            {secondarySidebarContent && (
                <SecondarySidebar
                    title={secondarySidebarContent.title}
                    sublinks={secondarySidebarContent.sublinks}
                />
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} pageTitle={headerTitle} />
                <ContentLayout>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/today" replace />} />
                            <Route path="/today" element={<DashboardPage user={user} />} />
                            {/* Prospecting */}
                            <Route path="/prospecting/candidates" element={<CandidatesPage />} />
                            <Route path="/prospecting/candidates/:id" element={<CandidateDetailPage />} />
                            <Route path="/prospecting/upload" element={<UploadCandidatesPage />} />
                            {/* Hubs */}
                            <Route path="/hubs/prospects" element={<CrmPipelinePage />} />
                            <Route path="/hubs/prospects/new" element={<NewProspectPage />} />
                            <Route path="/hubs/prospects/:id" element={<ProspectDetailPage />} />
                            <Route path="/hubs/prospects/:id/edit" element={<EditProspectPage />} />
                            <Route path="/hubs/samples" element={<SamplesPipelinePage />} />
                            <Route path="/hubs/samples/new" element={<NewSamplePage />} />
                            <Route path="/hubs/samples/:id" element={<SampleDetailPage />} />
                            <Route path="/hubs/quotes" element={<QuotesPipelinePage />} />
                            <Route path="/hubs/quotes/new" element={<NewQuotePage />} />
                            <Route path="/hubs/quotes/:id" element={<QuoteDetailPage />} />
                            <Route path="/hubs/sales-orders" element={<SalesOrdersPipelinePage />} />
                            <Route path="/hubs/sales-orders/new" element={<NewSalesOrderPage />} />
                            <Route path="/hubs/sales-orders/:id" element={<SalesOrderDetailPage />} />
                            <Route path="/hubs/companies" element={<CompaniesPipelinePage />} />
                            {/* CRM Lists */}
                            <Route path="/crm/clients/list" element={<CrmClientsListPage />} />
                            <Route path="/crm/clients/new" element={<NewClientPage />} />
                            <Route path="/crm/clients/:id" element={<ClientDetailPage />} />
                            <Route path="/crm/clients/:id/edit" element={<EditClientPage />} />
                            <Route path="/crm/contacts/list" element={<CrmContactsListPage />} />
                            <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
                            {/* Products */}
                            <Route path="/products/dashboard" element={<ProductDashboardPage />} />
                            <Route path="/products/list" element={<ProductsListPage />} />
                            <Route path="/products/new" element={<NewProductPage />} />
                            <Route path="/products/:id" element={<ProductDetailPage />} />
                            <Route path="/products/:id/edit" element={<EditProductPage />} />
                            <Route path="/products/categories" element={<ProductCategoriesPage />} />
                            {/* Purchases */}
                            <Route path="/purchase/orders" element={<PurchaseOrdersPage />} />
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
                            <Route path="/tasks/:id" element={<TaskDetailPage />} />
                            <Route path="/tasks/:id/edit" element={<EditTaskPage />} />
                            <Route path="/tasks/projects" element={<ProjectsPage />} />
                            <Route path="/tasks/projects/new" element={<NewProjectPage />} />
                            <Route path="/tasks/projects/:id" element={<ProjectDetailPage />} />
                            <Route path="/tasks/projects/:id/edit" element={<EditProjectPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            {/* Communication */}
                            <Route path="/communication/chat" element={<InternalChatPage />} />
                            <Route path="/communication/chat/:type/:id" element={<InternalChatPage />} />
                            <Route path="/communication/emails" element={<EmailsPage />} />
                            <Route path="/communication/ai-assistant" element={<AiAssistantPage />} />
                             {/* Finance */}
                            <Route path="/billing" element={<BillingPage />} />
                            <Route path="/billing/new" element={<NewInvoicePage />} />
                            <Route path="/billing/:id" element={<InvoiceDetailPage />} />
                            <Route path="/finance/sales-dashboard" element={<SalesDashboardPage />} />
                            <Route path="/finance/pending-payments" element={<PendingPaymentsPage />} />
                            <Route path="/finance/payments-received" element={<ReceivedPaymentsPage />} />
                            <Route path="/finance/expenses" element={<ExpensesPage />} />
                            <Route path="/finance/cash-flow" element={<CashFlowPage />} />
                            <Route path="/finance/commissions" element={<CommissionsPage />} />
                            {/* System */}
                            <Route path="/archives" element={<ArchivesPage />} />
                            <Route path="/profile" element={<ProfilePage user={user} refreshUser={refreshUser} />} />
                            <Route path="/insights/audit" element={<AuditPage />} />
                             {/* Settings */}
                            <Route path="/settings" element={<Navigate to="/settings/users" replace />} />
                            <Route path="/settings/users" element={<UserManagementPage />} />
                            <Route path="/settings/users/:id/edit" element={<EditUserPage />} />
                            <Route path="/settings/roles" element={<RoleManagementPage />} />
                            <Route path="/settings/roles/new" element={<EditRolePage />} />
                            <Route path="/settings/roles/:id/edit" element={<EditRolePage />} />
                            <Route path="/settings/teams" element={<TeamManagementPage />} />
                            <Route path="/settings/security" element={<SecuritySettingsPage />} />
                            <Route path="/settings/email-accounts" element={<EmailSettingsPage />} />
                            <Route path="/settings/industries" element={<IndustryManagementPage />} />
                            <Route path="/settings/pipelines" element={<PipelineManagementPage />} />
                            <Route path="/settings/ai-access" element={<AiAccessSettingsPage />} />
                            <Route path="/settings/appearance/email" element={<EmailAppearancePage />} />
                            {/* 404 */}
                            <Route path="*" element={<div>404 Not Found</div>} />
                        </Routes>
                    </Suspense>
                </ContentLayout>
                <QuickTaskModal isOpen={isQuickTaskOpen} onClose={() => setIsQuickTaskOpen(false)} onSave={() => {}} />
            </div>
        </div>
    );
};


const AuthRoutes: React.FC = () => {
    const { user, loading, login, logout, signup, refreshUser } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (email, password) => {
        await login(email, password);
        navigate('/today', { replace: true });
    };
    
    const handleSignup = async (email, password, fullName) => {
        await signup(email, password, fullName);
        navigate('/onboarding', { replace: true });
    };

    const handleOnboardingComplete = () => {
        refreshUser();
        navigate('/today', { replace: true });
    };

    if (loading) {
        return <PageLoader />;
    }

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {!user ? (
                    <>
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        <Route path="/signup" element={<SignupPage />} />
                        {/* The activation pages are now legacy/deprecated but kept for route safety */}
                        <Route path="/activate-account" element={<ActivateAccountPage />} />
                        <Route path="/join" element={<AcceptInvitationPage />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    <>
                         {/* 
                            ROUTE GUARD: If user hasn't completed onboarding, they MUST go there.
                            Otherwise, they can access the rest of the app.
                         */}
                         {!user.hasCompletedOnboarding ? (
                            <>
                                <Route path="/onboarding" element={<OnboardingPage onComplete={handleOnboardingComplete} />} />
                                <Route path="*" element={<Navigate to="/onboarding" replace />} />
                            </>
                         ) : (
                            <>
                                <Route path="/onboarding" element={<Navigate to="/today" replace />} />
                                <Route path="/login" element={<Navigate to="/today" replace />} />
                                <Route path="/signup" element={<Navigate to="/today" replace />} />
                                <Route path="/activate-account" element={<Navigate to="/today" replace />} />
                                <Route path="/join" element={<Navigate to="/today" replace />} />
                                <Route path="/*" element={<AppContent user={user} onLogout={logout} refreshUser={refreshUser} />} />
                            </>
                         )}
                    </>
                )}
            </Routes>
        </Suspense>
    );
};

const App: React.FC = () => (
    <HashRouter>
        <AuthRoutes />
    </HashRouter>
);

export default App;
