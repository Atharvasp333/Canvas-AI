'use client';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SalesTable } from '@/components/dashboard/SalesTable';

export default function TestPage() {
  // Dummy data for visual testing
  const dummyChartData = [
    { date: 'Jan', value: 400 },
    { date: 'Feb', value: 300 },
    { date: 'Mar', value: 600 },
  ];

  return (
    <div className="p-10 space-y-10 bg-gray-50 min-h-screen text-black">
      <h1 className="text-3xl font-bold">🎨 Component Library Test</h1>
      
      {/* Test Chart */}
      <section>
        <h2 className="text-xl font-bold mb-4">1. Revenue Chart</h2>
        <RevenueChart data={dummyChartData} title="Q1 Revenue Trend" />
      </section>

      {/* Test Table */}
      <section>
        <h2 className="text-xl font-bold mb-4">2. Sales Table</h2>
        <SalesTable 
          title="Recent Transactions"
          rows={[
            { id: 1, product: 'Laptop', amount: 1200 },
            { id: 2, product: 'Mouse', amount: 25 },
          ]} 
        />
      </section>
    </div>
  );
}