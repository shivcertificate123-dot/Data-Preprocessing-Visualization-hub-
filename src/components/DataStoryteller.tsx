import React, { useState } from 'react';
import { MetricSummary } from '../types';
import { Award, BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DataStorytellerProps {
  summary: MetricSummary;
  datasetId: string;
  datasetName: string;
}

export default function DataStoryteller({ summary, datasetId, datasetName }: DataStorytellerProps) {
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  const toggleTip = (index: number) => {
    setExpandedTip(expandedTip === index ? null : index);
  };

  // Pre-configured educational tips
  const educationalTips = [
    {
      q: 'When should I impute with Median vs. Mean?',
      a: 'Use the Median when the distribution is highly skewed or contains heavy outliers (e.g., Salaries or House prices). Extreme values pull the Mean way up or down, whereas the Median represents the true literal midpoint of the sorted list, unaffected by outliers.'
    },
    {
      q: 'Why not just delete all rows with missing values (dropna)?',
      a: 'Dropping rows (Listwise deletion) is simple, but wasteful. For small datasets, you could lose 30-50% of your critical records! If those missing files are not completely random (e.g., low-income users refusing to report income), dropping rows introduces dangerous statistical bias.'
    },
    {
      q: 'What is "Winsorizing" outliers?',
      a: 'Named after statistician Charles Winsor, this involves capping extreme values to a specific percentile (such as the 1st and 99th percentiles) instead of deleting them. This preserves the observational density (row counts) while preventing extreme skews in metrics and charts.'
    },
    {
      q: 'How do duplicates damage Machine Learning?',
      a: 'Duplicates cause "Data Leakage." If identical rows end up in both your Training set and Testing set, your ML model looks artificially accurate because it simply memorized the duplicates, but fails entirely on real new data in production.'
    }
  ];

  // Specific descriptive stories based on the active dataset progress
  const datasetStory = React.useMemo(() => {
    const isCleanedAtAll =
      summary.missingValuesFilled > 0 ||
      summary.duplicatesRemoved > 0 ||
      summary.outliersCleaned > 0 ||
      summary.standardizationsDone > 0;

    if (!isCleanedAtAll) {
      return {
        headline: 'A Raw, Unclean Narrative is Waiting',
        body: 'This dataset is currently containing raw, unfiltered anomalies. It represents files freshly retrieved from sensors, unpolished client entries, or network sync errors. Take the first analytical step by imputing null rows or dropping duplicates to start telling a clean data story!',
        impact: 'Raw state represents potential bias in calculations, duplicate inflate rates, which skews standard reports.'
      };
    }

    if (datasetId === 'customer_sales') {
      return {
        headline: 'Restored Customer Demographics Integrity',
        body: `By solving ${summary.outliersCleaned} extreme age & income outliers (including age 142 typing mistakes and negative salaries), your averages reflect authentic human behaviors. Standardizing countries (merging "USA", "usa", "U.S.A." into unified buckets) aggregated sales distributions without redundant category splitting.`,
        impact: `Restored ${summary.missingValuesFilled} missing incomes without losing purchase transaction totals, keeping sample size maxed at ${summary.currentRecords} rows.`
      };
    } else if (datasetId === 'health_tracker') {
      return {
        headline: 'Synchronized Smart Sensory Logs',
        body: `Device packet drops are resolved. Resolving step spikes (such as the 890,000 extreme step noise) returns realistic fitness trends. Removing ${summary.duplicatesRemoved} identical duplicate sync logs ensures daily calorie calculations are perfectly calibrated.`,
        impact: `Standardized sensor logs to unified lowercase statuses with standard battery trackers, avoiding chart division.`
      };
    } else if (datasetId === 'support_log') {
      return {
        headline: 'Streamlined Customer Ticket Audits',
        body: `Capping outstanding 99,999-minute resolution placeholder rows (representing open or abandoned tickets) prevents severe skews in helpdesk statistics. Satisfactory support feedback rating calculation has been imputed safely to ensure unbiased evaluation.`,
        impact: `Standardized categories combined spelling deviations ("bug", "BUG") so team metrics correlate cleanly.`
      };
    }

    return {
      headline: `Custom Dataset Preprocessed Successfully!`,
      body: `You successfully handled ${summary.missingValuesFilled} missing values, resolved ${summary.duplicatesRemoved} duplicate entries, and cleaned ${summary.outliersCleaned} outliers in the loaded dataset "${datasetName}".`,
      impact: `Dataset successfully prepared with ${summary.currentRecords} clean observations and ${summary.standardizationsDone} formatted elements.`
    };
  }, [summary, datasetId, datasetName]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Preprocessing Summary Metrics (left 5 cols) */}
      <div className="md:col-span-5 bg-slate-900 text-white rounded-2xl p-6 border border-slate-950 flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            Cleaning Impact Summary
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400">Original Row Count:</span>
              <span className="font-mono text-sm font-bold">{summary.originalRecords}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400">Current Clean Count:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">{summary.currentRecords}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400">Missing Imputations:</span>
              <span className="font-mono text-sm font-bold text-indigo-400">{summary.missingValuesFilled}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400">Duplicates Eradicated:</span>
              <span className="font-mono text-sm font-bold text-rose-400">{summary.duplicatesRemoved}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400">Outliers Solved:</span>
              <span className="font-mono text-sm font-bold text-amber-400">{summary.outliersCleaned}</span>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-slate-400 font-mono">Format Cleanups:</span>
              <span className="font-mono text-sm font-semibold">{summary.standardizationsDone}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Active records ready for statistical models & reports.</span>
        </div>
      </div>

      {/* Dataset Story & Educational FAQ (right 7 cols) */}
      <div className="md:col-span-7 flex flex-col gap-6">
        
        {/* Dynamic Storytelling Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Storytelling with Data
          </span>
          <h3 className="text-base font-semibold text-slate-950 font-sans leading-tight">
            {datasetStory.headline}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {datasetStory.body}
          </p>
          <div className="p-3 bg-emerald-50/55 border border-emerald-100 rounded-xl flex gap-2.5 text-xs text-emerald-800 items-start">
            <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="leading-snug">
              <strong>Preprocessing Impact:</strong> {datasetStory.impact}
            </p>
          </div>
        </div>

        {/* Accordion FAQ Tips */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Learn Data Preprocessing Concepts
          </h3>

          <div className="space-y-2">
            {educationalTips.map((tip, idx) => {
              const isExpanded = expandedTip === idx;
              return (
                <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
                  <button
                    onClick={() => toggleTip(idx)}
                    className="w-full text-left p-3 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <span>{tip.q}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-t border-slate-100 p-3 text-xs text-slate-600 leading-relaxed bg-white"
                      >
                        {tip.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
