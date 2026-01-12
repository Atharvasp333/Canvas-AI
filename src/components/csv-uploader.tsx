'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { uploadCSV } from '@/app/actions/upload'; 

export function CsvUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus('idle');
    setMessage('Reading file...');

    try {
      let rows: any[] = [];
      const filename = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      // --- 1. PARSE FILE ---
      if (file.name.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data;
              resolve();
            },
            error: (err) => reject(err)
          });
        });

      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert Sheet to JSON
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else {
        throw new Error("Unsupported file type. Please upload .csv or .xlsx");
      }

      // --- 2. CLEAN DATA (THE FIX) ---
      // We force-clean the data to ensure it is a "Plain Object" with no hidden methods.
      // This fixes the "Only plain objects can be passed..." error.
      const plainRows = JSON.parse(JSON.stringify(rows));

      if (!plainRows || plainRows.length === 0) {
        throw new Error("File is empty or could not be parsed.");
      }

      setMessage(`Creating database table...`);
      
      // --- 3. SEND TO SERVER ---
      const result = await uploadCSV(filename, plainRows);
      
      if (result.success) {
        setStatus('success');
        setMessage(`Ready! Table: ${result.tableName}`);
      } else {
        setStatus('error');
        setMessage(result.error || 'Upload failed');
      }

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer group">
        <input 
          type="file" 
          accept=".csv, .xlsx, .xls" 
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          ) : status === 'success' ? (
            <Check className="w-8 h-8 text-green-500" />
          ) : status === 'error' ? (
            <AlertCircle className="w-8 h-8 text-red-500" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
          )}
          
          <div className="text-sm font-medium text-gray-600">
            {message || "Drop a CSV or Excel file to analyze"}
          </div>
        </div>
      </div>
    </div>
  );
}