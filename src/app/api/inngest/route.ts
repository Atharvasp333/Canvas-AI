import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processCsvUpload } from "@/inngest/functions/csv-upload";
import { generateAiResponse } from "@/inngest/functions/ai-analysis";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processCsvUpload, 
    generateAiResponse
  ],
});