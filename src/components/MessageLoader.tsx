'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DynamicChart } from './dashboard/DynamicChart';
import { SalesTable } from './dashboard/SalesTable';
import { Loader2, AlertTriangle } from 'lucide-react';

export function MessageLoader({ messageId }: { messageId: number }) {
  // ✅ Initialize Supabase client
  const supabase = createClient();

  const [data, setData] = useState<any>(null);
  const [type, setType] = useState<'text' | 'chart' | 'table' | 'loading'>('loading');
  const [content, setContent] = useState('');

  useEffect(() => {
    // 1. Initial Fetch
    const fetchMessage = async () => {
      const { data: msg } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (msg && (msg.data || msg.type !== 'text')) {
        setData(msg.data);
        setType(msg.type as any);
        setContent(msg.content);
      }
    };
    fetchMessage();

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`msg-${messageId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `id=eq.${messageId}` },
        (payload) => {
          const newMsg = payload.new as any;
          // Stop loading if we have data or if the type changed from text (loading) to something else
          if (newMsg.data || newMsg.type !== 'text') {
            setData(newMsg.data);
            setType(newMsg.type);
            setContent(newMsg.content);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId, supabase]);

  // --- RENDER LOGIC ---

  // Loading State
  if (type === 'loading' || (type === 'text' && !content)) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Analyzing data...</span>
      </div>
    );
  }

  // Case 1: Dashboard Grid (Array of Mixed Content)
  if (type === 'chart' && Array.isArray(data)) {
    return (
      <div className={`grid gap-4 w-full ${data.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {data.map((chart: any, idx: number) => {

          // A. ERROR CARD (If SQL failed for this specific item)
          if (chart.error) {
            return (
              <div key={idx} className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{chart.title} (Error)</span>
                </div>
                <p className="text-xs opacity-80 break-words">{chart.error}</p>
              </div>
            );
          }

          // B. TABLE CARD (If AI chose 'table' inside dashboard)
          if (chart.chartType === 'table') {
            return <SalesTable key={idx} title={chart.title} rows={chart.data} />;
          }

          // C. NUMBER CARD (Single Stat)
          if (chart.chartType === 'number') {
            // Extract the first value from the first row safely
            const firstRow = chart.data[0];
            const val = firstRow ? Object.values(firstRow)[0] : 0;
            const formattedVal = !isNaN(Number(val))
              ? Number(val).toLocaleString()
              : val;

            return (
              <div key={idx} className="p-8 bg-white border rounded-xl shadow-sm flex flex-col justify-center items-center hover:shadow-md transition-shadow">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{chart.title}</h3>
                <span className="text-4xl font-extrabold text-blue-600">{formattedVal}</span>
                {chart.description && (
                  <p className="text-xs text-gray-400 mt-2 text-center">{chart.description}</p>
                )}
              </div>
            );
          }

          // D. STANDARD CHART (Line, Bar, Pie, Area, Scatter, etc.)
          return (
            <DynamicChart
              key={idx}
              title={chart.title}
              data={chart.data}
              chartType={chart.chartType}
              description={chart.description}
            />
          );
        })}
      </div>
    );
  }

  // Case 2: Single Chart Object (Legacy/Fallback)
  if (type === 'chart' && data?.data) {
    return (
      <DynamicChart
        title={content || "Analysis"}
        data={data.data}
        chartType={data.type || 'bar'}
      />
    );
  }

  // Case 3: Table (Standalone)
  if (type === 'table') return <SalesTable title="Results" rows={data} />;

  // Case 4: Plain Text
  return <div className="bg-white p-4 rounded-xl border shadow-sm text-gray-700 whitespace-pre-wrap">{content}</div>;
}