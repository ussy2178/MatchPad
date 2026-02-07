import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { TeamList } from './components/TeamList/TeamList';
// PlayerList is now used inside TeamDetailPage, but router doesn't need it directly page-level anymore
// import { PlayerList } from './components/PlayerList/PlayerList'; 
import { MatchCreationWizard } from './components/Match/MatchCreationWizard';
import { WatchMode } from './components/WatchMode/WatchMode';
import SavedMatchesPage from './pages/SavedMatchesPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { StatsPage } from './pages/StatsPage';
import { fixLegacyData } from './utils/idUtils';
import { syncPlayersToSupabase } from './services/playerSync';

import { Outlet } from 'react-router-dom';
import { NavigationLayer } from './components/common/NavigationLayer';

// Root Layout to include NavigationLayer
function RootLayout() {
  return (
    <>
      <NavigationLayer />
      <Outlet />
    </>
  );
}

// Define router outside of component to avoid recreation
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: (
          <Layout>
            <TeamList />
          </Layout>
        ),
      },
      {
        path: '/saved-matches',
        element: (
          <Layout>
            <SavedMatchesPage />
          </Layout>
        ),
      },
      {
        path: '/team/:teamId',
        element: (
          <Layout>
            <TeamDetailPage />
          </Layout>
        ),
      },
      {
        path: '/match/new',
        element: <MatchCreationWizard />,
      },
      {
        path: '/match/:matchId/watch',
        element: <WatchMode />,
      },
      {
        path: '/stats',
        element: (
          <Layout>
            <StatsPage />
          </Layout>
        ),
      },
    ]
  }
]);

function App() {
  useEffect(() => {
    fixLegacyData();
    syncPlayersToSupabase();
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
