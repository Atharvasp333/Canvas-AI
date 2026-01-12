'use server';

import { createStreamableUI } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { streamUI } from 'ai/rsc';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SalesTable } from '@/components/dashboard/SalesTable';
import { saveMessage } from '@/app/actions/history'; 

export async function submitUserMessage(input: string, chatId: string) {
  'use server';

  const ui = createStreamableUI(
    <div className="inline-flex items-center gap-2 text-gray-500">
      <span className="animate-spin">⏳</span> Thinking...
    </div>
  );

  (async () => {
    try {
      // --- SAVE USER MESSAGE ---
      await saveMessage(chatId, 'user', 'text', input);

      // 1. FETCH & CLEAN SCHEMA
      const { data: schemaData } = await supabase.rpc('get_user_schema_details');

      let userSchemaContext = "No custom tables found.";
      
      if (schemaData && schemaData.length > 0) {
        const tables: Record<string, any[]> = {};
        schemaData.forEach((row: any) => {
          if (!tables[row.table_name]) tables[row.table_name] = [];
          tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });

        // Format for AI context
        userSchemaContext = Object.entries(tables).map(([name, cols]) => {
          return `- Table '${name}': Columns [ ${cols.join(', ')} ]`;
        }).join('\n');
      }

      console.log("🔍 AI Context - User Schema:", userSchemaContext);

      const dbSchema = `
        CORE DEMO DATA (Use only if user asks about 'NovaTech'):
        - sales, products, customers

        USER UPLOADED DATA (PRIORITY):
        ${userSchemaContext}
      `;

      // 2. AI ORCHESTRATION
      const result = await streamUI({
        model: google('gemini-2.5-flash'), 
        system: `
          You are a BI Analyst.
          **CURRENT DATE:** ${new Date().toISOString()}
          
          **DATA SCHEMA:**
          ${dbSchema}

          **CRITICAL RULES:**
          1. **Pick the Right Table:** If multiple versions exist, ALWAYS use the one with the LARGEST timestamp suffix.
          
          2. **Data Types (ALL TEXT):** - **Numbers:** "SUM(NULLIF(col, '')::numeric)"
             - **Dates:** The user data likely uses 'DD-MM-YYYY' format.
               - WRONG: "col::date"
               - CORRECT: "to_date(NULLIF(date_col, ''), 'DD-MM-YYYY')"

          3. **Multi-Table Math (CRITICAL):**
             - NEVER do "FROM table1, table2" (Cross Join). It multiplies the results!
             - **CORRECT:** Use independent subqueries for each total.
               Example: "SELECT (SELECT SUM(...) FROM sales) - (SELECT SUM(...) FROM marketing) AS result"

          4. **No Empty Queries:** You MUST call 'visualize_data' with a valid SQL string.
        `,
        prompt: input,
        tools: {
          visualize_data: {
            description: 'Execute SQL and show the result.',
            // Flexible parameters to catch AI inconsistencies
            parameters: z.object({
              query: z.string().optional().describe('The SQL query'),
              sql: z.string().optional().describe('Alternative parameter'),
              sql_query: z.string().optional().describe('Alternative parameter'),
            }),
            generate: async (args) => {
               console.log("🤖 Tool Args Received:", JSON.stringify(args));

               // @ts-ignore - Handle variable parameter names
               let query = args.query || args.sql || args.sql_query;

               if (!query) {
                 return <div className="text-red-500">Error: No query generated.</div>;
               }

               // CLEANUP: Remove trailing semicolons to prevent "syntax error at or near ;"
               query = query.trim().replace(/;$/, '');
               
               console.log("🚀 Executing:", query);

               const { data, error } = await supabase.rpc('run_sql', { query });
               
               if (error) {
                 return <div className="text-red-500 p-4 border rounded bg-red-50">SQL Error: {error.message}</div>;
               }

               if (!data || !Array.isArray(data) || data.length === 0) {
                 return <div className="text-gray-500 p-4">No data found for this query.</div>;
               }

               const firstRow = data[0];
               if (!firstRow || typeof firstRow !== 'object') {
                 return <div className="text-gray-500 p-4">Data format invalid.</div>;
               }

               // AUTO-DETECT: Chart vs Table
               const keys = Object.keys(firstRow);
               const isLikelyChart = keys.length === 2 && keys.some(k => typeof firstRow[k] === 'number');

               if (isLikelyChart) {
                 const valueKey = keys.find(k => typeof firstRow[k] === 'number') || keys[0];
                 const dateKey = keys.find(k => k !== valueKey) || keys[1];

                 const formattedData = data.map((row: any) => ({
                   date: row[dateKey], 
                   value: row[valueKey]
                 }));
                 
                 // Save Chart to History
                 await saveMessage(chatId, 'assistant', 'chart', 'Chart Generated', formattedData);

                 return <RevenueChart title="Analysis Result" data={formattedData} />;
               }

               // Save Table to History
               await saveMessage(chatId, 'assistant', 'table', 'Table Generated', data);

               return <SalesTable title="Query Results" rows={data} />;
            }
          },
        },
      });

      ui.done(result.value);
    } catch (error) {
      console.error(error);
      ui.done(<div className="text-red-500">System Error: {JSON.stringify(error)}</div>);
    }
  })();

  return {
    id: Date.now(),
    display: ui.value,
  };
}