# FinTrack Financial Charts - Quick Reference Card

**Print this card or bookmark it for quick access during integration!**

---

## 🎯 Three New Charts at a Glance

### 1. BurnRateChart
```typescript
import { BurnRateChart } from '@/components/charts';

<BurnRateChart
  data={burnRateData}           // BurnRateDataPoint[]
  monthlyBudget={10000000}       // Total budget
  currentDay={15}                // 1-31
  monthDays={30}                 // Days in month
/>
```
**When to use:** Track spending pace throughout the month  
**Best placement:** AnalyticsLayer (month-end tracking)  
**Data needed:** Daily cumulative spending totals

---

### 2. CashFlowSparklineChart
```typescript
import { CashFlowSparklineChart } from '@/components/charts';

<CashFlowSparklineChart
  data={cashFlowData}            // CashFlowDataPoint[]
  currentBalance={3500000}       // Today's balance
  minimumBalance={1000000}       // Safety threshold (optional)
/>
```
**When to use:** Monitor daily balance volatility  
**Best placement:** AlertsLayer (liquidity monitoring)  
**Data needed:** 30-60 days of daily balance snapshots

---

### 3. BudgetBulletChart
```typescript
import { BudgetBulletChart } from '@/components/charts';

<BudgetBulletChart
  data={budgetData}              // BudgetBulletDataPoint[]
  showTop={6}                    // Limit displayed items
/>
```
**When to use:** Visualize budget utilization with status  
**Best placement:** OperationalLayer (replace MonthBarsCard)  
**Data needed:** Category budgets + current spending

---

### 4. MonthlyTrendComboChart
```typescript
import { MonthlyTrendComboChart } from '@/components/charts';

<MonthlyTrendComboChart
  data={trendData}               // 6 months of data
/>
```
**When to use:** View income/expense bars + net savings line  
**Best placement:** AnalyticsLayer Tab "Tren"  
**Data needed:** Monthly income + expense (6 months)

---

## 📊 Data Interfaces

### BurnRateDataPoint
```typescript
interface BurnRateDataPoint {
  date: string;                  // "2026-09-11"
  cumulativeSpending: number;    // 1500000
}
```

### CashFlowDataPoint
```typescript
interface CashFlowDataPoint {
  date: string;                  // "2026-09-11"
  balance: number;               // 3500000
}
```

### BudgetBulletDataPoint
```typescript
interface BudgetBulletDataPoint {
  id: number;
  categoryName: string;
  categoryColor: string;         // "#10B981"
  actual: number;                // Amount spent
  budget: number;                // Budget limit
  rollover?: number;             // Previous month carryover
}
```

### MonthlyComboDataPoint
```typescript
interface MonthlyComboDataPoint {
  month: string;                 // "2026-09"
  income: number;
  expense: number;
  // netSavings auto-calculated: income - expense
}
```

---

## 🎨 Color Coding Quick Reference

### BudgetBulletChart Status Colors
| Status | Color | Range |
|--------|-------|-------|
| 🟢 Safe | Green | < 75% |
| 🟡 Caution | Yellow | 75-90% |
| 🔴 Overbudget | Red | ≥ 90% |

### CashFlowSparklineChart Line Colors
| Status | Color |
|--------|-------|
| 📈 Positive trend | Green |
| 📉 Negative trend | Red |
| ⚠️ Below minimum | Red (warning) |

### BurnRateChart Line Colors
| Line | Color | Style |
|------|-------|-------|
| Actual spending | Green/Red | Solid |
| Target pace | Grey | Dashed |

---

## 🔧 Integration Quick Steps

### Step 1: Import
```typescript
import {
  BurnRateChart,
  CashFlowSparklineChart,
  BudgetBulletChart,
  MonthlyTrendComboChart,
} from '@/components/charts';

import {
  useBurnRateData,
  useCashFlowSparklineData,
  useBudgetBulletData,
} from '@/features/dashboard/useFinancialCharts';
```

### Step 2: Get Data
```typescript
// Option A: Use hooks (after implementing database queries)
const { data, monthlyBudget, currentDay, monthDays } = useBurnRateData(
  startDate,
  endDate
);

// Option B: Convert existing data format
const bulletData = budgets.map(b => ({
  id: b.id,
  categoryName: b.category_name,
  categoryColor: b.color,
  actual: b.spent,
  budget: b.monthly_limit,
  rollover: b.rollover_amount,
}));
```

### Step 3: Render
```typescript
<BurnRateChart
  data={data}
  monthlyBudget={monthlyBudget}
  currentDay={currentDay}
  monthDays={monthDays}
/>
```

---

## 📁 File Locations

| Component | File |
|-----------|------|
| BurnRateChart | `src/components/charts/BurnRateChart.tsx` |
| CashFlowSparklineChart | `src/components/charts/CashFlowSparklineChart.tsx` |
| BudgetBulletChart | `src/components/charts/BudgetBulletChart.tsx` |
| MonthlyTrendComboChart | `src/components/charts/MonthlyTrendComboChart.tsx` |
| Data Hooks | `src/features/dashboard/useFinancialCharts.ts` |
| Examples | `src/components/charts/FinancialChartsShowcase.tsx` |
| Integration Patterns | `src/components/charts/IntegrationExamples.tsx` |

---

## 🐛 Common Issues & Solutions

### Issue: Chart not showing data
**Solution:** Verify data structure matches interface
```typescript
// ✅ Correct
const data = [
  { date: '2026-09-01', cumulativeSpending: 500000 },
  { date: '2026-09-02', cumulativeSpending: 1000000 },
];

// ❌ Wrong
const data = [
  { day: 1, spending: 500000 },  // Wrong field names
];
```

### Issue: Chart colors wrong in dark mode
**Solution:** Use theme colors, not hardcoded hex
```typescript
// ✅ Correct
color={theme.colors.income}

// ❌ Wrong
color="#10B981"
```

### Issue: Performance degradation
**Solution:** Limit data points and adjust spacing
```typescript
// ✅ Better performance
<CashFlowSparklineChart
  data={data.slice(-60)}  // Last 60 days only
  minimumBalance={minimumBalance}
/>
```

### Issue: "Cannot read property 'length' of undefined"
**Solution:** Check data is array, not undefined
```typescript
// ✅ Correct
if (!data || data.length === 0) return <EmptyState />;

// Then use data safely
```

---

## 🎯 Dashboard Layer Placement Matrix

```
HERO LAYER (Top)
├── Balance card
└── Trend indicator
    ↓
OPERATIONAL LAYER (Critical)
├── 🎯 BudgetBulletChart (replaces MonthBarsCard)
├── Recent Transactions
└── Safe-to-Spend
    ↓
ALERTS LAYER (Warnings)
├── 💰 CashFlowSparklineChart (NEW)
├── Financial Health
└── Spending Alerts
    ↓
ANALYTICS LAYER (Analysis)
├── Tabs:
│   ├── Ringkas: OverviewDonutChart
│   ├── Kategori: BudgetBulletChart
│   └── Tren: MonthlyTrendComboChart
├── 📊 BurnRateChart (NEW, month-end tracking)
└── Monthly Breakdown
    ↓
WEALTH LAYER (Long-term)
├── Net Worth Chart
└── Goals Progress
    ↓
MARKET LAYER (Economic)
├── Gold/USD price
└── News
```

---

## 📈 Performance Tips

### Optimize Data Loading
```typescript
// ✅ Load only needed data
const data = transactions.slice(-60);  // Last 60 days

// ✅ Pre-calculate aggregates
const dailyTotals = aggregateDailyExpenses(transactions);

// ✅ Memoize expensive calculations
const memoizedData = useMemo(() => {
  return calculateBurnRate(expenses);
}, [expenses]);
```

### Optimize Rendering
```typescript
// ✅ Use lazy label rendering
spacing={40}  // Bigger spacing = fewer labels

// ✅ Limit data points shown
showTop={6}  // Don't show all 50 categories

// ✅ Use noOfSections to reduce y-axis calculations
noOfSections={3}  // Instead of default 10
```

---

## ✨ Pro Tips

### Tip 1: Progressive Enhancement
Start with basic chart, then add features:
```typescript
// Step 1: Just show the chart
<BudgetBulletChart data={data} />

// Step 2: Add filtering
<BudgetBulletChart data={data} showTop={6} />

// Step 3: Add drill-down (future)
<BudgetBulletChart data={data} onCategoryPress={handleDrill} />
```

### Tip 2: Data Transformation
Convert existing data structure efficiently:
```typescript
const toChartFormat = (budgets: Budget[]): BudgetBulletDataPoint[] =>
  budgets.map(b => ({
    id: b.id,
    categoryName: b.category_name,
    categoryColor: b.color,
    actual: b.spent,
    budget: b.monthly_limit,
    rollover: b.rollover_amount,
  }));
```

### Tip 3: Responsive Sizing
Make charts work on all screen sizes:
```typescript
const spacing = screenWidth > 400 ? 40 : 30;

<LineChart
  spacing={spacing}
  height={screenWidth > 600 ? 200 : 160}
/>
```

### Tip 4: Empty State Handling
Always handle empty data gracefully:
```typescript
if (!data || data.length === 0) {
  return <EmptyState title="Belum ada data" />;
}
```

---

## 📞 Help Resources

| Resource | Location |
|----------|----------|
| **Integration Guide** | `docs/FINANCIAL_CHARTS_INTEGRATION_GUIDE.md` |
| **Implementation Summary** | `docs/FINANCIAL_CHARTS_IMPLEMENTATION_SUMMARY.md` |
| **Deployment Checklist** | `docs/DEPLOYMENT_CHECKLIST.md` |
| **Code Examples** | `src/components/charts/FinancialChartsShowcase.tsx` |
| **Integration Patterns** | `src/components/charts/IntegrationExamples.tsx` |

---

## 🚀 Quick Start Command

```bash
# Import all charts at once
import {
  BurnRateChart,
  CashFlowSparklineChart,
  BudgetBulletChart,
  MonthlyTrendComboChart,
} from '@/components/charts';

# Then use them in your components!
# See IntegrationExamples.tsx for patterns
```

---

**Last Updated:** September 11, 2026  
**Version:** 1.0 - Production Ready  
**Questions?** See documentation files or review example components
