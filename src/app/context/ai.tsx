import { createAI } from 'ai/rsc';
import { submitUserMessage } from '@/app/actions';

// Define the state types
export type AIState = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  name?: string;
}[];

export type UIState = {
  id: number;
  display: React.ReactNode;
}[];

// Create the AI Provider
export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: [],
});