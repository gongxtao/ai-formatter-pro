import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;

  setConversationId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  finalizeStreaming: () => void;
  clearMessages: () => void;
  initConversation: (conversationId: string, messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  streamingContent: '',

  setConversationId: (id) => set({ conversationId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content, isStreaming: false };
          break;
        }
      }
      return { messages };
    }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finalizeStreaming: () =>
    set((state) => {
      const messages = [...state.messages];
      const streamingContent = state.streamingContent;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].isStreaming) {
          messages[i] = { ...messages[i], content: streamingContent, isStreaming: false };
          break;
        }
      }
      return { messages, streamingContent: '' };
    }),

  clearMessages: () => set({ messages: [], streamingContent: '' }),

  initConversation: (conversationId, messages) =>
    set({
      conversationId,
      messages,
      streamingContent: '',
      isLoading: false,
    }),
}));
