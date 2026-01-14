'use server';

import { createStreamableUI } from 'ai/rsc'; // We still use this to return the component
import { supabase } from '@/lib/supabase';
import { inngest } from "@/inngest/client";
import { MessageLoader } from '@/components/MessageLoader';
import { saveMessage } from '@/app/actions/history';

export async function submitUserMessage(input: string, chatId: string) {
  'use server';

  // 1. Save User Message
  await saveMessage(chatId, 'user', 'text', input);

  // 2. Create Placeholder Assistant Message
  // We insert a row with NULL data. The Loader will watch this row.
  const { data: placeholderMsg, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      role: 'assistant',
      type: 'text', // Default type
      content: 'Analyzing...', // Placeholder text
      data: null // Empty data signals "loading" to our logic
    })
    .select()
    .single();

  if (error || !placeholderMsg) {
    return { id: Date.now(), display: <div>Error creating message</div> };
  }

  // 3. Trigger Inngest (Fire and Forget)
  await inngest.send({
    name: "app/ai.query",
    data: {
      chatId,
      message: input,
      messageId: placeholderMsg.id // Pass the ID so Inngest knows what to update
    }
  });

  // 4. Return the Smart Loader UI
  // The UI immediately renders this component, which handles the waiting.
  const ui = createStreamableUI(
    <MessageLoader messageId={placeholderMsg.id} />
  );
  
  ui.done();

  return {
    id: placeholderMsg.id,
    display: ui.value,
  };
}