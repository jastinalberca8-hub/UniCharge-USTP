import React from 'react';
import { UniChargeProvider, useUniCharge } from './context/UniChargeContext';
import { UnifiedAuthPage } from './components/auth/UnifiedAuthPage';
import { PortalLayout } from './components/layout/PortalLayout';

const AppRouter: React.FC = () => {
  const { isAuthenticated, currentUser, currentRoute } = useUniCharge();

  if (!isAuthenticated || !currentUser || currentRoute === '/login' || currentRoute === '/signup') {
    return <UnifiedAuthPage />;
  }

  return <PortalLayout />;
};

export default function App() {
  return (
    <UniChargeProvider>
      <AppRouter />
    </UniChargeProvider>
  );
}
