'use client';

export function SalesTable({ rows, title }: { rows: any[], title: string }) {
  if (!rows || rows.length === 0) return <div className="p-4 text-gray-500">No data available</div>;

  const headers = Object.keys(rows[0]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm mt-4 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-500 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-6 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                {headers.map((header) => (
                  <td key={`${idx}-${header}`} className="px-6 py-4">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}