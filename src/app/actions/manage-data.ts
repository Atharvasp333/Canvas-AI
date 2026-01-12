'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getUserTables() {
  try {
    // Uses the RPC function we created earlier to bypass cache
    const { data, error } = await supabase.rpc('get_user_tables');
    
    if (error) throw new Error(error.message);
    
    // Format the raw list
    // We filter for "user_" just to be double-safe
    const tables = (data || [])
      .map((t: { table_name: string }) => t.table_name)
      .filter((name: string) => name.startsWith('user_'))
      .sort((a: string, b: string) => b.localeCompare(a)); // Newest first

    return { success: true, tables };
  } catch (error: any) {
    console.error("Fetch Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTable(tableName: string) {
  try {
    if (!tableName.startsWith('user_')) {
      throw new Error("Security Check: You can only delete user tables.");
    }

    const query = `DROP TABLE IF EXISTS "${tableName}";`;
    
    console.log("🗑️ Deleting:", tableName);
    const { error } = await supabase.rpc('exec_sql', { query });

    if (error) throw new Error(error.message);

    // Refresh the UI cache so the list updates immediately
    revalidatePath('/');
    
    return { success: true };
  } catch (error: any) {
    console.error("Delete Error:", error);
    return { success: false, error: error.message };
  }
}