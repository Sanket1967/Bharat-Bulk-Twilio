import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Helmet } from 'react-helmet-async';
import { Lock } from 'lucide-react';

// Page-level service-access guard. Renders a friendly "not enabled" state when
// a logged-in user lacks the required service flag, instead of silently
// showing the page. This complements (does not replace) the server-side
// checkServiceAccess middleware.
//
//   <ServiceGuard service="international"><TwilioCampaignPage/></ServiceGuard>
//   <ServiceGuard service="domestic"><CampaignsPage/></ServiceGuard>
//   <ServiceGuard service="api"><ApiKeysPage/></ServiceGuard>
//
// Admins always pass. Logged-out users are bounced to /login by the
// surrounding ProtectedRoute, so we only handle the authenticated case here.
const ServiceGuard = ({ service, children }) => {
  const { isAuthenticated, isAdmin, canUseInternational, canUseDomestic, isApiEnabled } =
    useAuth();

  if (!isAuthenticated) return children;

  if (isAdmin) return children;

  let allowed;
  if (service === 'international') allowed = canUseInternational;
  else if (service === 'domestic') allowed = canUseDomestic;
  else if (service === 'api') allowed = isApiEnabled;
  else allowed = true;

  if (allowed) return children;

  const label =
    service === 'international'
      ? 'International SMS'
      : service === 'domestic'
        ? 'Domestic SMS'
        : 'API access';

  return (
    <>
      <Helmet>
        <title>{label} not enabled - Bharat Bulk SMS</title>
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">
              {label} not enabled
            </h1>
            <p className="text-muted-foreground">
              {label} is not enabled for your account. Please contact your
              administrator to request access.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ServiceGuard;
