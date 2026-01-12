'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Trash2, PlusCircle } from 'lucide-react';
import { getChats, deleteChat } from '@/app/actions/history';

interface ChatHistoryProps {
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export function ChatHistory({ currentChatId, onSelectChat, onNewChat }: ChatHistoryProps) {
  const [chats, setChats] = useState<any[]>([]);

  const loadChats = async () => {
    const data = await getChats();
    setChats(data);
  };

  useEffect(() => {
    loadChats();
  }, [currentChatId]); // Reload when chat changes (e.g. created new one)

  const handleDelete = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      await deleteChat(id);
      loadChats();
      if (id === currentChatId) onNewChat();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border rounded-xl shadow-sm">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <span className="font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> History
        </span>
        <button onClick={onNewChat} className="text-blue-600 hover:text-blue-800" title="New Chat">
          <PlusCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-3 rounded-lg cursor-pointer text-sm flex justify-between group transition-colors ${
              currentChatId === chat.id ? 'bg-blue-50 text-blue-700 border-blue-200 border' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="truncate max-w-[160px]">{chat.title}</span>
            <button 
              onClick={(e) => handleDelete(e, chat.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {chats.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">No history yet.</div>}
      </div>
    </div>
  );
}