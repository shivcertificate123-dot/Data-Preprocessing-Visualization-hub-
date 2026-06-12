import { Dataset } from './types';

export const SAMPLE_DATASETS: Dataset[] = [
  {
    id: 'customer_sales',
    name: 'Customer Sales & Demographics',
    description: 'A customer feedback and sales transaction history dataset containing invalid customer ages, negative income outliers, empty entries, and duplicate records.',
    columns: [
      { name: 'id', type: 'numeric', description: 'Unique identification code for purchase.' },
      { name: 'customerName', type: 'string', description: 'Name of the purchasing customer.' },
      { name: 'age', type: 'numeric', description: 'Reported age of the customer (contains outliers).' },
      { name: 'income', type: 'numeric', description: 'Annual household income in USD (contains negative values & missing fields).' },
      { name: 'purchaseAmount', type: 'numeric', description: 'Cart checkout amount in USD.' },
      { name: 'country', type: 'string', description: 'Country of residence (contains casing inconsistencies).' },
      { name: 'satisfaction', type: 'string', description: 'Satisfaction rating: High, Medium, Low (contains minor whitespaces).' }
    ],
    pythonSnippetTemplate: `import pandas as pd
import numpy as np

# Load our messy customer dataset
df = pd.read_csv('customer_sales.csv')

# 1. Inspect missing values
print(df.isnull().sum())

# 2. Impute income nulls with median
median_income = df['income'].median()
df['income'] = df['income'].fillna(median_income)

# 3. Drop duplicate transactions
df = df.drop_duplicates()

# 4. Standardize country strings
df['country'] = df['country'].str.strip().str.upper().replace({'U.S.A.': 'USA', 'UNITED STATES': 'USA'})
`,
    rawRecords: [
      { id: 101, customerName: 'Aris Thorne', age: 34, income: 72000, purchaseAmount: 145.50, country: 'USA', satisfaction: 'High' },
      { id: 102, customerName: 'Becca Vance', age: 28, income: null, purchaseAmount: 89.90, country: 'U.S.A.', satisfaction: 'Medium' },
      { id: 103, customerName: 'Charlie Kim', age: 142, income: 115000, purchaseAmount: 340.00, country: 'Canada', satisfaction: 'High' }, // OUTLIER: age 142
      { id: 104, customerName: 'Dara Mercer', age: 41, income: -45000, purchaseAmount: 12.00, country: 'usa', satisfaction: 'Low' }, // OUTLIER: negative income
      { id: 105, customerName: 'Elias Reed', age: 53, income: 83000, purchaseAmount: 220.00, country: 'Canada', satisfaction: 'High' },
      { id: 101, customerName: 'Aris Thorne', age: 34, income: 72000, purchaseAmount: 145.50, country: 'USA', satisfaction: 'High' }, // DUPLICATE
      { id: 106, customerName: 'Fiona Gallagher', age: 22, income: 28000, purchaseAmount: 45.00, country: 'united states', satisfaction: 'Medium ' }, // Inconsistent state
      { id: 107, customerName: 'George Smith', age: 31, income: 95000, purchaseAmount: 510.80, country: 'Canada', satisfaction: 'High' },
      { id: 108, customerName: 'Hana Alani', age: 62, income: null, purchaseAmount: 15.20, country: 'U.K.', satisfaction: 'Low' }, // Missing income
      { id: 109, customerName: 'Ian Malcolm', age: 50, income: 450000, purchaseAmount: 1250.00, country: 'USA', satisfaction: 'High' }, // OUTLIER: very high income but maybe valid, let's observe
      { id: 110, customerName: 'Julia Rob', age: -5, income: 52000, purchaseAmount: 95.00, country: 'UK', satisfaction: 'Medium' }, // OUTLIER: negative age
      { id: 111, customerName: 'Kevin Hart', age: 44, income: 61000, purchaseAmount: 140.00, country: 'U.S.A.', satisfaction: 'Medium' },
      { id: 112, customerName: 'Linda Lovelace', age: 38, income: 78000, purchaseAmount: null, country: 'Canada', satisfaction: 'High' }, // Missing purchase amount
      { id: 113, customerName: 'Marcus Aurelius', age: 57, income: 89000, purchaseAmount: 198.00, country: 'usa', satisfaction: 'Low' },
      { id: 107, customerName: 'George Smith', age: 31, income: 95000, purchaseAmount: 510.80, country: 'Canada', satisfaction: 'High' }, // DUPLICATE
      { id: 114, customerName: 'Nina Simone', age: 29, income: 105000, purchaseAmount: 310.00, country: 'France', satisfaction: 'High' },
      { id: 115, customerName: 'Oscar Wilde', age: 118, income: 42000, purchaseAmount: 85.00, country: 'France', satisfaction: 'Medium' }, // OUTLIER: age 118
      { id: 116, customerName: 'Patricia Aris', age: 36, income: -12000, purchaseAmount: 60.50, country: 'uk', satisfaction: 'Low' }, // OUTLIER: negative income
      { id: 117, customerName: 'Quentin Webb', age: 25, income: null, purchaseAmount: 120.00, country: 'France', satisfaction: 'Medium' }, // Missing income
      { id: 118, customerName: 'Rachel Green', age: 32, income: 64000, purchaseAmount: 175.00, country: 'USA', satisfaction: 'High' },
      { id: 119, customerName: 'Steve Rogers', age: 105, income: 15000, purchaseAmount: 30.00, country: 'U.S.A.', satisfaction: 'High' } // Valid age for Captain America, but outlier statistically!
    ]
  },
  {
    id: 'health_tracker',
    name: 'Fitness Band Device Logs',
    description: 'A sensory logs dataset tracking daily wearable indicators, exhibiting duplicated device syncing, out-of-bounds heart rate spikes, and zero values representing packet loss.',
    columns: [
      { name: 'day', type: 'numeric', description: 'Log sequence sequence index (Day 1, 2, ...)' },
      { name: 'steps', type: 'numeric', description: 'Total counted steps walked during the 24h cycle.' },
      { name: 'heartRate', type: 'numeric', description: 'Mean resting pulse rate recorded (exhibits device error codes -99 & spikes).' },
      { name: 'sleepHours', type: 'numeric', description: 'Detected deep and shallow sleep combined metrics.' },
      { name: 'caloriesBurned', type: 'numeric', description: 'Metabolic calories spent active.' },
      { name: 'deviceStatus', type: 'string', description: 'Battery / Sync status tag: Synced or Syncing (lowercased inconsistencies).' }
    ],
    pythonSnippetTemplate: `import pandas as pd

# Load smart band logs
df = pd.read_csv('health_tracker.csv')

# 1. Clean device heart rates under 40 bpm or above 220 bpm (outliers / sync errors)
df.loc[(df['heartRate'] < 40) | (df['heartRate'] > 220), 'heartRate'] = np.nan
df['heartRate'] = df['heartRate'].fillna(df['heartRate'].mean())

# 2. Steps cleaning - replace extreme step counts (>100k which is likely static noise)
df.loc[df['steps'] > 100000, 'steps'] = df['steps'].median()

# 3. Standardize sync tags
df['deviceStatus'] = df['deviceStatus'].str.strip().str.lower()
`,
    rawRecords: [
      { day: 1, steps: 8400, heartRate: 72, sleepHours: 6.8, caloriesBurned: 2100, deviceStatus: 'synced' },
      { day: 2, steps: 10200, heartRate: 68, sleepHours: 7.2, caloriesBurned: 2450, deviceStatus: 'synced' },
      { day: 3, steps: 350, heartRate: 55, sleepHours: 4.5, caloriesBurned: null, deviceStatus: 'sync_error' }, // Missing calories
      { day: 4, steps: 11000, heartRate: -99, sleepHours: 8.0, caloriesBurned: 2500, deviceStatus: 'synced' }, // OUTLIER: -99 heartrate
      { day: 5, steps: 7200, heartRate: 74, sleepHours: 6.5, caloriesBurned: 1950, deviceStatus: 'SYNCED' },
      { day: 6, steps: 890000, heartRate: 71, sleepHours: 7.0, caloriesBurned: 2200, deviceStatus: 'synced' }, // OUTLIER: steps 890,000 (device bug)
      { day: 7, steps: 5600, heartRate: 240, sleepHours: 1.2, caloriesBurned: 1500, deviceStatus: 'syncing' }, // OUTLIER: 240 bpm resting heartRate
      { day: 2, steps: 10200, heartRate: 68, sleepHours: 7.2, caloriesBurned: 2450, deviceStatus: 'synced' }, // DUPLICATE Day 2
      { day: 8, steps: 9100, heartRate: 70, sleepHours: null, caloriesBurned: 2150, deviceStatus: 'Synced' }, // Missing sleep
      { day: 9, steps: 10500, heartRate: 69, sleepHours: 7.5, caloriesBurned: 2400, deviceStatus: 'synced' },
      { day: 10, steps: null, heartRate: 73, sleepHours: 6.9, caloriesBurned: 2050, deviceStatus: 'synced' }, // Missing steps
      { day: 11, steps: 12000, heartRate: -99, sleepHours: 7.8, caloriesBurned: 2600, deviceStatus: 'synced' }, // OUTLIER: -99 heart rate
      { day: 12, steps: 8500, heartRate: 68, sleepHours: 8.5, caloriesBurned: 2000, deviceStatus: 'synced' },
      { day: 13, steps: 14000, heartRate: 75, sleepHours: 6.2, caloriesBurned: 2800, deviceStatus: 'Synced ' },
      { day: 14, steps: 20500, heartRate: 180, sleepHours: 5.5, caloriesBurned: 3500, deviceStatus: 'synced' }, // Valid exercise peak steps/HR but high
      { day: 15, steps: 6000, heartRate: 67, sleepHours: 7.1, caloriesBurned: 1750, deviceStatus: 'synced' },
      { day: 11, steps: 12000, heartRate: -99, sleepHours: 7.8, caloriesBurned: 2600, deviceStatus: 'synced' } // DUPLICATE Day 11
    ]
  },
  {
    id: 'support_log',
    name: 'Tech Helpdesk Ticket Metrics',
    description: 'An IT customer service report with empty support scores, extreme resolution times reflecting abandoned tickets, and duplicated resubmissions.',
    columns: [
      { name: 'ticketId', type: 'numeric', description: 'The registration token of the file issue.' },
      { name: 'category', type: 'string', description: 'Silo category of help: Bug, Network, Billing, Security.' },
      { name: 'priority', type: 'string', description: 'Urgency flag: High, Medium, Low.' },
      { name: 'responseTimeMin', type: 'numeric', description: 'Total response buffer in elapsed minutes.' },
      { name: 'resolutionTimeMin', type: 'numeric', description: 'Total fix time in minutes (exhibits 99999 placeholder entries).' },
      { name: 'rating', type: 'numeric', description: 'User feedback score on a scale of 1-5 (contains missing ratings).' }
    ],
    pythonSnippetTemplate: `import pandas as pd

# Analyze support dashboard
df = pd.read_csv('helpdesk_metrics.csv')

# 1. Inspect invalid placeholders
# 99999 represents unfinished / abandoned files that skew statistics
df.loc[df['resolutionTimeMin'] == 99999, 'resolutionTimeMin'] = np.nan

# 2. Impute with mean or median depending on skewness
df['resolutionTimeMin'] = df['resolutionTimeMin'].fillna(df['resolutionTimeMin'].median())

# 3. Handle missing ratings
# Fill missing satisfaction ratings with an average (e.g., 3.0 or median)
df['rating'] = df['rating'].fillna(3.5)
`,
    rawRecords: [
      { ticketId: 2001, category: 'Bug', priority: 'High', responseTimeMin: 12, resolutionTimeMin: 120, rating: 5 },
      { ticketId: 2002, category: 'network', priority: 'Medium', responseTimeMin: 45, resolutionTimeMin: 340, rating: 4 },
      { ticketId: 2003, category: 'Billing', priority: 'Low', responseTimeMin: 120, resolutionTimeMin: 99999, rating: null }, // OUTLIER & MISSING: unresolved skewer (99999) + missing rating
      { ticketId: 2004, category: 'Bug', priority: 'High', responseTimeMin: 5, resolutionTimeMin: 45, rating: null }, // MISSING: score null
      { ticketId: 2005, category: 'Security', priority: 'High', responseTimeMin: 2, resolutionTimeMin: 80, rating: 5 },
      { ticketId: 2002, category: 'network', priority: 'Medium', responseTimeMin: 45, resolutionTimeMin: 340, rating: 4 }, // DUPLICATE
      { ticketId: 2006, category: 'Billing', priority: 'Low', responseTimeMin: 180, resolutionTimeMin: 240, rating: 3 },
      { ticketId: 2007, category: 'Bug', priority: 'High', responseTimeMin: null, resolutionTimeMin: 99999, rating: 2 }, // MISSING responseTime + skewer resolution
      { ticketId: 2008, category: 'NETWORK', priority: 'Low', responseTimeMin: 15, resolutionTimeMin: 110, rating: 1 },
      { ticketId: 2009, category: 'Billing', priority: 'Medium', responseTimeMin: null, resolutionTimeMin: 300, rating: null }, // Double missing
      { ticketId: 2010, category: 'Security', priority: 'High', responseTimeMin: 4, resolutionTimeMin: 95, rating: 5 },
      { ticketId: 2011, category: 'bug', priority: 'Low', responseTimeMin: 60, resolutionTimeMin: 180, rating: 4 },
      { ticketId: 2012, category: 'Billing', priority: 'High', responseTimeMin: 8, resolutionTimeMin: null, rating: null }, // Missing resolution + rating
      { ticketId: 2013, category: 'Network', priority: 'Medium', responseTimeMin: 30, resolutionTimeMin: 540, rating: 3 },
      { ticketId: 2001, category: 'Bug', priority: 'High', responseTimeMin: 12, resolutionTimeMin: 120, rating: 5 } // DUPLICATE
    ]
  }
];
