import { DatasetColumn, ColumnMetric } from '../types';

/**
 * Calculates mean of an array of numeric values (ignoring null/undefined)
 */
export function getMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Number((sum / arr.length).toFixed(2));
}

/**
 * Calculates median of an array of numeric values (ignoring null/undefined)
 */
export function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

/**
 * Calculates mode of an array of values (ignoring null/undefined/empty)
 */
export function getMode(arr: any[]): any {
  if (arr.length === 0) return undefined;
  const freqMap: Record<string, number> = {};
  let maxFreq = 0;
  let modeVal = arr[0];

  arr.forEach((val) => {
    if (val === null || val === undefined || val === '') return;
    const key = String(val);
    freqMap[key] = (freqMap[key] || 0) + 1;
    if (freqMap[key] > maxFreq) {
      maxFreq = freqMap[key];
      modeVal = val;
    }
  });
  return modeVal;
}

/**
 * Run statistics for each column of the dataset
 */
export function calculateColumnMetrics(data: any[], columns: DatasetColumn[]): ColumnMetric[] {
  return columns.map((col) => {
    const colName = col.name;
    const values = data.map((row) => row[colName]);
    const totalCount = values.length;

    // Detect missed / blank values
    const missingValues = values.filter(
      (v) => v === null || v === undefined || v === '' || (col.type === 'numeric' && isNaN(Number(v)))
    );
    const missingCount = missingValues.length;
    const missingPercentage = Number(((missingCount / totalCount) * 100).toFixed(1));

    // Handle string representation
    const stringValues = values
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map(String);
    const uniqueValuesCount = new Set(stringValues).size;

    // Identify duplicates in total records (we'll count raw duplicates separately)
    // For individual columns, how many non-unique items
    const duplicatesInCol = totalCount - missingCount - new Set(values.filter(v => v !== null && v !== undefined)).size;

    const baseMetric: ColumnMetric = {
      columnName: colName,
      type: col.type,
      totalCount,
      missingCount,
      missingPercentage,
      duplicateCount: Math.max(0, duplicatesInCol),
      uniqueValues: uniqueValuesCount,
    };

    if (col.type === 'numeric') {
      const numericVals = values
        .map((v) => (v === null || v === undefined || v === '' ? NaN : Number(v)))
        .filter((n) => !isNaN(n));

      if (numericVals.length > 0) {
        const minVal = Math.min(...numericVals);
        const maxVal = Math.max(...numericVals);
        const meanVal = getMean(numericVals);
        const medianVal = getMedian(numericVals);

        // IQR Outlier Detection
        const sortedNumeric = [...numericVals].sort((a, b) => a - b);
        const len = sortedNumeric.length;
        
        let q1 = 0;
        let q3 = 0;
        if (len >= 4) {
          q1 = sortedNumeric[Math.floor(len * 0.25)];
          q3 = sortedNumeric[Math.floor(len * 0.75)];
        } else if (len > 0) {
          q1 = minVal;
          q3 = maxVal;
        }
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        // Custom domain warnings (impossible values, like negative age or age > 120, negative income)
        const outlierIndices: number[] = [];
        data.forEach((row, idx) => {
          const val = row[colName];
          if (val === null || val === undefined || val === '' || isNaN(Number(val))) return;
          const num = Number(val);
          
          // Basic IQR flags
          let isIqrOutlier = num < lowerBound || num > upperBound;
          
          // Domain physical overrides
          let isDomainOutlier = false;
          if (colName === 'age' && (num < 0 || num > 110)) isDomainOutlier = true;
          if (colName === 'income' && num < 0) isDomainOutlier = true;
          if (colName === 'heartRate' && (num < 40 || num > 200)) isDomainOutlier = true;
          if (colName === 'steps' && num > 100000) isDomainOutlier = true;
          if (colName === 'resolutionTimeMin' && num > 10000) isDomainOutlier = true;

          if (isIqrOutlier || isDomainOutlier) {
            outlierIndices.push(idx);
          }
        });

        baseMetric.min = minVal;
        baseMetric.max = maxVal;
        baseMetric.mean = meanVal;
        baseMetric.median = medianVal;
        baseMetric.outliers = {
          indices: outlierIndices,
          range: [Number(lowerBound.toFixed(1)), Number(upperBound.toFixed(1))],
          count: outlierIndices.length,
        };
      }
    }

    return baseMetric;
  });
}

/**
 * Detect exact duplicated rows across the whole dataset
 */
export function countDuplicateRows(data: any[]): number {
  const seen = new Set<string>();
  let duplicateCount = 0;

  data.forEach((row) => {
    // Stringify row excluding generic indexes/IDs if needed, or serialize fully
    const serialized = JSON.stringify(row);
    if (seen.has(serialized)) {
      duplicateCount++;
    } else {
      seen.add(serialized);
    }
  });

  return duplicateCount;
}

/**
 * Remove duplicates
 */
export function removeDuplicates(data: any[]): { cleanedData: any[]; countRemoved: number } {
  const seen = new Set<string>();
  const cleanedData: any[] = [];
  let countRemoved = 0;

  data.forEach((row) => {
    const serialized = JSON.stringify(row);
    if (seen.has(serialized)) {
      countRemoved++;
    } else {
      seen.add(serialized);
      cleanedData.push(row);
    }
  });

  return { cleanedData, countRemoved };
}

/**
 * Impute missing value
 */
export function fillMissing(
  data: any[],
  column: string,
  colType: 'numeric' | 'string' | 'date' | 'boolean',
  strategy: 'mean' | 'median' | 'mode' | 'zero' | 'constant' | 'drop',
  constantVal?: any
): { cleanedData: any[]; updatedCount: number } {
  const values = data.map((row) => row[column]);
  
  // Calculate potential fill values
  const numericVals = values
    .map((v) => (v === null || v === undefined || v === '' ? NaN : Number(v)))
    .filter((n) => !isNaN(n));
    
  const validVals = values.filter((v) => v !== null && v !== undefined && v !== '');

  let fillValue: any = null;

  if (strategy === 'mean') {
    fillValue = getMean(numericVals);
  } else if (strategy === 'median') {
    fillValue = getMedian(numericVals);
  } else if (strategy === 'mode') {
    fillValue = getMode(validVals);
  } else if (strategy === 'zero') {
    fillValue = colType === 'numeric' ? 0 : 'N/A';
  } else if (strategy === 'constant') {
    fillValue = constantVal;
  }

  let updatedCount = 0;
  let cleanedData: any[] = [];

  data.forEach((row) => {
    const val = row[column];
    const isMissing = val === null || val === undefined || val === '' || (colType === 'numeric' && isNaN(Number(val)));

    if (isMissing) {
      if (strategy === 'drop') {
        updatedCount++;
        // Don't push to cleanedData (we are dropping the row)
      } else {
        updatedCount++;
        cleanedData.push({
          ...row,
          [column]: fillValue,
        });
      }
    } else {
      cleanedData.push({ ...row });
    }
  });

  return { cleanedData, updatedCount };
}

/**
 * Resolve/Cap outliers
 */
export function cleanOutliers(
  data: any[],
  column: string,
  strategy: 'cap' | 'median' | 'mean' | 'drop' | 'zero',
  outlierIndices: number[],
  fallbackMedianOrMean: number
): { cleanedData: any[]; updatedCount: number } {
  let updatedCount = 0;
  const cleanedData: any[] = [];

  const boundsMap: Record<string, [number, number]> = {
    age: [0, 100],
    income: [0, 250000],
    steps: [0, 50000],
    heartRate: [45, 180],
    resolutionTimeMin: [0, 1440],
  };

  const defaultBounds = boundsMap[column] || [0, 10000];

  data.forEach((row, idx) => {
    if (outlierIndices.includes(idx)) {
      updatedCount++;
      if (strategy === 'drop') {
        // Drop the row, do not push
        return;
      }

      let replacementVal = row[column];
      if (strategy === 'median' || strategy === 'cap') {
        replacementVal = fallbackMedianOrMean;
      } else if (strategy === 'mean') {
        replacementVal = fallbackMedianOrMean;
      } else if (strategy === 'zero') {
        replacementVal = 0;
      }

      // If capping is explicitly selected and value violates normal boundaries
      if (strategy === 'cap') {
        const val = Number(row[column]);
        if (val < defaultBounds[0]) replacementVal = defaultBounds[0];
        if (val > defaultBounds[1]) replacementVal = defaultBounds[1];
      }

      cleanedData.push({
        ...row,
        [column]: replacementVal,
      });
    } else {
      cleanedData.push({ ...row });
    }
  });

  return { cleanedData, updatedCount };
}

/**
 * Standardize text/categories
 */
export function standardizeStringColumn(
  data: any[],
  column: string,
  strategy: 'trim' | 'lowercase' | 'titlecase' | 'standard_usa'
): { cleanedData: any[]; updatedCount: number } {
  let updatedCount = 0;

  const cleanedData = data.map((row) => {
    const val = row[column];
    if (val === null || val === undefined) return { ...row };

    const str = String(val).trim();
    let newVal = str;

    if (strategy === 'lowercase') {
      newVal = str.toLowerCase();
    } else if (strategy === 'titlecase') {
      newVal = str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } else if (strategy === 'standard_usa') {
      const lower = str.toLowerCase();
      if (lower === 'usa' || lower === 'u.s.a.' || lower === 'united states' || lower === 'united states of america') {
        newVal = 'USA';
      } else if (lower === 'uk' || lower === 'u.k.' || lower === 'united kingdom') {
        newVal = 'UK';
      } else {
        newVal = str.charAt(0).toUpperCase() + str.slice(1);
      }
    } else if (strategy === 'trim') {
      newVal = str;
    }

    if (newVal !== val) {
      updatedCount++;
      return {
        ...row,
        [column]: newVal
      };
    }

    return { ...row };
  });

  return { cleanedData, updatedCount };
}
