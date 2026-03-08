import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ChatWindow, type ChatMessage } from './ChatWindow';
import { useStartChat, useContinueChat, useChatSession } from './queries';
import { useChatContext } from '../../hooks/useChatContext';
import type { Message, AgentMode } from './types';

export interface ConnectedChatWindowProps {
  readonly agentTitle?: string;
  readonly mode?: AgentMode;
  readonly onLearningPathCreated?: (threadId: string) => void;
}

/**
 * ConnectedChatWindow - Integrates ChatWindow with the chat API via React Query.
 *
 * Handles:
 * - Starting new chat sessions with optional mode (LPP for learning path planning)
 * - Continuing existing chat sessions
 * - Loading messages from ChatContext active thread
 * - Converting between API message format and UI message format
 * - Syncing thread ID with ChatContext (localStorage persistence)
 */
export function ConnectedChatWindow({
  agentTitle = 'Learnora AI',
  mode,
  onLearningPathCreated,
}: ConnectedChatWindowProps): ReactNode {
  const { activeThreadId, setActiveThreadId } = useChatContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const startChatMutation = useStartChat();
  const continueChatMutation = useContinueChat(activeThreadId || '');

  // Load existing chat session from ChatContext
  const { data: existingSession } = useChatSession(activeThreadId);

  const convertToUIMessage = useCallback((apiMessage: Message, index: number): ChatMessage => ({
    id: `msg-${index}-${Date.now()}`,
    sender: apiMessage.role === 'human' ? 'user' : 'assistant',
    text: apiMessage.content,
    timestamp: new Date(),
  }), []);

  // Update messages when start chat mutation succeeds
  useEffect(() => {
    if (startChatMutation.isSuccess && startChatMutation.data) {
      const { thread_id, messages: apiMessages, learning_path_json } = startChatMutation.data;
      setActiveThreadId(thread_id);
      setMessages(apiMessages.map(convertToUIMessage));

      if (learning_path_json && onLearningPathCreated) {
        onLearningPathCreated(thread_id);
      }
    }
  }, [startChatMutation.isSuccess, startChatMutation.data, setActiveThreadId, convertToUIMessage, onLearningPathCreated]);

  // Update messages when continue chat mutation succeeds
  useEffect(() => {
    if (continueChatMutation.isSuccess && continueChatMutation.data) {
      const { messages: apiMessages, learning_path_json, thread_id } = continueChatMutation.data;
      setMessages(apiMessages.map(convertToUIMessage));

      if (learning_path_json && onLearningPathCreated) {
        onLearningPathCreated(thread_id);
      }
    }
  }, [continueChatMutation.isSuccess, continueChatMutation.data, convertToUIMessage, onLearningPathCreated]);

  // Load messages from existing session
  useEffect(() => {
    if (existingSession?.messages) {
      setMessages(existingSession.messages.map(convertToUIMessage));
    }
  }, [existingSession?.messages, convertToUIMessage]);

  const handleSendMessage = (message: string) => {
    if (activeThreadId) {
      continueChatMutation.mutate({ message, mode });
    } else {
      startChatMutation.mutate({ message, mode });
    }
  };

  const isLoading = startChatMutation.isPending || continueChatMutation.isPending;
  const mutationError = startChatMutation.error || continueChatMutation.error;
  const errorMessage = mutationError instanceof Error ? mutationError.message : mutationError ? String(mutationError) : null;

  return (
    <ChatWindow
      agentTitle={agentTitle}
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      error={errorMessage}
    />
  );
}
