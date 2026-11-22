import React from 'react';
import { UniChargeProvider, useUniCharge } from './context/UniChargeContext';
import { UnifiedAuthPage } from './components/auth/UnifiedAuthPage';
import { GoogleOnboardingPage } from './components/auth/GoogleOnboardingPage';
import { PortalLayout } from './components/layout/PortalLayout';
import { FirestoreErrorBoundary } from './components/common/FirestoreErrorBoundary';

const AppRouter: React.FC = () => {
  const { isAuthenticated, currentUser, currentRoute } = useUniCharge();

  if (!isAuthenticated || !currentUser || currentRoute === '/login' || currentRoute === '/signup') {
    return <UnifiedAuthPage />;
  }

  if (
    currentRoute === '/onboarding' ||
    (currentUser.role !== 'admin' && currentUser.profileCompleted === false)
  ) {
    return <GoogleOnboardingPage />;
  }

  return <PortalLayout />;
};

export default function App() {
  return (
    <FirestoreErrorBoundary>
      <UniChargeProvider>
        <AppRouter />
      </UniChargeProvider>
    </FirestoreErrorBoundary>
  );
}
