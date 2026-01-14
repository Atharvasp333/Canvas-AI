import { inngest } from "../client";
import { supabase } from "@/lib/supabase"; 

export const processCsvUpload = inngest.createFunction(
  { id: "process-csv-upload" }, 
  { event: "app/csv.upload" },  
  async ({ event, step }) => {
    const { table_name, file_data } = event.data;

    // Step 1: Create Table
    await step.run("create-table", async () => {
      const headers = Object.keys(file_data[0]);
      const safeHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const columnDefs = safeHeaders.map(h => `"${h}" text`).join(", ");
      
      const query = `CREATE TABLE IF NOT EXISTS "${table_name}" (${columnDefs});`;
      const { error } = await supabase.rpc('exec_sql', { query });
      
      if (error) throw new Error(`Table creation failed: ${error.message}`);
      return { success: true };
    });

    // Step 2: Insert Data
    await step.run("insert-data", async () => {
      const headers = Object.keys(file_data[0]);
      const safeHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      
      const formattedRows = file_data.map((row: any) => {
        const newRow: any = {};
        headers.forEach((h, i) => newRow[safeHeaders[i]] = row[h]?.toString() || "");
        return newRow;
      });

      const BATCH_SIZE = 1000;
      for (let i = 0; i < formattedRows.length; i += BATCH_SIZE) {
        const batch = formattedRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table_name).insert(batch);
        if (error) throw new Error(`Batch insert failed: ${error.message}`);
      }
      return { count: formattedRows.length };
    });

    return { table: table_name, status: "complete" };
  }
);