import React from 'react';
import { AppRoutes } from './AppRoutes';
import { AppSessionProvider } from './AppSessionContext';

const App: React.FC = () => {
  return (
    <AppSessionProvider>
      <AppRoutes />
    </AppSessionProvider>
  );
};

export default App;
