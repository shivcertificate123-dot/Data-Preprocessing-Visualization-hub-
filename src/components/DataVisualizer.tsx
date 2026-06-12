import React, { useMemo } from 'react';
import { DatasetColumn } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Compass, SlidersHorizontal } from 'lucide-react';

interface DataVisualizerProps {
  records: any[];
  datasetId: string;
  columns: DatasetColumn[];
}

export default function DataVisualizer({ records, datasetId, columns }: DataVisualizerProps) {
  
  // 1. Group and aggregate categorical counts to showcase standardization merging
  const categoryChartData = useMemo(() => {
    let groupColumn = 'country';
    if (datasetId === 'customer_sales') {
      groupColumn = 'country';
    } else if (datasetId === 'health_tracker') {
      groupColumn = 'deviceStatus';
    } else if (datasetId === 'support_log') {
      groupColumn = 'category';
    } else {
      // Find first string column
      const firstStr = columns.find(c => c.type === 'string' && c.name !== 'customerName')?.name;
      if (firstStr) groupColumn = firstStr;
    }

    const counts: Record<string, number> = {};
    records.forEach((row) => {
      let val = row[groupColumn];
      if (val === null || val === undefined) {
        val = 'Missing / Null';
      } else {
        val = String(val); // Keep original casing/spacing to highlight the split bars
      }
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [records, datasetId, columns]);

  // 2. Prepare scatter plot data
  const scatterChartData = useMemo(() => {
    let xCol = 'age';
    let yCol = 'income';

    if (datasetId === 'customer_sales') {
      xCol = 'age';
      yCol = 'income';
    } else if (datasetId === 'health_tracker') {
      xCol = 'steps';
      yCol = 'caloriesBurned';
    } else if (datasetId === 'support_log') {
      xCol = 'responseTimeMin';
      yCol = 'resolutionTimeMin';
    } else {
      // Custom dataset fallback
      const nums = columns.filter(c => c.type === 'numeric' && c.name !== 'id');
      if (nums.length >= 2) {
        xCol = nums[0].name;
        yCol = nums[1].name;
      } else {
        return [];
      }
    }

    return records.map((row) => {
      const xVal = row[xCol];
      const yVal = row[yCol];
      
      // Determine if this row is an outlier statistically/domain-wise to highlight in red
      let isOutlier = false;
      if (datasetId === 'customer_sales') {
        if (xVal > 110 || xVal < 0 || yVal < 0 || yVal > 400000) isOutlier = true;
      } else if (datasetId === 'health_tracker') {
        if (xVal > 100000 || yVal === null || xVal === null) isOutlier = true;
      } else if (datasetId === 'support_log') {
        if (yVal > 10000) isOutlier = true;
      }

      return {
        x: xVal === null ? 0 : Number(xVal),
        y: yVal === null ? 0 : Number(yVal),
        label: row.customerName || row.id || row.ticketId || row.day || 'Record',
        isOutlier,
        rawX: xVal,
        rawY: yVal,
      };
    });
  }, [records, datasetId, columns]);

  // Retrieve labels dynamically
  const scatterLabels = useMemo(() => {
    if (datasetId === 'customer_sales') {
      return { x: 'Age (Years)', y: 'Income (USD)' };
    } else if (datasetId === 'health_tracker') {
      return { x: 'Steps Count', y: 'Calories Burned' };
    } else if (datasetId === 'support_log') {
      return { x: 'Response Time (Min)', y: 'Resolution Time (Min)' };
    }
    return { x: 'Feature X', y: 'Feature Y' };
  }, [datasetId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Interactive Key Findings</h2>
          <p className="text-xs text-slate-500">Analyze category consolidations and distribution spreads in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Chart A: Categorical Aggregates (Bar Chart) */}
        <div className="border border-slate-100/80 rounded-xl p-4 bg-slate-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-500" />
                Categorical Distribution Impact
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Grouping feature: {datasetId === 'customer_sales' ? 'country' : datasetId === 'health_tracker' ? 'deviceStatus' : 'category'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Watch this chart as you apply the <strong>Clean Formats</strong> logic. Inconsistent casings or spaces create redundant bars, while cleanup aggregates them nicely into cohesive bins.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#10b981' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name.includes('Missing') || entry.name.includes('null') ? '#cbd5e1' : '#6366f1'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Numerical Correlation (Scatter Chart) */}
        <div className="border border-slate-100/80 rounded-xl p-4 bg-slate-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                Bivariate Scatter & Outliers Plot
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                X: {scatterLabels.x} • Y: {scatterLabels.y}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Outliers are marked in <span className="text-red-500 font-semibold font-mono">crimson</span>. Notice how they skew the graph limits. Running <strong>Treat Outliers</strong> clamps or cleans these back inside reasonable frames.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={scatterLabels.x} 
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={scatterLabels.y} 
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis type="category" dataKey="label" name="Item" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px' }}
                />
                <Scatter name="Data points" data={scatterChartData}>
                  {scatterChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isOutlier ? '#ef4444' : '#6366f1'}
                      r={entry.isOutlier ? 7 : 5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
