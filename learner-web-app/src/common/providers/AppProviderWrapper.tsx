import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ExploreIcon from '@mui/icons-material/Explore';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import QuizIcon from '@mui/icons-material/Quiz';
import { useColorScheme } from '@mui/material/styles';
import type { Authentication, Navigation } from '@toolpad/core';
import { ReactRouterAppProvider } from "@toolpad/core/react-router";
import * as React from 'react';
import SessionContext, { type Session } from '../../contexts/SessionContext';
import { getCurrentSession, signOut } from '../../services/auth';

/**
 * Simplified Navigation Structure
 *
 * 5 core sections designed for clarity and ease of use:
 * 1. Home - Dashboard with personalized guidance
 * 2. Learn - Learning paths and progress tracking
 * 3. Practice - Quizzes and skill assessments
 * 4. Discover - Find new learning content
 * 5. Profile - Settings and knowledge overview
 */
const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Your Learning',
  },
  {
    title: 'Home',
    icon: <HomeIcon />,
  },
  {
    segment: 'learn',
    title: 'Learn',
    icon: <AutoStoriesIcon />,
  },
  {
    segment: 'practice',
    title: 'Practice',
    icon: <QuizIcon />,
  },
  {
    segment: 'discover',
    title: 'Discover',
    icon: <ExploreIcon />,
  },
  {
    kind: 'divider',
  },
  {
    kind: 'header',
    title: 'You',
  },
  {
    segment: 'profile',
    title: 'Profile',
    icon: <PersonIcon />,
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
