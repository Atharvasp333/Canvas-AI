'use client';

import { useState, useEffect } from 'react';
import { useUIState, useActions } from 'ai/rsc';
import type { AI } from '@/app/context/ai';
import { Send } from 'lucide-react';
import { CsvUploader } from '@/components/csv-uploader';
import { DataManager } from "@/components/DataManager";
import { ChatHistory } from "@/components/ChatHistory";
import { createChat, getChatMessages } from '@/app/actions/history';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SalesTable } from '@/components/dashboard/SalesTable';

export default function Chat() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useUIState<typeof AI>();
  const { submitUserMessage } = useActions();
  
  // State for History
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // HYDRATION: When clicking a chat history item, load and render it
  const handleSelectChat = async (id: string) => {
    setCurrentChatId(id);
    const dbMessages = await getChatMessages(id);
    
    // Convert DB data -> React UI Components
    const uiMessages = dbMessages.map((msg: any) => {
      let display;
      
      if (msg.role === 'user') {
        display = <div className="ml-auto bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none max-w-[80%] mb-4 text-right shadow-sm">{msg.content}</div>;
      } else {
        // Assistant Message
        if (msg.type === 'text') {
           // Fallback for old plain text errors
           display = <div className="text-gray-500">{msg.content || "No content"}</div>;
        } else if (msg.type === 'chart') {
           display = <RevenueChart title="Analysis Result" data={msg.data} />;
        } else if (msg.type === 'table') {
           display = <SalesTable title="Query Results" rows={msg.data} />;
        }
      }

      return {
        id: msg.id,
        display: display
      };
    });

    setMessages(uiMessages);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-black font-sans">
      <header className="p-4 bg-white border-b shadow-sm sticky top-0 z-10 flex justify-between items-center h-16 shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">NovaTech BI Agent</h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden w-full max-w-7xl mx-auto p-4 gap-6 grid grid-cols-1 lg:grid-cols-4">
        
        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pb-4 h-full">
            <ChatHistory 
              currentChatId={currentChatId} 
              onSelectChat={handleSelectChat} 
              onNewChat={handleNewChat}
            />
            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 mb-2 uppercase">Tools</h2>
                <CsvUploader />
            </div>
            <DataManager />
        </aside>

        {/* RIGHT AREA: Chat */}
        <section className="lg:col-span-3 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                        <p>Start a new conversation.</p>
                    </div>
                )}
                {messages.map((message) => (
                    <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {message.display}
                    </div>
                ))}
            </div>

            <div className="p-4 bg-white border-t">
            <form
                className="relative flex items-center gap-2"
                onSubmit={async (e) => {
                e.preventDefault();
                if (!inputValue.trim()) return;

                // 1. Ensure we have a Chat ID (Create one if new)
                let activeId = currentChatId;
                if (!activeId) {
                  const newChat = await createChat(inputValue);
                  if (newChat) {
                    activeId = newChat.id;
                    setCurrentChatId(newChat.id);
                  }
                }

                // 2. UI Optimistic Update
                setMessages((curr) => [
                    ...curr,
                    {
                    id: Date.now(),
                    display: <div className="ml-auto bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none max-w-[80%] mb-4 text-right shadow-sm">{inputValue}</div>,
                    },
                ]);

                const value = inputValue;
                setInputValue('');

                // 3. Submit with Chat ID
                if (activeId) {
                   const responseMessage = await submitUserMessage(value, activeId);
                   setMessages((curr) => [...curr, responseMessage]);
                }
                }}
            >
                <input
                className="flex-1 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
                placeholder="Ask about data..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit" disabled={!inputValue.trim()} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-all shadow-md">
                <Send size={20} />
                </button>
            </form>
            </div>
        </section>

      </main>
    </div>
  );
}