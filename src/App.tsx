import React, { useState, useMemo } from 'react';
import { Dataset, DataCleanOperation, MetricSummary } from './types';
import { SAMPLE_DATASETS } from './sampleData';
import DatasetSelector from './components/DatasetSelector';
import DataCleaningSteps from './components/DataCleaningSteps';
import DataVisualizer from './components/DataVisualizer';
import DataStoryteller from './components/DataStoryteller';
import { calculateColumnMetrics } from './utils/dataEngine';
import {
  Download,
  RotateCcw,
  Undo2,
  Table,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  History,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeDataset, setActiveDataset] = useState<Dataset>(JSON.parse(JSON.stringify(SAMPLE_DATASETS[0])));
  
  // Current active records
  const [records, setRecords] = useState<any[]>(activeDataset.rawRecords);
  
  // Stacks for multi-step Undo
  const [recordsHistory, setRecordsHistory] = useState<Array<any[]>>([]);
  const [opHistory, setOpHistory] = useState<DataCleanOperation[]>([]);

  // Cleaning indicators
  const [missingImputedCount, setMissingImputedCount] = useState<number>(0);
  const [duplicatesRemovedCount, setDuplicatesRemovedCount] = useState<number>(0);
  const [outliersCleanedCount, setOutliersCleanedCount] = useState<number>(0);
  const [standardizationsCount, setStandardizationsCount] = useState<number>(0);

  // Pagination for the raw table viewer
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Handle dataset switch
  const handleDatasetChange = (newDs: Dataset) => {
    setActiveDataset(newDs);
    setRecords(newDs.rawRecords);
    setRecordsHistory([]);
    setOpHistory([]);
    setCurrentPage(1);
    
    // Reset indicators
    setMissingImputedCount(0);
    setDuplicatesRemovedCount(0);
    setOutliersCleanedCount(0);
    setStandardizationsCount(0);
  };

  // Reset to original Raw state
  const handleReset = () => {
    // Find matching preloaded dataset
    const matched = SAMPLE_DATASETS.find((d) => d.id === activeDataset.id);
    const originalRaw = matched ? JSON.parse(JSON.stringify(matched.rawRecords)) : JSON.parse(JSON.stringify(activeDataset.rawRecords));
    
    setRecords(originalRaw);
    setRecordsHistory([]);
    setOpHistory([]);
    setCurrentPage(1);

    setMissingImputedCount(0);
    setDuplicatesRemovedCount(0);
    setOutliersCleanedCount(0);
    setStandardizationsCount(0);
  };

  // Undo last step
  const handleUndo = () => {
    if (recordsHistory.length === 0 || opHistory.length === 0) return;

    const previousRecords = recordsHistory[recordsHistory.length - 1];
    const removedOp = opHistory[opHistory.length - 1];

    // Pop lists
    setRecords(previousRecords);
    setRecordsHistory(recordsHistory.slice(0, -1));
    setOpHistory(opHistory.slice(0, -1));
    setCurrentPage(1);

    // Revert indicators
    if (removedOp.type === 'missing') {
      setMissingImputedCount(prev => Math.max(0, prev - (removedOp.parameters.count || 1)));
    } else if (removedOp.type === 'duplicate') {
      setDuplicatesRemovedCount(0); // Simple reset
    } else if (removedOp.type === 'outlier') {
      setOutliersCleanedCount(prev => Math.max(0, prev - 1));
    } else if (removedOp.type === 'standardize') {
      setStandardizationsCount(prev => Math.max(0, prev - 1));
    }
  };

  // Apply visual-action preprocessors
  const handleApplyOperation = (newRecords: any[], operation: DataCleanOperation) => {
    // Push current records state to backup history stack
    setRecordsHistory((prev) => [...prev, records]);
    
    // Supplement operation metrics
    let updatedCount = records.length - newRecords.length;
    if (operation.type === 'missing') {
      // Calculate missing values before and after
      const columns = activeDataset.columns;
      const getNullCount = (arr: any[]) => {
        let count = 0;
        arr.forEach(row => {
          columns.forEach(col => {
            const val = row[col.name];
            if (val === null || val === undefined || val === '') {
              count++;
            }
          });
        });
        return count;
      };
      const imputedCount = getNullCount(records) - getNullCount(newRecords);
      setMissingImputedCount((prev) => prev + Math.max(1, imputedCount));
    } else if (operation.type === 'duplicate') {
      setDuplicatesRemovedCount((prev) => prev + Math.max(1, updatedCount));
    } else if (operation.type === 'outlier') {
      setOutliersCleanedCount((prev) => prev + 1);
    } else if (operation.type === 'standardize') {
      setStandardizationsCount((prev) => prev + 1);
    }

    setRecords(newRecords);
    setOpHistory((prev) => [...prev, operation]);
    setCurrentPage(1);
  };

  // Computed metric summary
  const summary: MetricSummary = useMemo(() => {
    const originalRecords = activeDataset.rawRecords.length;
    const currentRecords = records.length;
    return {
      originalRecords,
      currentRecords,
      removedRecords: Math.max(0, originalRecords - currentRecords),
      missingValuesFilled: missingImputedCount,
      duplicatesRemoved: duplicatesRemovedCount,
      outliersCleaned: outliersCleanedCount,
      standardizationsDone: standardizationsCount,
    };
  }, [records, activeDataset, missingImputedCount, duplicatesRemovedCount, outliersCleanedCount, standardizationsCount]);

  // Compute metrics in real-time for cell highlight
  const activeMetrics = useMemo(() => {
    return calculateColumnMetrics(records, activeDataset.columns);
  }, [records, activeDataset.columns]);

  // Paginated records slicing
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return records.slice(startIdx, startIdx + pageSize);
  }, [records, currentPage]);

  const totalPages = Math.ceil(records.length / pageSize) || 1;

  // Compile offline CSV download standard string
  const executeDownloadCSV = () => {
    const headerRow = activeDataset.columns.map((c) => c.name).join(',');
    const itemRows = records.map((r) =>
      activeDataset.columns
        .map((c) => {
          const val = r[c.name];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...itemRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeDataset.id}_cleaned_dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 antialiased font-sans pb-16">
      
      {/* Decorative top ambient bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />

      {/* Main app header */}
      <header className="border-b border-slate-100 bg-white/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 tracking-tight leading-none">
                Data Preprocessing & Visualization Hub
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Frictionless in-browser CSV cleaning playground. Learn statistical imputation, deduplication, and outliers treatment with real-time feedback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={recordsHistory.length === 0}
              onClick={handleUndo}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                recordsHistory.length === 0
                  ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-sm'
              }`}
              title="Undo last preprocessor operation"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={executeDownloadCSV}
              className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Step 1: Select preloaded / Custom data */}
        <DatasetSelector onSelectDataset={handleDatasetChange} selectedDatasetId={activeDataset.id} />

        {/* Dynamic Preprocessing Core Wizard & Live Sheet Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Table Spreadsheet Live Grid (4 columns) */}
          <div className="xl:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Active Preprocessed Records</h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full font-mono">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            {/* Interactive Data Table sheet */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 font-mono text-slate-500 select-none">
                    {activeDataset.columns.map((col) => (
                      <th key={col.name} className="p-2.5 font-bold tracking-tight capitalize">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((row, rowIdx) => {
                    const rowKey = row.id || row.ticketId || row.day || rowIdx;
                    return (
                      <tr
                        key={`row-${rowKey}`}
                        className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
                      >
                        {activeDataset.columns.map((col) => {
                          const val = row[col.name];
                          
                          // Spot missing fields
                          const isMissing =
                            val === null ||
                            val === undefined ||
                            val === '' ||
                            (col.type === 'numeric' && isNaN(Number(val)));
                          
                          // Spot outliers
                          let isOutlier = false;
                          const metric = activeMetrics.find((m) => m.columnName === col.name);
                          const idxInRecords = (currentPage - 1) * pageSize + rowIdx;
                          if (metric?.outliers?.indices.includes(idxInRecords)) {
                            isOutlier = true;
                          }

                          return (
                            <td
                              key={`cell-${col.name}`}
                              className={`p-2.5 font-mono truncate max-w-[120px] relative group ${
                                isMissing
                                  ? 'bg-rose-50 text-rose-600 font-semibold text-center'
                                  : isOutlier
                                  ? 'bg-amber-50 text-amber-700 border-l border-amber-300'
                                  : 'text-slate-700'
                              }`}
                            >
                              {isMissing ? (
                                <span className="text-[10px] flex items-center justify-center gap-0.5 select-none" title="Missing Value / Null">
                                  Ø Null
                                </span>
                              ) : col.type === 'numeric' ? (
                                typeof val === 'number' ? Number(val.toFixed(2)) : val
                              ) : (
                                String(val)
                              )}

                              {/* Small tooltips for flagged outliers/nulls */}
                              {isOutlier && (
                                <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] p-1.5 rounded shadow-lg z-50 whitespace-nowrap mb-1">
                                  Flagged Outlier Value
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={activeDataset.columns.length} className="text-center p-8 text-slate-400">
                        No rows remaining. Change strategies or Reset Raw data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-150">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors uppercase font-bold"
              >
                Previous
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                      currentPage === i + 1
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors uppercase font-bold"
              >
                Next
              </button>
            </div>

            {/* Quick Summary Counts Legend banner */}
            <div className="grid grid-cols-2 gap-3 mt-1.5 pt-3 border-t border-slate-100">
              <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg flex items-center justify-between text-xs">
                <span className="text-rose-700 font-semibold font-mono">Row Density</span>
                <span className="font-mono font-bold text-rose-800">{records.length} items</span>
              </div>
              <div className="bg-amber-50/50 border border-amber-150 p-2.5 rounded-lg flex items-center justify-between text-xs">
                <span className="text-amber-800 font-semibold font-mono">Anomalies Detected</span>
                <span className="font-mono font-bold text-amber-900">
                  {activeMetrics.reduce((acc, curr) => acc + (curr.outliers?.count || 0), 0)} pts
                </span>
              </div>
            </div>
          </div>

          {/* Data Preprocessor Steps Wizard (8 columns) */}
          <div className="xl:col-span-7">
            <DataCleaningSteps
              currentRecords={records}
              originalRecords={activeDataset.rawRecords}
              columns={activeDataset.columns}
              onApplyOperation={handleApplyOperation}
              onResetDataset={handleReset}
            />
          </div>

        </div>

        {/* Step 3: Interactive Visual Charts Dashboard section */}
        <DataVisualizer records={records} datasetId={activeDataset.id} columns={activeDataset.columns} />

        {/* Step 4: Narrative storytelling & statistics tutoring Section */}
        <DataStoryteller summary={summary} datasetId={activeDataset.id} datasetName={activeDataset.name} />

        {/* Step 5: Preprocessing History Log registry */}
        {opHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 animate-spin" />
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Active Operation History (Recipe log)</h3>
            </div>
            
            <div className="space-y-2">
              {opHistory.map((op, idx) => (
                <div key={op.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-slate-900 font-sans">{op.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Applied at {op.timestamp}</p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                    {op.type === 'missing' ? 'NaN Impute' : op.type === 'duplicate' ? 'Deduplicate' : op.type === 'outlier' ? 'IQR Cap' : 'Standardize'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
