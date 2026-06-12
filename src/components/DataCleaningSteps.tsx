import React, { useState, useMemo } from 'react';
import { DatasetColumn, ColumnMetric, DataCleanOperation } from '../types';
import {
  calculateColumnMetrics,
  countDuplicateRows,
  removeDuplicates,
  fillMissing,
  cleanOutliers,
  standardizeStringColumn,
  getMedian,
  getMean
} from '../utils/dataEngine';
import { AlertCircle, CheckSquare, Trash2, Sliders, Sparkles, Code, Volume2, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DataCleaningStepsProps {
  currentRecords: any[];
  originalRecords: any[];
  columns: DatasetColumn[];
  onApplyOperation: (newRecords: any[], operation: DataCleanOperation) => void;
  onResetDataset: () => void;
}

type ActiveStep = 'missing' | 'duplicate' | 'outliers' | 'standardize';

export default function DataCleaningSteps({
  currentRecords,
  originalRecords,
  columns,
  onApplyOperation,
  onResetDataset,
}: DataCleaningStepsProps) {
  const [activeTab, setActiveTab] = useState<ActiveStep>('missing');
  const [selectedColumn, setSelectedColumn] = useState<string>(columns[0]?.name || '');

  // Missing Value Strategies
  const [missingStrategy, setMissingStrategy] = useState<'mean' | 'median' | 'mode' | 'zero' | 'drop'>('median');
  const [customConstant, setCustomConstant] = useState<string>('');

  // Outlier Strategies
  const [outlierStrategy, setOutlierStrategy] = useState<'cap' | 'median' | 'mean' | 'zero' | 'drop'>('cap');

  // String standardization strategy
  const [standardizeStrategy, setStandardizeStrategy] = useState<'trim' | 'lowercase' | 'titlecase' | 'standard_usa'>('standard_usa');

  // Compute metrics in real-time
  const metrics = useMemo(() => {
    return calculateColumnMetrics(currentRecords, columns);
  }, [currentRecords, columns]);

  const activeMetric = useMemo(() => {
    return metrics.find((m) => m.columnName === selectedColumn);
  }, [metrics, selectedColumn]);

  const duplicatesCount = useMemo(() => {
    return countDuplicateRows(currentRecords);
  }, [currentRecords]);

  // Keep selectedColumn in sync when dataset changes
  React.useEffect(() => {
    if (columns.length > 0 && !columns.some(c => c.name === selectedColumn)) {
      setSelectedColumn(columns[0].name);
    }
  }, [columns, selectedColumn]);

  // Python equivalent code generator
  const generatedCode = useMemo(() => {
    let code = '';
    if (activeTab === 'missing') {
      const col = selectedColumn;
      if (missingStrategy === 'mean') {
        code = `mean_val = df['${col}'].mean()\ndf['${col}'] = df['${col}'].fillna(mean_val)`;
      } else if (missingStrategy === 'median') {
        code = `median_val = df['${col}'].median()\ndf['${col}'] = df['${col}'].fillna(median_val)`;
      } else if (missingStrategy === 'mode') {
        code = `mode_val = df['${col}'].mode()[0]\ndf['${col}'] = df['${col}'].fillna(mode_val)`;
      } else if (missingStrategy === 'zero') {
        code = `df['${col}'] = df['${col}'].fillna(0)`;
      } else if (missingStrategy === 'drop') {
        code = `df = df.dropna(subset=['${col}'])`;
      }
    } else if (activeTab === 'duplicate') {
      code = `# Drop rows keeping first appearance\ndf = df.drop_duplicates(keep='first')`;
    } else if (activeTab === 'outliers') {
      const col = selectedColumn;
      if (outlierStrategy === 'drop') {
        code = `# Filter outliers using custom or standard logic\nq1 = df['${col}'].quantile(0.25)\nq3 = df['${col}'].quantile(0.75)\niqr = q3 - q1\nlower_bound = q1 - 1.5 * iqr\nupper_bound = q3 + 1.5 * iqr\ndf = df[(df['${col}'] >= lower_bound) & (df['${col}'] <= upper_bound)]`;
      } else {
        const replaceStr = outlierStrategy === 'median' 
          ? `df['${col}'].median()` 
          : outlierStrategy === 'mean' 
          ? `df['${col}'].mean()` 
          : outlierStrategy === 'zero' 
          ? '0' 
          : 'clipped_values';
        code = `# Replace extreme values\nimport numpy as np\nq1, q3 = df['${col}'].quantile([0.25, 0.75])\niqr = q3 - q1\nlimits = [q1 - 1.5*iqr, q3 + 1.5*iqr]\ndf['${col}'] = np.clip(df['${col}'], limits[0], limits[1])` ;
      }
    } else if (activeTab === 'standardize') {
      const col = selectedColumn;
      if (standardizeStrategy === 'trim') {
        code = `df['${col}'] = df['${col}'].str.strip()`;
      } else if (standardizeStrategy === 'lowercase') {
        code = `df['${col}'] = df['${col}'].str.lower().str.strip()`;
      } else if (standardizeStrategy === 'titlecase') {
        code = `df['${col}'] = df['${col}'].str.title().str.strip()`;
      } else if (standardizeStrategy === 'standard_usa') {
        code = `df['${col}'] = df['${col}'].str.strip().str.upper()\\
         .replace({'U.S.A.': 'USA', 'UNITED STATES': 'USA', 'UK': 'UK', 'U.K.': 'UK'})`;
      }
    }
    return code;
  }, [activeTab, selectedColumn, missingStrategy, outlierStrategy, standardizeStrategy]);

  // Execute Imputation
  const executeMissingImputation = () => {
    if (!selectedColumn || !activeMetric) return;

    const columnObj = columns.find((c) => c.name === selectedColumn);
    if (!columnObj) return;

    const colType = columnObj.type;
    const { cleanedData, updatedCount } = fillMissing(
      currentRecords,
      selectedColumn,
      colType,
      missingStrategy,
      customConstant
    );

    if (updatedCount === 0) return;

    const description = `Imputed ${updatedCount} missing values in '${selectedColumn}' using ${missingStrategy} strategy.`;
    const op: DataCleanOperation = {
      id: `op_${Date.now()}`,
      type: 'missing',
      column: selectedColumn,
      parameters: { strategy: missingStrategy },
      description,
      pythonCode: generatedCode,
      timestamp: new Date().toLocaleTimeString(),
    };

    onApplyOperation(cleanedData, op);
  };

  // Execute Duplicate Removal
  const executeDuplicateRemoval = () => {
    if (duplicatesCount === 0) return;

    const { cleanedData, countRemoved } = removeDuplicates(currentRecords);

    const description = `Removed ${countRemoved} exact duplicated records.`;
    const op: DataCleanOperation = {
      id: `op_${Date.now()}`,
      type: 'duplicate',
      parameters: {},
      description,
      pythonCode: generatedCode,
      timestamp: new Date().toLocaleTimeString(),
    };

    onApplyOperation(cleanedData, op);
  };

  // Execute Outlier Cleaning
  const executeOutlierClean = () => {
    if (!selectedColumn || !activeMetric || !activeMetric.outliers) return;

    const vals = currentRecords.map(r => r[selectedColumn]).filter(v => typeof v === 'number');
    const med = getMedian(vals);
    const avg = getMean(vals);

    const { cleanedData, updatedCount } = cleanOutliers(
      currentRecords,
      selectedColumn,
      outlierStrategy,
      activeMetric.outliers.indices,
      outlierStrategy === 'median' ? med : avg
    );

    if (updatedCount === 0) return;

    const description = `Handled ${updatedCount} outliers in '${selectedColumn}' by ${outlierStrategy} replacement.`;
    const op: DataCleanOperation = {
      id: `op_${Date.now()}`,
      type: 'outlier',
      column: selectedColumn,
      parameters: { strategy: outlierStrategy },
      description,
      pythonCode: generatedCode,
      timestamp: new Date().toLocaleTimeString(),
    };

    onApplyOperation(cleanedData, op);
  };

  // Execute Text Standardization
  const executeStandardization = () => {
    if (!selectedColumn) return;

    const { cleanedData, updatedCount } = standardizeStringColumn(
      currentRecords,
      selectedColumn,
      standardizeStrategy
    );

    const description = `Standardized casing/spacing in '${selectedColumn}' (Modified ${updatedCount} entries).`;
    const op: DataCleanOperation = {
      id: `op_${Date.now()}`,
      type: 'standardize',
      column: selectedColumn,
      parameters: { strategy: standardizeStrategy },
      description,
      pythonCode: generatedCode,
      timestamp: new Date().toLocaleTimeString(),
    };

    onApplyOperation(cleanedData, op);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
      
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
            <Sliders className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 tracking-tight">Data Preprocessing Console</h2>
            <p className="text-xs text-slate-500">Pick a preprocessing task and apply targeted cleaning rules.</p>
          </div>
        </div>
        <button
          onClick={onResetDataset}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
        >
          Reset to Raw
        </button>
      </div>

      {/* Primary Preprocessing Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto pb-1 gap-1">
        {[
          { id: 'missing', label: 'Impute Missing' },
          { id: 'duplicate', label: 'Handle Duplicates', badge: duplicatesCount },
          { id: 'outliers', label: 'Treat Outliers' },
          { id: 'standardize', label: 'Clean Formats' }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ActiveStep);
                // Auto switch column if incompatibilities arise
                if (tab.id === 'outliers') {
                  const firstNum = columns.find(c => c.type === 'numeric')?.name || '';
                  if (firstNum) setSelectedColumn(firstNum);
                } else if (tab.id === 'standardize') {
                  const firstStr = columns.find(c => c.type === 'string')?.name || '';
                  if (firstStr) setSelectedColumn(firstStr);
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-sans ${
                  isSelected ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column (left 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Column selector for single column cleaning */}
          {activeTab !== 'duplicate' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Select target column:</label>
              <div className="flex flex-wrap gap-2">
                {columns
                  .filter(col => {
                    if (activeTab === 'outliers') return col.type === 'numeric' && col.name !== 'id' && col.name !== 'day' && col.name !== 'ticketId';
                    if (activeTab === 'standardize') return col.type === 'string' && col.name !== 'customerName';
                    return true;
                  })
                  .map((col) => (
                    <button
                      key={col.name}
                      onClick={() => setSelectedColumn(col.name)}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-mono transition-all ${
                        selectedColumn === col.name
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {col.name}
                      <span className="text-[9px] text-slate-400 block tracking-tighter">
                        {col.type}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Tab View: Missing Values */}
          {activeTab === 'missing' && activeMetric && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className={`w-4 h-4 shrink-0 ${activeMetric.missingCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div>
                  <span className="font-semibold text-slate-900 capitalize font-mono">{selectedColumn}</span> has{' '}
                  <span className="font-bold font-mono text-indigo-600">{activeMetric.missingCount}</span> missing values (
                  {activeMetric.missingPercentage}%) out of {activeMetric.totalCount} records.
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700">Imputation Strategy:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'median', label: 'Impute Median', desc: 'Best for skewed numerical curves (ignores extreme outlier bias)', limitNum: true },
                    { id: 'mean', label: 'Impute Mean', desc: 'Standard average value across all metrics', limitNum: true },
                    { id: 'mode', label: 'Impute Mode', desc: 'Most frequent label (perfect for categories)' },
                    { id: 'zero', label: 'Zero Fill', desc: 'Replace with 0 or N/A as placeholder' },
                    { id: 'drop', label: 'Drop Rows', desc: 'Removes the entire row containing null elements' }
                  ]
                    .filter(st => {
                      if (st.limitNum && activeMetric.type !== 'numeric') return false;
                      return true;
                    })
                    .map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => setMissingStrategy(strategy.id as any)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          missingStrategy === strategy.id
                            ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight">{strategy.label}</span>
                        <span className="text-[10px] text-slate-400 mt-1 leading-snug">{strategy.desc}</span>
                      </button>
                    ))}
                </div>
              </div>

              <button
                disabled={activeMetric.missingCount === 0}
                onClick={executeMissingImputation}
                className={`py-2 rounded-xl text-xs font-semibold transition-colors mt-2 ${
                  activeMetric.missingCount === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {activeMetric.missingCount === 0 ? 'No Missing Values Detected' : 'Impute Missing Values'}
              </button>
            </div>
          )}

          {/* Tab View: Duplicates */}
          {activeTab === 'duplicate' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${duplicatesCount > 0 ? 'text-rose-500 animate-bounce' : 'text-emerald-500'}`} />
                <div>
                  <span className="font-semibold text-slate-900">Duplicate detection: </span>
                  There are <span className="font-bold underline text-red-600">{duplicatesCount}</span> duplicated rows based on complete attribute serialization.
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
                <p>
                  <strong>Why they occur:</strong> Signal syncing delays, double form submissions, or faulty SQL joins often results in duplicate elements.
                </p>
                <p>
                  <strong>Educational Note:</strong> Dropping duplicates ensures machine learning models or statistical averages are not falsely weights by repeating observations.
                </p>
              </div>

              <button
                disabled={duplicatesCount === 0}
                onClick={executeDuplicateRemoval}
                className={`py-2 rounded-xl text-xs font-semibold transition-colors mt-2 ${
                  duplicatesCount === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                {duplicatesCount === 0 ? 'No Duplicates Remaining' : `Remove ${duplicatesCount} Duplicate Records`}
              </button>
            </div>
          )}

          {/* Tab View: Outliers */}
          {activeTab === 'outliers' && activeMetric && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <div className="text-slate-800">
                  <span className="font-bold font-mono text-slate-900 capitalize">{selectedColumn}</span> metrics:
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 font-mono text-[10px]">
                    <div>Min: <span className="font-semibold">{activeMetric.min}</span></div>
                    <div>Max: <span className="font-semibold">{activeMetric.max}</span></div>
                    <div>Mean: <span className="font-semibold">{activeMetric.mean}</span></div>
                    <div>Median: <span className="font-semibold">{activeMetric.median}</span></div>
                  </div>
                  <div className="mt-2 border-t border-amber-100 pt-2 text-[11px]">
                    Found <span className="font-bold underline text-amber-700">{activeMetric.outliers?.count || 0}</span> outliers outside standard Interquartile Range boundary limits ([{activeMetric.outliers?.range[0]}, {activeMetric.outliers?.range[1]}]).
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700">Outlier Strategy:</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'cap', label: 'Cap/Clip Winsorize', desc: 'Clamp extreme values to clean normal bounds' },
                    { id: 'median', label: 'Impute Median', desc: 'Replace outliers with the column median' },
                    { id: 'mean', label: 'Impute Mean', desc: 'Replace outliers with the column mean' },
                    { id: 'drop', label: 'Drop Rows', desc: 'Remove rows containing outliers completely' }
                  ].map((strategy) => (
                    <button
                      key={strategy.id}
                      onClick={() => setOutlierStrategy(strategy.id as any)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        outlierStrategy === strategy.id
                          ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{strategy.label}</span>
                      <span className="text-[9px] text-slate-400 mt-1 leading-snug">{strategy.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!activeMetric.outliers || activeMetric.outliers.count === 0}
                onClick={executeOutlierClean}
                className={`py-2 rounded-xl text-xs font-semibold transition-colors mt-2 ${
                  !activeMetric.outliers || activeMetric.outliers.count === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {!activeMetric.outliers || activeMetric.outliers.count === 0 ? 'No Outliers Flagged' : 'Run Outlier Preprocessing'}
              </button>
            </div>
          )}

          {/* Tab View: Standardize */}
          {activeTab === 'standardize' && activeMetric && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-indigo-50/35 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Format standards: </span>
                  Standardize whitespace, casing inconsistencies, or country strings parsed from user inputs on{' '}
                  <span className="font-semibold font-mono text-indigo-700 capitalize">{selectedColumn}</span>.
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700 font-mono">Standardization Rules:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'standard_usa', label: 'ISO Country Standardizer', desc: 'Unifies USA (e.g. "usa", "U.S.A.", "united states") & UK formats' },
                    { id: 'titlecase', label: 'Title Case Stringify', desc: 'Capitalizes the first character of every word ("united kingdom" -> "United Kingdom")' },
                    { id: 'lowercase', label: 'Enforce Lowercase', desc: 'Forces all strings to pure lower case for category joins' },
                    { id: 'trim', label: 'Strip Whitespace Only', desc: 'Trims leading & trailing string spaces' }
                  ].map((strategy) => (
                    <button
                      key={strategy.id}
                      onClick={() => setStandardizeStrategy(strategy.id as any)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        standardizeStrategy === strategy.id
                          ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{strategy.label}</span>
                      <span className="text-[10px] text-slate-400 mt-1 leading-snug">{strategy.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={executeStandardization}
                className="py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors mt-2"
              >
                Apply Format Standardizer
              </button>
            </div>
          )}

        </div>

        {/* Python Snippet Notebook View (right 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-slate-900 border border-slate-950 rounded-xl p-4 shadow-inner text-white flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">pandas_script.py [imputer]</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">
                  Interactive
                </span>
              </div>
              <pre className="text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed p-1 bg-slate-950/40 rounded">
                <code>{generatedCode}</code>
              </pre>
            </div>

            <div className="border-t border-slate-800/80 pt-3 mt-4 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <span className="font-bold text-slate-300 block mb-0.5">Pandas Equivalent Mechanics:</span>
              <p>
                As you alter sliders or imputer choices, the Python block highlights the exact formula used by data scientists.
              </p>
            </div>
          </div>

          {/* Simple Statistics Visual Board Card */}
          <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl text-xs space-y-1.5">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Clean Data Guidelines
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
              <li><strong>Median:</strong> Highly resilient to extreme values (like age 142).</li>
              <li><strong>Mean:</strong> Optimal for stable symmetric parameters with zero outliers.</li>
              <li><strong>Format Clean:</strong> Keeps categorical distributions tidy.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
