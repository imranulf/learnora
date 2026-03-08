export type Message = {
  role: 'human' | 'ai' | 'system';
  content: string;
}

export type ChatSession = {
  thread_id: string;
  messages: Message[];
  topic?: string;
  learning_path_json?: unknown;
  learning_path?: unknown;
}

export const AgentMode = {
  BASIC: "basic",
  LPP: "lpp",
} as const;

export type AgentMode = typeof AgentMode[keyof typeof AgentMode];

export type StartChatParams = {
  message?: string;
  mode?: AgentMode;
}

export type ContinueChatParams = {
  message: string;
  mode?: AgentMode;
}
