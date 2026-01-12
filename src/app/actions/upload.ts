'use server';

import { supabase } from '@/lib/supabase';

// SANITIZER: Clean keys to be safe variable names
function sanitizeKey(key: string): string {
  return key.trim()
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace weird chars with _
    .toLowerCase()
    .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
}

// VALUE CLEANER: Just remove basic garbage, but keep it as text
function cleanValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    // Remove invisible characters and backslashes
    return value.replace(/[\u0000-\u001F\u007F-\u009F\\]/g, "").trim();
  }
  return value;
}

export async function uploadCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) return { success: false, error: "Empty CSV" };

  try {
    const tableName = `user_${filename}_${Date.now()}`;
    
    // Get headers from the first row
    // Filter out empty keys to prevent SQL errors
    const originalHeaders = Object.keys(rows[0]).filter(k => k && k.trim() !== '');

    // 1. Generate CREATE TABLE SQL
    // STRATEGY: Create EVERYTHING as TEXT. This prevents "Type Mismatch" errors (Nulls).
    const columnDefs = originalHeaders.map(header => {
      const safeHeader = sanitizeKey(header);
      return `${safeHeader} TEXT`; 
    }).join(', \n');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnDefs}
      );
    `;

    console.log("🚀 Creating Table (All Text):", tableName);
    const { error: createError } = await supabase.rpc('exec_sql', { query: createTableSQL });
    if (createError) throw new Error(`Failed to create table: ${createError.message}`);

    // 2. PREPARE DATA
    const sanitizedRows = rows.map(row => {
      const newRow: any = {};
      originalHeaders.forEach(header => {
        const safeHeader = sanitizeKey(header);
        const value = cleanValue(row[header]);
        newRow[safeHeader] = value;
      });
      return newRow;
    });

    console.log(`🚀 Inserting ${sanitizedRows.length} rows...`);

    // 3. INSERT via RPC
    const { error: insertError } = await supabase.rpc('insert_via_json', { 
      table_name: tableName, 
      data: sanitizedRows 
    });

    if (insertError) throw new Error(`Failed to insert data: ${insertError.message}`);

    console.log("✅ Upload Complete:", tableName);
    return { success: true, tableName };

  } catch (error: any) {
    console.error("Upload Error:", error);
    return { success: false, error: error.message };
  }
}