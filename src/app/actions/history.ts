'use server';

import { supabase } from '@/lib/supabase';

// 1. Create a New Chat
export async function createChat(firstMessage: string) {
  const title = firstMessage.substring(0, 30) + "..."; // Auto-title
  const { data, error } = await supabase
    .from('chats')
    .insert({ title })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// 2. Save a Message (User or AI)
export async function saveMessage(chatId: string, role: 'user' | 'assistant', type: 'text' | 'chart' | 'table', content: string, data?: any) {
  const { error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      role,
      type,
      content,
      data
    });

  if (error) console.error("Save Error:", error);
}

// 3. Get All Chats for Sidebar
export async function getChats() {
  const { data } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

// 4. Get Messages for a Specific Chat
export async function getChatMessages(chatId: string) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  return data || [];
}

// 5. Delete Chat
export async function deleteChat(chatId: string) {
    await supabase.from('chats').delete().eq('id', chatId);
    return { success: true };
}