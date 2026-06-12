export interface DatasetColumn {
  name: string;
  type: 'numeric' | 'string' | 'date' | 'boolean';
  description: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  columns: DatasetColumn[];
  rawRecords: Array<Record<string, any>>;
  pythonSnippetTemplate: string;
}

export interface ColumnMetric {
  columnName: string;
  type: 'numeric' | 'string' | 'date' | 'boolean';
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  duplicateCount: number;
  uniqueValues: number;
  // Numeric metrics
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  outliers?: {
    indices: number[];
    range: [number, number]; // [lowerBound, upperBound]
    count: number;
  };
}

export interface DataCleanOperation {
  id: string;
  type: 'missing' | 'duplicate' | 'outlier' | 'standardize';
  column?: string;
  parameters: Record<string, any>;
  description: string;
  pythonCode: string;
  timestamp: string;
}

export interface MetricSummary {
  originalRecords: number;
  currentRecords: number;
  removedRecords: number;
  missingValuesFilled: number;
  duplicatesRemoved: number;
  outliersCleaned: number;
  standardizationsDone: number;
}
