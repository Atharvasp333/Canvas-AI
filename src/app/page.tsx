'use client';

import { useState } from 'react';
import { useUIState, useActions } from 'ai/rsc';
import type { AI } from '@/app/context/ai';
import { Send } from 'lucide-react';
import { CsvUploader } from '@/components/csv-uploader';
import { DataManager } from "@/components/DataManager";
import { ChatHistory } from "@/components/ChatHistory";
import { createChat, getChatMessages } from '@/app/actions/history';
import { DynamicChart } from '@/components/dashboard/DynamicChart'; // Use the new DynamicChart
import { SalesTable } from '@/components/dashboard/SalesTable';

export default function Chat() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useUIState<typeof AI>();
  const { submitUserMessage } = useActions();
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const handleSelectChat = async (id: string) => {
    setCurrentChatId(id);
    const dbMessages = await getChatMessages(id);
    
    // HYDRATION LOGIC
    const uiMessages = dbMessages.map((msg: any) => {
      let display;
      
      if (msg.role === 'user') {
        display = <div className="ml-auto bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none max-w-[80%] mb-4 text-right shadow-sm">{msg.content}</div>;
      } else {
        // --- FIX STARTS HERE ---
        if (msg.type === 'text') {
           display = <div className="text-gray-600 bg-white p-4 rounded-xl shadow-sm border">{msg.content}</div>;
        } 
        else if (msg.type === 'chart') {
           // CASE 1: It's a Dashboard (Array of Charts)
           if (Array.isArray(msg.data) && msg.data.length > 0 && msg.data[0].chartType) {
             display = (
               <div className={`grid gap-4 w-full ${msg.data.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                 {msg.data.map((chart: any, idx: number) => (
                   <DynamicChart 
                     key={idx}
                     title={chart.title}
                     data={chart.data}
                     chartType={chart.chartType} // TypeScript might complain, ignore or cast
                     description={chart.description}
                   />
                 ))}
               </div>
             );
           } 
           // CASE 2: It's a Single Chart (Saved as Object { data: [], type: '...' })
           else if (msg.data && !Array.isArray(msg.data) && msg.data.data) {
             display = (
               <DynamicChart 
                 title={msg.content || "Analysis"} 
                 data={msg.data.data} 
                 chartType={msg.data.type || 'bar'} 
               />
             );
           }
           // CASE 3: Legacy Fallback (Old simple array data)
           else {
             display = <DynamicChart title="Analysis" data={msg.data} chartType="bar" />;
           }
        } 
        else if (msg.type === 'table') {
           display = <SalesTable title="Query Results" rows={msg.data} />;
        }
        // --- FIX ENDS HERE ---
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

                let activeId = currentChatId;
                if (!activeId) {
                  const newChat = await createChat(inputValue);
                  if (newChat) {
                    activeId = newChat.id;
                    setCurrentChatId(newChat.id);
                  }
                }

                setMessages((curr) => [
                    ...curr,
                    {
                    id: Date.now(),
                    display: <div className="ml-auto bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none max-w-[80%] mb-4 text-right shadow-sm">{inputValue}</div>,
                    },
                ]);

                const value = inputValue;
                setInputValue('');

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