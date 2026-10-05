'use client';

import { useState } from 'react';
import { verificationApi } from '@/lib/api';
import { formatDate, getConfidenceColor } from '@/lib/utils';

export default function PlanPage() {
  const [rtlContent, setRtlContent] = useState('');
  const [specification, setSpecification] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const result = await verificationApi.generatePlan(rtlContent, specification);
      setPlan(result);
    } catch (error) {
      console.error('Plan generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(
      (plan?.plan?.items || []).map((item: any) => {
        const parts = String(item?.id || '').split('-');
        return parts[1] || 'OTHER';
      })
    )
  ) as string[];

  const filteredItems = (plan?.plan?.items || []).filter((item: any) => {
    if (selectedCategory === 'all') return true;
    const cat = String(item?.id || '').split('-')[1] || 'OTHER';
    return cat.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Verification Plan Generator</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">RTL Design Content</label>
          <textarea
            className="w-full h-40 p-2 border rounded font-mono text-sm"
            placeholder="Paste SystemVerilog / Verilog RTL here..."
            value={rtlContent}
            onChange={(e) => setRtlContent(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Specification / Requirements</label>
          <textarea
            className="w-full h-40 p-2 border rounded font-mono text-sm"
            placeholder="Paste design specifications or requirements here..."
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleGeneratePlan}
        disabled={loading || !rtlContent}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating Plan...' : 'Generate Verification Plan'}
      </button>

      {plan && (
        <div className="space-y-6 border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <span className="text-gray-500 text-sm">Total Features</span>
              <p className="text-xl font-semibold">{plan.summary?.total_features || 0}</p>
            </div>
            <div className="p-4 border rounded">
              <span className="text-gray-500 text-sm">Testcases Planned</span>
              <p className="text-xl font-semibold">{plan.summary?.total_testcases || 0}</p>
            </div>
            <div className="p-4 border rounded">
              <span className="text-gray-500 text-sm">Confidence Score</span>
              <p className={`text-xl font-semibold ${getConfidenceColor(plan.summary?.confidence)}`}>
                {plan.summary?.confidence ?? 'N/A'}%
              </p>
            </div>
          </div>

          {plan.summary?.source_breakdown && (
            <div className="col-span-2">
              <h4 className="font-medium mb-2">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(plan.summary.source_breakdown || {}).map(([src, count]: [string, any]) => (
                  <span key={src} className="px-2 py-0.5 text-xs bg-gray-100 rounded border">
                    {src}: {String(count)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <h2 className="text-lg font-semibold">Plan Items</h2>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-secondary border border-gray-300 rounded text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat.toLowerCase()}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2">ID</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono">{item.id}</td>
                    <td className="p-2">{item.title || item.name}</td>
                    <td className="p-2">{item.type || 'N/A'}</td>
                    <td className="p-2">{item.priority || 'Medium'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}