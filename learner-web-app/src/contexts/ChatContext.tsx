import { useState, useEffect, type ReactNode } from 'react';
import { ChatContext } from './ChatContextDef';

const STORAGE_KEY = 'learnora_active_thread_id';

interface ChatProviderProps {
  readonly children: ReactNode;
}

/**
 * ChatProvider - Manages active chat thread ID with localStorage persistence.
 * Allows any component to access/update the active chat thread.
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedThreadId = localStorage.getItem(STORAGE_KEY);
    if (storedThreadId) {
      setActiveThreadIdState(storedThreadId);
    }
    setIsHydrated(true);
  }, []);

  const setActiveThreadId = (threadId: string | null) => {
    setActiveThreadIdState(threadId);
    if (threadId) {
      localStorage.setItem(STORAGE_KEY, threadId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearActiveThread = () => {
    setActiveThreadId(null);
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <ChatContext.Provider
      value={{
        activeThreadId,
        setActiveThreadId,
        clearActiveThread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
