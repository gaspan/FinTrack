import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';

import { BurnRateChart, type BurnRateDataPoint } from '@/components/charts/BurnRateChart';
import { CashFlowSparklineChart, type CashFlowDataPoint } from '@/components/charts/CashFlowSparklineChart';
import { BudgetBulletChart, type BudgetBulletDataPoint } from '@/components/charts/BudgetBulletChart';
import { MonthlyTrendComboChart } from '@/components/charts/MonthlyTrendComboChart';

/**
 * MANUAL UI TEST SCREEN
 * 
 * Copy file ini ke: src/app/(tabs)/test-charts.tsx
 * Kemudian navigate ke screen ini untuk test semua chart secara visual
 * 
 * Usage:
 * 1. npx expo start
 * 2. Navigate ke /test-charts screen
 * 3. Lihat semua chart render dengan data mock
 * 4. Test dark/light mode
 * 5. Test responsiveness
 */

interface TestState {
  showBurnRate: boolean;
  showCashFlow: boolean;
  showBudgetBullet: boolean;
  showMonthlyTrend: boolean;
  darkMode: boolean;
}

export default function ChartsTestScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [testState, setTestState] = useState<TestState>({
    showBurnRate: true,
    showCashFlow: true,
    showBudgetBullet: true,
    showMonthlyTrend: true,
    darkMode: false,
  });

  // ========================================================================
  // MOCK DATA - BURN RATE CHART
  // ========================================================================
  const mockBurnRateData: BurnRateDataPoint[] = useMemo(() => {
    const data: BurnRateDataPoint[] = [];
    for (let day = 1; day <= 15; day++) {
      data.push({
        date: dayjs().startOf('month').add(day - 1, 'days').format('YYYY-MM-DD'),
        cumulativeSpending: day * 600000 + Math.random() * 200000,
      });
    }
    return data;
  }, []);

  // ========================================================================
  // MOCK DATA - CASH FLOW SPARKLINE
  // ========================================================================
  const mockCashFlowData: CashFlowDataPoint[] = useMemo(() => {
    const data: CashFlowDataPoint[] = [];
    let balance = 5000000;
    for (let i = 0; i < 30; i++) {
      const change = Math.random() * 1000000 - 500000;
      balance = Math.max(500000, balance + change);
      data.push({
        date: dayjs().subtract(30 - i, 'days').format('YYYY-MM-DD'),
        balance,
      });
    }
    return data;
  }, []);

  // ========================================================================
  // MOCK DATA - BUDGET BULLET CHART
  // ========================================================================
  const mockBudgetData: BudgetBulletDataPoint[] = useMemo(() => [
    {
      id: 1,
      categoryName: 'Groceries',
      categoryColor: '#10B981',
      actual: 3500000,
      budget: 5000000,
    },
    {
      id: 2,
      categoryName: 'Transportation',
      categoryColor: '#F59E0B',
      actual: 2800000,
      budget: 3000000,
      rollover: 500000,
    },
    {
      id: 3,
      categoryName: 'Entertainment',
      categoryColor: '#8B5CF6',
      actual: 1200000,
      budget: 1500000,
    },
    {
      id: 4,
      categoryName: 'Utilities',
      categoryColor: '#3B82F6',
      actual: 800000,
      budget: 800000,
    },
    {
      id: 5,
      categoryName: 'Dining',
      categoryColor: '#EC4899',
      actual: 2500000,
      budget: 2000000,
    },
    {
      id: 6,
      categoryName: 'Shopping',
      categoryColor: '#06B6D4',
      actual: 5200000,
      budget: 4000000,
    },
  ], []);

  // ========================================================================
  // MOCK DATA - MONTHLY TREND COMBO
  // ========================================================================
  const mockMonthlyTrendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      data.push({
        month: dayjs().subtract(i, 'months').format('YYYY-MM'),
        income: 20000000 + Math.random() * 5000000,
        expense: 12000000 + Math.random() * 4000000,
      });
    }
    return data;
  }, []);

  const toggleTest = (key: keyof TestState) => {
    setTestState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>📊 Charts Test Screen</Text>
        <Text style={styles.subtitle}>
          Manual UI verification untuk semua chart baru
        </Text>
      </View>

      {/* CONTROL PANEL */}
      <Card style={styles.controlCard}>
        <Text style={styles.controlTitle}>🎛️ Kontrol Test</Text>

        <TouchableOpacity
          style={[styles.testButton, testState.showBurnRate && styles.testButtonActive]}
          onPress={() => toggleTest('showBurnRate')}
        >
          <Text style={styles.testButtonText}>
            {testState.showBurnRate ? '✅' : '☐'} BurnRateChart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, testState.showCashFlow && styles.testButtonActive]}
          onPress={() => toggleTest('showCashFlow')}
        >
          <Text style={styles.testButtonText}>
            {testState.showCashFlow ? '✅' : '☐'} CashFlowSparkline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, testState.showBudgetBullet && styles.testButtonActive]}
          onPress={() => toggleTest('showBudgetBullet')}
        >
          <Text style={styles.testButtonText}>
            {testState.showBudgetBullet ? '✅' : '☐'} BudgetBulletChart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, testState.showMonthlyTrend && styles.testButtonActive]}
          onPress={() => toggleTest('showMonthlyTrend')}
        >
          <Text style={styles.testButtonText}>
            {testState.showMonthlyTrend ? '✅' : '☐'} MonthlyTrendCombo
          </Text>
        </TouchableOpacity>
      </Card>

      {/* TEST CHECKLIST */}
      <Card style={styles.checklistCard}>
        <Text style={styles.checklistTitle}>✓ Visual Checklist</Text>
        <Text style={styles.checklistItem}>☐ Chart renders tanpa crash</Text>
        <Text style={styles.checklistItem}>☐ Data visible dengan jelas</Text>
        <Text style={styles.checklistItem}>☐ Colors sesuai expected</Text>
        <Text style={styles.checklistItem}>☐ Text readable (semua ukuran)</Text>
        <Text style={styles.checklistItem}>☐ Legend/labels ada</Text>
        <Text style={styles.checklistItem}>☐ Animations smooth (60fps)</Text>
        <Text style={styles.checklistItem}>☐ Touch responsive</Text>
        <Text style={styles.checklistItem}>☐ Theme colors konsisten</Text>
      </Card>

      {/* BURN RATE CHART TEST */}
      {testState.showBurnRate && (
        <View style={styles.chartSection}>
          <SectionHeader
            title="1. BurnRateChart Test"
            icon="trending-down-outline"
          />
          <Card style={styles.chartCard}>
            <Text style={styles.chartDescription}>
              📌 Should show: Target pace (dashed) vs Actual spending (solid) + warning jika overspend
            </Text>
            <BurnRateChart
              data={mockBurnRateData}
              monthlyBudget={10000000}
              currentDay={15}
              monthDays={dayjs().daysInMonth()}
            />
            <View style={styles.testNotes}>
              <Text style={styles.testNote}>
                ✓ Target pace linear dari 0 ke 10M selama 30 hari
              </Text>
              <Text style={styles.testNote}>
                ✓ Actual spending line bisa diatas/dibawah target
              </Text>
              <Text style={styles.testNote}>
                ✓ Warning banner muncul jika cumulative lebih besar dari target
              </Text>
              <Text style={styles.testNote}>
                ✓ Summary stats: Hari X | Target Pace | Remaining
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* CASH FLOW SPARKLINE TEST */}
      {testState.showCashFlow && (
        <View style={styles.chartSection}>
          <SectionHeader
            title="2. CashFlowSparklineChart Test"
            icon="wallet-outline"
          />
          <Card style={styles.chartCard}>
            <Text style={styles.chartDescription}>
              📌 Should show: Daily balance trend + volatility analysis + warnings
            </Text>
            <CashFlowSparklineChart
              data={mockCashFlowData}
              currentBalance={3500000}
              minimumBalance={1000000}
            />
            <View style={styles.testNotes}>
              <Text style={styles.testNote}>
                ✓ Sparkline dengan area fill gradient
              </Text>
              <Text style={styles.testNote}>
                ✓ 3-metric summary: Saldo | Perubahan | Volatilitas
              </Text>
              <Text style={styles.testNote}>
                ✓ Min/Max range di bawah chart
              </Text>
              <Text style={styles.testNote}>
                ✓ Warning jika saldo kurang dari 1 juta (minimum threshold)
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* BUDGET BULLET CHART TEST */}
      {testState.showBudgetBullet && (
        <View style={styles.chartSection}>
          <SectionHeader
            title="3. BudgetBulletChart Test"
            icon="pie-chart-outline"
          />
          <Card style={styles.chartCard}>
            <Text style={styles.chartDescription}>
              📌 Should show: Budget utilization dengan color-coded status (G/Y/R)
            </Text>
            <BudgetBulletChart data={mockBudgetData} showTop={6} />
            <View style={styles.testNotes}>
              <Text style={styles.testNote}>
                {'✓ Warna: 🟢 Hijau (<75%) | 🟡 Kuning (75-90%) | 🔴 Merah (>=90%)'}
              </Text>
              <Text style={styles.testNote}>
                ✓ Overall summary di atas: X persen dari total budget
              </Text>
              <Text style={styles.testNote}>
                ✓ Status indicators: "Aman" / "Mendekati batas" / "Melebihi"
              </Text>
              <Text style={styles.testNote}>
                ✓ Sorted by highest spending percentage
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* MONTHLY TREND COMBO TEST */}
      {testState.showMonthlyTrend && (
        <View style={styles.chartSection}>
          <SectionHeader
            title="4. MonthlyTrendComboChart Test"
            icon="analytics-outline"
          />
          <Card style={styles.chartCard}>
            <Text style={styles.chartDescription}>
              📌 Should show: Bars (income/expense) + line overlay (net savings)
            </Text>
            <MonthlyTrendComboChart data={mockMonthlyTrendData} />
            <View style={styles.testNotes}>
              <Text style={styles.testNote}>
                ✓ Grouped bars: 🟢 Income vs 🔴 Expense
              </Text>
              <Text style={styles.testNote}>
                ✓ Line overlay: Net Savings dengan gradient fill
              </Text>
              <Text style={styles.testNote}>
                ✓ Table breakdown dengan monthly metrics
              </Text>
              <Text style={styles.testNote}>
                ✓ Summary stats: Total Income | Expense | Net Savings
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* TEST PROCEDURES */}
      <View style={styles.proceduresSection}>
        <SectionHeader title="🧪 Test Procedures" icon="checkmark-done-outline" />
        <Card style={styles.proceduresCard}>
          <Text style={styles.procedure}>
            <Text style={styles.procedureBold}>1. VISUAL CHECK:</Text>
            {'\n'} • Lihat setiap chart render dengan benar
            {'\n'} • Text readable, tidak terpotong
            {'\n'} • Colors sesuai dark/light theme
          </Text>

          <Text style={styles.procedure}>
            <Text style={styles.procedureBold}>2. THEME TEST:</Text>
            {'\n'} • Toggle dark/light mode
            {'\n'} • Verify semua colors berubah
            {'\n'} • Check contrast ratio WCAG AA
          </Text>

          <Text style={styles.procedure}>
            <Text style={styles.procedureBold}>3. RESPONSIVENESS:</Text>
            {'\n'} • Rotate device (landscape/portrait)
            {'\n'} • Chart tetap visible dan readable
            {'\n'} • No overflow atau cutoff
          </Text>

          <Text style={styles.procedure}>
            <Text style={styles.procedureBold}>4. INTERACTION:</Text>
            {'\n'} • Tap chart area → responsive
            {'\n'} • Scroll list → smooth (60fps)
            {'\n'} • No lag atau jank
          </Text>

          <Text style={styles.procedure}>
            <Text style={styles.procedureBold}>5. EMPTY STATE:</Text>
            {'\n'} • Pass emptyData = [] ke components
            {'\n'} • Verify EmptyState renders gracefully
            {'\n'} • No crashes
          </Text>
        </Card>
      </View>

      {/* QUICK FIXES IF ISSUES */}
      <View style={styles.tipsSection}>
        <SectionHeader title="⚠️ If Issues Found" icon="alert-circle-outline" />
        <Card style={styles.tipsCard}>
          <Text style={styles.tip}>
            <Text style={styles.tipBold}>Chart not showing:</Text>
            {'\n'} 1. Check data is not empty
            {'\n'} 2. Verify date format: YYYY-MM-DD
            {'\n'} 3. Check calculations are correct
          </Text>

          <Text style={styles.tip}>
            <Text style={styles.tipBold}>Colors wrong:</Text>
            {'\n'} 1. Use theme.colors, not hardcoded hex
            {'\n'} 2. Check theme is loaded
            {'\n'} 3. Clear cache: npx expo start -c
          </Text>

          <Text style={styles.tip}>
            <Text style={styles.tipBold}>Performance issues:</Text>
            {'\n'} 1. Check data size (limit to 60 days)
            {'\n'} 2. Verify memoization is working
            {'\n'} 3. Use React DevTools Profiler
          </Text>

          <Text style={styles.tip}>
            <Text style={styles.tipBold}>Accessibility issues:</Text>
            {'\n'} 1. Check font size 12pt minimum
            {'\n'} 2. Touch targets 44pt minimum
            {'\n'} 3. Use screen reader to verify labels
          </Text>
        </Card>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ✅ Test complete? → Ready untuk code review!
        </Text>
        <Text style={styles.footerSubtext}>
          See docs/ folder untuk detailed testing procedures
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  controlCard: {
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  controlTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  testButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  testButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  testButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  checklistCard: {
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  checklistTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  checklistItem: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  chartSection: {
    marginBottom: theme.spacing.xl,
  },
  chartCard: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  chartDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  testNotes: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  testNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  proceduresSection: {
    marginBottom: theme.spacing.xl,
  },
  proceduresCard: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  procedure: {
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  procedureBold: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tipsSection: {
    marginBottom: theme.spacing.xl,
  },
  tipsCard: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  tip: {
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  tipBold: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  footer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.h3,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  footerSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
