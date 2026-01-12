'use client';

import { useState } from 'react';
import { useUIState, useActions } from 'ai/rsc';
import type { AI } from '@/app/context/ai';
import { Send } from 'lucide-react';
import { CsvUploader } from '@/components/csv-uploader';

export default function Chat() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useUIState<typeof AI>();
  const { submitUserMessage } = useActions();

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-black">
      {/* Header */}
      <header className="p-4 bg-white border-b shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          NovaTech BI Agent
        </h1>
        <div className="text-xs text-gray-400">Powered by Gemini 2.0</div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        
        {/* Upload Section - Scrolls with content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <CsvUploader />
          
          {/* Chat Messages Loop */}
          {messages.map((message) => (
            <div key={message.id} className="fade-in-up">
              {message.display}
            </div>
          ))}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="p-4 bg-white border-t rounded-t-2xl shadow-up">
          <form
            className="max-w-3xl mx-auto relative flex items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!inputValue.trim()) return;

              // 1. Add User Message to UI
              setMessages((currentMessages) => [
                ...currentMessages,
                {
                  id: Date.now(),
                  display: <div className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-2xl max-w-[80%] mb-4 text-right">{inputValue}</div>,
                },
              ]);

              const value = inputValue;
              setInputValue('');

              // 2. Submit to Server Action
              const responseMessage = await submitUserMessage(value);

              // 3. Add AI Response to UI
              setMessages((currentMessages) => [
                ...currentMessages,
                responseMessage,
              ]);
            }}
          >
            <input
              className="flex-1 border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="Ask: Show me sales trends or upload a CSV..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}