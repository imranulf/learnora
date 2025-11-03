import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HubIcon from '@mui/icons-material/Hub';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useColorScheme } from '@mui/material/styles';
import type { Authentication, Navigation } from '@toolpad/core';
import { ReactRouterAppProvider } from "@toolpad/core/react-router";
import * as React from 'react';
import SessionContext, { type Session } from '../../contexts/SessionContext';
import { getCurrentSession, signOut } from '../../services/auth';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'user-knowledge',
    title: 'Knowledge Dashboard',
    icon: <PsychologyIcon />,
  },
  {
    segment: 'learning-path',
    title: 'Learning Paths',
    icon: <AccountTreeIcon />,
  },
  {
    segment: 'knowledge-graph',
    title: 'Knowledge Graph',
    icon: <HubIcon />,
  },
  {
    segment: 'concept-management',
    title: 'Concept Management',
    icon: <CategoryIcon />,
  },
  {
    segment: 'content-discovery',
    title: 'Discover Content',
    icon: <SearchIcon />,
  },
  {
    segment: 'preferences',
    title: 'Preferences',
    icon: <SettingsIcon />,
  },
  {
    segment: 'orders',
    title: 'Orders',
    icon: <ShoppingCartIcon />,
  },
];

const BRANDING = {
  title: 'Learnora',
};

// Component to sync MUI dark mode with Tailwind
function DarkModeSync() {
  const { mode } = useColorScheme();

  React.useEffect(() => {
    // Sync MUI dark mode with Tailwind by adding/removing 'dark' class on html element
    const htmlElement = document.documentElement;
    if (mode === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [mode]);

  return null;
}

export default function AppProviderWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  const sessionContextValue = React.useMemo(
    () => ({
      session,
      setSession,
      loading,
    }),
    [session, loading],
  );

  // Create authentication object with access to setSession
  const authentication: Authentication = React.useMemo(
    () => ({
      signIn: () => {
        // This is handled by the SignInPage component
        // No-op function, actual sign-in happens in SignInPage
      },
      signOut: async () => {
        // Call the signOut function to clear backend session and localStorage
        await signOut();
        // Clear the session state to trigger redirect to login
        setSession(null);
      },
    }),
    []
  );

  React.useEffect(() => {
    // Check for existing session on mount
    getCurrentSession()
      .then((currentSession: Session | null) => {
        setSession(currentSession);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <ReactRouterAppProvider
      navigation={NAVIGATION}
      branding={BRANDING}
      session={session}
      authentication={authentication}
    >
      <DarkModeSync />
      <SessionContext.Provider value={sessionContextValue}>
        {children}
      </SessionContext.Provider>
    </ReactRouterAppProvider>
  );
}
