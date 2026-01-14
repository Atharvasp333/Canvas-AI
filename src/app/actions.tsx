'use server';

import { createStreamableUI } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { streamUI } from 'ai/rsc';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { DynamicChart } from '@/components/dashboard/DynamicChart';
import { SalesTable } from '@/components/dashboard/SalesTable';
import { saveMessage } from '@/app/actions/history'; 

// 1. Define the Item Schema
const ChartItemSchema = z.object({
  query: z.string().describe('The SQL query to execute'),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'scatter', 'radar', 'histogram']).describe('The visualization type'),
  title: z.string().describe('Chart title'),
  description: z.string().optional().describe('Short explanation'),
});

export async function submitUserMessage(input: string, chatId: string) {
  'use server';

  const ui = createStreamableUI(
    <div className="inline-flex items-center gap-2 text-gray-500">
      <span className="animate-spin">⏳</span> Thinking...
    </div>
  );

  (async () => {
    try {
      await saveMessage(chatId, 'user', 'text', input);

      // 2. FETCH SCHEMA
      const { data: schemaData } = await supabase.rpc('get_user_schema_details');
      let userSchemaContext = "No custom tables found.";
      if (schemaData && schemaData.length > 0) {
        const tables: Record<string, any[]> = {};
        schemaData.forEach((row: any) => {
          if (!tables[row.table_name]) tables[row.table_name] = [];
          tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });
        userSchemaContext = Object.entries(tables).map(([name, cols]) => {
          return `- Table '${name}': Columns [ ${cols.join(', ')} ]`;
        }).join('\n');
      }

      const dbSchema = `
        CORE DEMO DATA: sales, products, customers
        USER UPLOADED DATA:
        ${userSchemaContext}
      `;

      // 3. AI ORCHESTRATION
      const result = await streamUI({
        model: google('gemini-2.5-flash'), 
        system: `
          You are a BI Analyst.
          **DATA SCHEMA:** ${dbSchema}

          **GOAL:** Generate valid SQL queries to visualize data.
          
          **VISUALIZATION RULES:**
          - **Time Trends:** Use 'line' or 'area'.
          - **Comparison:** Use 'bar'.
          - **Shares/Proportions:** Use 'pie'.
          
          **MULTI-CHART DASHBOARDS:**
          - If the user asks for a dashboard/overview, return an ARRAY of 2-4 charts.
          
          **STRICT SQL RULES:**
          1. Pick the LATEST table version.
          2. Cast Numbers: "SUM(NULLIF(col, '')::numeric)"
          3. Cast Dates: "to_date(NULLIF(col, ''), 'DD-MM-YYYY')"
          
          **ONE-SHOT EXAMPLE (JSON OUTPUT):**
          {
            "charts": [
              { "title": "Revenue Trend", "chartType": "line", "query": "SELECT ..." },
              { "title": "Top Products", "chartType": "bar", "query": "SELECT ..." }
            ]
          }
        `,
        prompt: input,
        tools: {
          visualize_data: {
            description: 'Generate a dashboard with one or more charts.',
            // STRICT SCHEMA: 'charts' is now REQUIRED
            parameters: z.object({
              charts: z.array(ChartItemSchema).min(1).describe("List of charts to generate")
            }),
            generate: async ({ charts }) => {
               console.log("🤖 Tool Args Received:", JSON.stringify({ charts }));

               // 1. Run ALL queries in parallel
               const results = await Promise.all(charts.map(async (viz) => {
                 let query = viz.query.trim().replace(/;$/, '');
                 console.log("🚀 Executing:", query);
                 
                 const { data, error } = await supabase.rpc('run_sql', { query });
                 
                 if (error || !data || data.length === 0) {
                   console.error("Query Failed:", error);
                   return { ...viz, error: error?.message || "No data", data: [] };
                 }

                 return { 
                   title: viz.title, 
                   chartType: viz.chartType, 
                   description: viz.description, 
                   data, 
                   error: null 
                 };
               }));

               // 2. Filter Valid Results
               const validResults = results.filter(r => !r.error && r.data.length > 0);

               if (validResults.length === 0) {
                 return <div className="text-gray-500">No data available for these queries.</div>;
               }

               // 3. Save Dashboard to History
               await saveMessage(chatId, 'assistant', 'chart', 'Dashboard Generated', validResults);

               // 4. Render Grid Layout
               return (
                 <div className={`grid gap-6 w-full ${validResults.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                   {validResults.map((res, index) => (
                     <DynamicChart 
                       key={index}
                       title={res.title}
                       data={res.data}
                       // @ts-ignore
                       chartType={res.chartType}
                       description={res.description}
                     />
                   ))}
                 </div>
               );
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