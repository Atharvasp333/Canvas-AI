'use client';

import { useEffect, useState } from 'react';
import { Trash2, Database, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { getUserTables, deleteTable } from '@/app/actions/manage-data';

export function DataManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadTables = async () => {
    setIsLoading(true);
    const result = await getUserTables();
    if (result.success && result.tables) {
      setTables(result.tables);
    }
    setIsLoading(false);
  };

  // Load on mount
  useEffect(() => {
    loadTables();
  }, []);

  const handleDelete = async (tableName: string) => {
    if (!confirm(`Are you sure you want to delete ${tableName}?`)) return;

    setIsDeleting(tableName);
    const result = await deleteTable(tableName);
    
    if (result.success) {
      await loadTables(); // Refresh list
    } else {
      alert("Failed to delete table: " + result.error);
    }
    setIsDeleting(null);
  };

  // Helper to make filenames look readable
  // user_sales_data_2024_1768220641096 -> sales_data_2024
  const formatName = (name: string) => {
    return name.replace('user_', '').replace(/_\d+$/, '');
  };

  return (
    <div className="w-full max-w-md bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <Database className="w-4 h-4" />
          <span>Your Data</span>
        </div>
        <button 
          onClick={loadTables} 
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto p-2">
        {tables.length === 0 && !isLoading && (
          <div className="text-center p-6 text-gray-400 text-sm">
            No files uploaded yet.
          </div>
        )}

        {tables.map((table) => (
          <div 
            key={table} 
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate block max-w-[180px]" title={table}>
                  {formatName(table)}
                </span>
                <span className="text-[10px] text-gray-400 truncate">
                  {table}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(table)}
              disabled={!!isDeleting}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              title="Delete File"
            >
              {isDeleting === table ? (
                <span className="animate-spin block">⏳</span>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}