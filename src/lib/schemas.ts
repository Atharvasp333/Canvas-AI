import { z } from 'zod';

// Schema for the Chart Component
export const chartSchema = z.object({
  data: z.array(z.object({
    date: z.string().describe("The date label (e.g., 'Jan 2024')"),
    value: z.number().describe("The numerical value"),
  })),
  title: z.string().describe("Title of the chart"),
  color: z.string().optional().describe("Hex color code (e.g., #ff0000 for losses)"),
});

// Schema for the Table Component
export const tableSchema = z.object({
  rows: z.array(z.record(z.any())).describe("Array of objects representing rows"),
  title: z.string().describe("Title of the table"),
});