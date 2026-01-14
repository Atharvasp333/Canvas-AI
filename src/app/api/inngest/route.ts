import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// We will add functions here later (e.g., processCsvUpload)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [], // Empty for now, we will add the Upload function in the next step
});