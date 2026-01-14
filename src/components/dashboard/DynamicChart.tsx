'use client';

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { motion } from 'framer-motion';

// Expanded Chart Types
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar' | 'histogram';

interface DynamicChartProps {
  title: string;
  data: any[];
  chartType: ChartType;
  description?: string; // AI can add a small caption
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export function DynamicChart({ title, data, chartType, description }: DynamicChartProps) {
  
  // Auto-detect keys (Same robust logic as before)
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  const activeXKey = keys.find(k => typeof data[0][k] === 'string') || keys[0];
  const activeYKey = keys.find(k => typeof data[0][k] === 'number') || keys[1];

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={activeXKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Line type="monotone" dataKey={activeYKey} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={activeXKey} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey={activeYKey} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        );
      case 'scatter':
        return (
           <ScatterChart>
             <CartesianGrid strokeDasharray="3 3" />
             <XAxis type="category" dataKey={activeXKey} name="Category" />
             <YAxis type="number" dataKey={activeYKey} name="Value" />
             <Tooltip cursor={{ strokeDasharray: '3 3' }} />
             <Scatter name={title} data={data} fill="#8884d8" />
           </ScatterChart>
        );
      case 'radar':
        return (
           <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
             <PolarGrid />
             <PolarAngleAxis dataKey={activeXKey} />
             <PolarRadiusAxis />
             <Radar name={title} dataKey={activeYKey} stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
           </RadarChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={activeYKey}
              nameKey={activeXKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'bar':
      case 'histogram': // Histogram is just a Bar chart where SQL handles the bins
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={activeXKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Bar dataKey={activeYKey} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
          </BarChart>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col w-full h-full p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
      
      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}