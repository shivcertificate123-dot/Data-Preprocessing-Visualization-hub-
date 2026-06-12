import React, { useState, useRef } from 'react';
import { Dataset, DatasetColumn } from '../types';
import { SAMPLE_DATASETS } from '../sampleData';
import { FileUp, Database, HelpCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface DatasetSelectorProps {
  onSelectDataset: (dataset: Dataset) => void;
  selectedDatasetId: string;
}

export default function DatasetSelector({ onSelectDataset, selectedDatasetId }: DatasetSelectorProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPreloaded = (dsId: string) => {
    const ds = SAMPLE_DATASETS.find((d) => d.id === dsId);
    if (ds) {
      // Create a fresh clone to avoid side-effects
      onSelectDataset(JSON.parse(JSON.stringify(ds)));
    }
  };

  // Basic CSV Parser
  const parseCSVBytes = (text: string, fileName: string): Dataset => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      throw new Error('CSV file appears to be empty.');
    }

    // Split headers
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    if (headers.length < 2) {
      throw new Error('CSV must contain at least 2 columns separated by commas.');
    }

    // Extract records
    const rawRecords: Array<Record<string, any>> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex handling commas inside quotes
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const rowVals = matches.map(val => val.replace(/^["']|["']$/g, '').trim());

      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        const val = rowVals[index];
        if (val === undefined || val === '' || val.toLowerCase() === 'null') {
          record[header] = null;
        } else {
          // Auto detect numbers
          const isNum = !isNaN(Number(val)) && val !== '';
          record[header] = isNum ? Number(val) : val;
        }
      });
      rawRecords.push(record);
    }

    // Generate columns
    const columns: DatasetColumn[] = headers.map((header) => {
      // Detect type
      let type: 'numeric' | 'string' | 'date' | 'boolean' = 'string';
      const sampleVals = rawRecords.slice(0, 10).map(r => r[header]).filter(v => v !== null);
      const isMostlyNumeric = sampleVals.every(v => typeof v === 'number');
      
      if (isMostlyNumeric) {
        type = 'numeric';
      } else {
        // Simple date sniff
        const isMostlyDate = sampleVals.every(v => typeof v === 'string' && !isNaN(Date.parse(v)) && v.length > 6);
        if (isMostlyDate) {
          type = 'date';
        }
      }

      return {
        name: header,
        type,
        description: `Custom parsed column "${header}"`
      };
    });

    return {
      id: `custom_csv_${Date.now()}`,
      name: fileName.replace(/\.[^/.]+$/, ""),
      description: `Uploaded custom CSV dataset containing ${rawRecords.length} entries to clean and visualize.`,
      columns,
      rawRecords,
      pythonSnippetTemplate: `# Custom uploaded CSV workflow
import pandas as pd
df = pd.read_csv('${fileName}')
print(df.info())
`
    };
  };

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only standard .csv files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const customDs = parseCSVBytes(text, file.name);
        onSelectDataset(customDs);
      } catch (err: any) {
        setUploadError(err.message || 'Error occurred while parsing CSV.');
      }
    };
    reader.onerror = () => {
      setUploadError('File could not be read.');
    };
    reader.readAsText(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Select Raw Dataset</h2>
          <p className="text-xs text-slate-500">Pick an illustrative project or upload your own raw csv file.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {SAMPLE_DATASETS.map((ds) => {
          const isSelected = selectedDatasetId === ds.id;
          return (
            <button
              key={ds.id}
              onClick={() => handleSelectPreloaded(ds.id)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 group relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ds.id === 'customer_sales' ? 'Commercial' : ds.id === 'health_tracker' ? 'IoT Tracking' : 'IT Metrics'}
                  </span>
                  {isSelected && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors mb-1">
                  {ds.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {ds.description}
                </p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">
                  {ds.rawRecords.length} records • {ds.columns.length} features
                </span>
                <span className="text-[11px] font-medium text-indigo-600 group-hover:underline flex items-center gap-1">
                  Load <RefreshCw className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* CSV Draggable Block */}
      <div
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-600 bg-indigo-50/30Scale text-indigo-600'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-white hover:scale-105 transition-transform shadow-sm rounded-full text-slate-400 border border-slate-100">
            <FileUp className="w-6 h-6 text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            Have custom CSV? Drag it here or <span className="text-indigo-600 hover:underline">Browse files</span>
          </span>
          <span className="text-xs text-slate-400">Supports standard CSV files up to 2MB (with commas)</span>
        </div>
      </div>

      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center justify-between"
        >
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 font-bold px-2">×</button>
        </motion.div>
      )}
    </div>
  );
}
