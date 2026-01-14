import { inngest } from "../client";
import { supabase } from "@/lib/supabase";
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

// FIX 1: Add 'table' and 'number' to allowed types so validation doesn't crash
const ChartItemSchema = z.object({
  query: z.string().describe('The SQL query to execute'),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'scatter', 'radar', 'histogram', 'table', 'number']).describe('The visualization type'),
  title: z.string().describe('Chart title'),
  description: z.string().optional().describe('Short explanation'),
});

export const generateAiResponse = inngest.createFunction(
  { id: "generate-ai-response" },
  { event: "app/ai.query" },
  async ({ event, step }) => {
    const { chatId, message, messageId } = event.data;

    // 1. Fetch Schema
    const dbSchema = await step.run("fetch-schema", async () => {
      const { data: schemaData } = await supabase.rpc('get_user_schema_details');
      let userSchemaContext = "No custom tables found.";
      if (schemaData && schemaData.length > 0) {
        const tables: Record<string, any[]> = {};
        schemaData.forEach((row: any) => {
          if (!tables[row.table_name]) tables[row.table_name] = [];
          tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });
        userSchemaContext = Object.entries(tables).map(([name, cols]) => `- Table '${name}': Columns [ ${cols.join(', ')} ]`).join('\n');
      }
      return `CORE DATA: sales, products\nUSER DATA:\n${userSchemaContext}`;
    });

    // 2. Ask Gemini (FIX 2: Stricter Prompt)
    const aiResult = await step.run("ask-gemini", async () => {
      const { text, toolCalls } = await generateText({
        model: google('gemini-2.5-flash'),
        system: `You are a BI Analyst working with a **PostgreSQL** database (Supabase).
        
        **DATA SCHEMA:** ${dbSchema}

        **CRITICAL SQL RULES (POSTGRESQL ONLY):**
        1. **Dates:** - NEVER use 'STRFTIME' (That is SQLite).
           - USE: "to_char(to_date(date_col, 'DD-MM-YYYY'), 'YYYY-MM')" for monthly grouping.
        2. **Casting:** - NEVER use 'CAST(x AS REAL)'. 
           - USE: "column_name::numeric".
           - Example: "SUM(quantity::numeric * unit_price::numeric)"
        3. **Logic:**
           - Use Subqueries for multi-table math.
        
        **VISUALIZATION LOGIC:**
        - **"Compare" / "Trend" / "Share"** -> Generates a Chart ('bar', 'line', 'pie').
        - **"List" / "Details" / "Raw Data"** -> Generates a 'table'.
        - **"Metric" / "KPI"** -> Generates a 'number'.

        **HYBRID RESPONSE RULE:**
        - If the user asks for a visualization AND a list (e.g. "Show chart and list details"), you MUST return BOTH in the array.
        
        **ONE-SHOT JSON EXAMPLE (Hybrid):**
        {
          "charts": [
            { "title": "Revenue Trend", "chartType": "line", "query": "SELECT ..." },
            { "title": "Top Orders List", "chartType": "table", "query": "SELECT order_id, customer, amount FROM ... LIMIT 5" }
          ]
        }
        `,
        prompt: message,
        tools: {
          visualize_data: {
            description: 'Generate dashboard',
            parameters: z.object({ charts: z.array(ChartItemSchema).min(1) }),
          },
        },
      });
      return { text, toolCalls };
    });

    // 3. Process Tool Calls
    let finalData: any = null;
    let finalType = 'text';

    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      const toolCall = aiResult.toolCalls[0];

      // @ts-ignore
      const { charts } = toolCall.args;

      finalData = await step.run("execute-sql", async () => {
        const results = await Promise.all(charts.map(async (viz: any) => {
          // Cleanup: Remove semicolons
          const query = viz.query.trim().replace(/;$/, '');

          // Run SQL
          const { data, error } = await supabase.rpc('run_sql', { query });

          if (error) {
            // Return the error so we can debug it in the UI instead of failing silently
            return { ...viz, error: error.message, data: [] };
          }
          if (!data || data.length === 0) {
            return { ...viz, error: "No data returned from query", data: [] };
          }

          return { ...viz, data, error: null };
        }));

        // Return ALL results (even errors) so the UI can decide what to show
        return results;
      });

      // If we have at least one valid chart, switch mode to 'chart'
      if (finalData && finalData.some((r: any) => !r.error)) {
        finalType = 'chart';
      } else {
        // If everything failed, keep as text and append error info
        finalType = 'text';
        const errors = finalData.map((r: any) => `Chart '${r.title}': ${r.error}`).join('\n');
        aiResult.text += `\n\n**Analysis Failed:**\n${errors}`;
      }
    }

    // 4. Update Database
    await step.run("update-message", async () => {
      await supabase
        .from('messages')
        .update({
          content: aiResult.text || "Analysis Complete",
          data: finalData,
          type: finalType,
        })
        .eq('id', messageId);
    });

    return { success: true, type: finalType };
  }
);