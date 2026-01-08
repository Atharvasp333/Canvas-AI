import { google } from '@ai-sdk/google';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const dbSchema = `
      Table: products (columns: id, name, category, price, stock_level)
      Table: customers (columns: id, name, email, region, signup_date)
      Table: sales (columns: id, product_id, customer_id, quantity, total_amount, sale_date, status)
    `;

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      maxSteps: 5,
      system: `
        You are a SQL Expert for NovaTech.
        Schema:
        ${dbSchema}

        Rules:
        1. Use 'run_sql' to fetch data.
        2. The parameter for the tool MUST be named 'query'.
        3. Once you get the JSON data back, YOU MUST summarize the answer in plain text.
      `,
      prompt: prompt,
      tools: {
        run_sql: tool({
          description: 'Execute a PostgreSQL query',
          parameters: z.object({
            query: z.string().describe('The SQL query to run'), 
          }),
          execute: async (args) => {
            // SAFEGUARD: The AI might send 'sql_query' or 'query'. We handle both.
            // @ts-ignore
            const sql = args.query || args.sql_query;

            console.log("🚀 Executing SQL:", sql); 

            if (!sql) return { error: "No query parameter provided by AI" };

            // Call Supabase RPC
            const { data, error } = await supabase.rpc('run_sql', { query: sql });
            
            if (error) {
              console.error("❌ SQL Error:", error);
              return { error: error.message };
            }
            console.log("✅ Data received length:", data ? data.length : 0);
            return data;
          },
        }),
      },
    });

    return new Response(JSON.stringify({ 
      answer: result.text, 
      steps: result.steps 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}