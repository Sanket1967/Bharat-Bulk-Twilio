import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import ServiceGuard from './components/ServiceGuard.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import PasswordResetPage from './pages/PasswordResetPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import ContactListsPage from './pages/ContactListsPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import CampaignComposePage from './pages/CampaignComposePage.jsx';
import CampaignDetailsPage from './pages/CampaignDetailsPage.jsx';
import DeliveryLogsPage from './pages/DeliveryLogsPage.jsx';
import ComplianceDashboard from './pages/ComplianceDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminLogsPage from './pages/AdminLogsPage.jsx';
import SMPPSettingsPage from './pages/SMPPSettingsPage.jsx';
import UnsubscribePage from './pages/UnsubscribePage.jsx';
import ManageSenderIDPage from './pages/ManageSenderIDPage.jsx';
import ManageTemplatePage from './pages/ManageTemplatePage.jsx';
import TwilioReportsPage from './pages/TwilioReportsPage.jsx';
import TwilioCampaignPage from './pages/TwilioCampaignPage.jsx';
import ApiKeysPage from './pages/ApiKeysPage.jsx';
import InternationalApiDocsPage from './pages/InternationalApiDocsPage.jsx';
import DomesticApiDocsPage from './pages/DomesticApiDocsPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/unsubscribe/:contactId" element={<UnsubscribePage />} />
          
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/contacts"
            element={<ProtectedRoute><ServiceGuard service="domestic"><ContactsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/contacts/lists"
            element={<ProtectedRoute><ServiceGuard service="domestic"><ContactListsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/campaigns"
            element={<ProtectedRoute><ServiceGuard service="domestic"><CampaignsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/campaigns/compose"
            element={<ProtectedRoute><ServiceGuard service="domestic"><CampaignComposePage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/campaigns/:id"
            element={<ProtectedRoute><ServiceGuard service="domestic"><CampaignDetailsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/delivery-logs"
            element={<ProtectedRoute><ServiceGuard service="domestic"><DeliveryLogsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/manage-senderid"
            element={<ProtectedRoute><ServiceGuard service="domestic"><ManageSenderIDPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/manage-template"
            element={<ProtectedRoute><ServiceGuard service="domestic"><ManageTemplatePage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/compliance"
            element={<ProtectedRoute><ServiceGuard service="domestic"><ComplianceDashboard /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/reports"
            element={<ProtectedRoute><ServiceGuard service="international"><TwilioReportsPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/twilio-campaign"
            element={<ProtectedRoute><ServiceGuard service="international"><TwilioCampaignPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route
            path="/api-keys"
            element={<ProtectedRoute><ServiceGuard service="api"><ApiKeysPage /></ServiceGuard></ProtectedRoute>}
          />
          <Route path="/api-docs" element={<InternationalApiDocsPage />} />
          <Route path="/api-docs/international" element={<InternationalApiDocsPage />} />
          <Route path="/api-docs/domestic" element={<DomesticApiDocsPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />
          <Route
            path="/admin/users"
            element={<AdminRoute><AdminUsersPage /></AdminRoute>}
          />
          <Route
            path="/admin/logs"
            element={<AdminRoute><AdminLogsPage /></AdminRoute>}
          />
          <Route
            path="/admin/smpp-settings"
            element={<AdminRoute><SMPPSettingsPage /></AdminRoute>}
          />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;