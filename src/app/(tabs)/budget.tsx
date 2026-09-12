import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { BudgetQueries, CategoryQueries } from '@/lib/queries';
import { Category } from '@/types';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { RolloverEngine } from '@/features/rollover/rolloverEngine';
import { formatRupiah } from '@/utils/format';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { hapticSuccess } from '@/utils/haptic';
import { staggerDelay, shouldReduceMotion } from '@/utils/motion';

export default function BudgetScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook, books } = useBook();
  const bookId = activeBook?.id ?? 1;
  
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth] = useState(dayjs().format('YYYY-MM'));
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(0);
  const [currentRollover, setCurrentRollover] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [budgetData, catData] = await Promise.all([
        new BudgetQueries(db, bookId).getByMonth(currentMonth),
        new CategoryQueries(db, bookId).getByType('expense'),
      ]);
      setBudgets(budgetData);
      setCategories(catData);
    } catch (e) { console.error(e); }
  }, [db, bookId, currentMonth]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatRp = formatRupiah;

  const overall = useMemo(() => {
    let totalLimit = 0, totalSpent = 0;
    const mapped = categories.map(cat => {
      const b = budgets.find(b => b.category_id === cat.id);
      const baseLimit = b?.monthly_limit || 0;
      const rollover = b?.rollover_amount || 0;
      const limit = baseLimit + rollover;
      const spent = b?.spent || 0;
      totalLimit += limit;
      totalSpent += spent;
      return { category: cat, budget: b || { monthly_limit: 0, spent: 0, rollover_amount: 0 }, limit, baseLimit, rollover, spent };
    });
    const pct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { items: mapped, totalLimit, totalSpent, pct };
  }, [categories, budgets]);

  const handleSaveBudget = async (limit: number, rolloverEnabled: boolean) => {
    if (!selectedCategory) return;
    try {
      await new BudgetQueries(db, bookId).setBudget(selectedCategory.id, limit, currentMonth, rolloverEnabled);
      await new RolloverEngine(db, books).process();
      hapticSuccess();
      setShowForm(false);
      await loadData();
    } catch (e) { console.error(e); }
  };

  const progressColor = overall.pct > 90 ? theme.colors.danger : overall.pct > 70 ? theme.colors.warning : theme.colors.primary;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.header}>
        <Ionicons name="calendar" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.monthText}>{dayjs(currentMonth + '-01').format('MMMM YYYY')}</Text>
      </View>

      {/* Overall Summary Card */}
      <View style={styles.overallCardWrapper}>
        <LinearGradient
          colors={[theme.colors.primary + '12', theme.colors.primary + '04']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overallCard}
        >
          <View style={styles.overallRow}>
            <View style={styles.overallItem}>
              <Text style={styles.overallLabel}>Total Anggaran</Text>
              <Text style={styles.overallValue}>{formatRp(overall.totalLimit)}</Text>
            </View>
            <View style={styles.overallDivider} />
            <View style={styles.overallItem}>
              <Text style={styles.overallLabel}>Terpakai</Text>
              <Text style={[styles.overallValue, { color: theme.colors.expense }]}>{formatRp(overall.totalSpent)}</Text>
            </View>
            <View style={styles.overallDivider} />
            <View style={styles.overallItem}>
              <Text style={styles.overallLabel}>Sisa</Text>
              <Text style={[styles.overallValue, { color: theme.colors.income }]}>{formatRp(overall.totalLimit - overall.totalSpent)}</Text>
            </View>
          </View>
          <View style={styles.overallProgressBg}>
            <LinearGradient
              colors={overall.pct > 90 ? theme.colors.expenseGradient : overall.pct > 70 ? ['#FBBF24', '#F59E0B'] : theme.colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.overallProgress, { width: `${Math.min(overall.pct, 100)}%` as any }]}
            />
          </View>
          <View style={styles.overallPctRow}>
            <Text style={styles.overallPctText}>{overall.pct.toFixed(0)}% terpakai</Text>
            <Text style={styles.overallPctText}>{(100 - overall.pct).toFixed(0)}% tersisa</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Category Budgets */}
      <View style={styles.list}>
        {overall.items.map((item, idx) => {
          const { category, budget, rollover } = item;
          const effectiveLimit = budget.monthly_limit + (budget.rollover_amount || 0);
          const pct = effectiveLimit > 0 ? (budget.spent / effectiveLimit) * 100 : 0;
          let barColor = theme.colors.success;
          if (pct > 90) barColor = theme.colors.danger;
          else if (pct > 70) barColor = theme.colors.warning;
          const capped = Math.min(pct, 100);

          return (
            <Animated.View
              key={category.id}
              entering={shouldReduceMotion() ? undefined : FadeInDown.duration(250).delay(staggerDelay(idx))}
            >
            <TouchableOpacity 
              style={styles.budgetItem}
              activeOpacity={0.7}
              onPress={() => { setSelectedCategory(category); setCurrentLimit(budget.monthly_limit); setCurrentRollover(!!budget.rollover_enabled); setShowForm(true); }}
            >
              <View style={styles.budgetHeader}>
                <View style={styles.categoryInfo}>
                  <LinearGradient
                    colors={[category.color + '25', category.color + '08']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconContainer}
                  >
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                  </LinearGradient>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <View style={styles.budgetAmountInfo}>
                  <Text style={styles.spentAmount}>{formatRp(budget.spent)}</Text>
                  <Text style={styles.limitAmount}>
                    / {effectiveLimit > 0 ? formatRp(effectiveLimit) : 'Belum diatur'}
                  </Text>
                </View>
              </View>
              {effectiveLimit > 0 && (
                <>
                  <View style={styles.progressBarContainer}>
                    <LinearGradient
                      colors={pct > 90 ? theme.colors.expenseGradient : pct > 70 ? ['#FBBF24', '#F59E0B'] : [theme.colors.success, '#22C55E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBar, { width: `${capped}%` as any }]}
                    />
                  </View>
                  <View style={styles.budgetFooter}>
                    {rollover > 0 && (
                      <View style={styles.rolloverChip}>
                        <Ionicons name="arrow-down-circle-outline" size={12} color={theme.colors.income} />
                        <Text style={styles.rolloverText}> +{formatRp(rollover)} sisa bulan lalu</Text>
                      </View>
                    )}
                    <Text style={[styles.pctText, { color: barColor }]}>{pct.toFixed(0)}%</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            {selectedCategory && (
              <BudgetForm
                category={selectedCategory}
                initialLimit={currentLimit}
                initialRolloverEnabled={currentRollover}
                onSubmit={handleSaveBudget}
                onCancel={() => setShowForm(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle,
  },
  monthText: { ...theme.typography.h3, color: theme.colors.primary, fontSize: 18 },
  overallCardWrapper: { padding: theme.spacing.lg },
  overallCard: {
    borderRadius: theme.radius.xl, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  overallItem: { alignItems: 'center', flex: 1 },
  overallDivider: { width: 1, backgroundColor: theme.colors.border },
  overallLabel: { ...theme.typography.caption, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  overallValue: { ...theme.typography.body, fontWeight: '800', fontFamily: theme.typography.amount.fontFamily, fontSize: 15, marginTop: 4 },
  overallProgressBg: {
    height: 10, backgroundColor: theme.colors.surface, borderRadius: 5, overflow: 'hidden',
  },
  overallProgress: { height: '100%', borderRadius: 5 },
  overallPctRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  overallPctText: { ...theme.typography.caption, fontWeight: '600' },
  list: { padding: theme.spacing.lg, paddingTop: 0 },
  budgetItem: {
    backgroundColor: theme.colors.surfaceCard, borderRadius: theme.radius.xl,
    padding: theme.spacing.lg, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: theme.radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  categoryName: { ...theme.typography.body, fontWeight: '700', fontSize: 15 },
  budgetAmountInfo: { alignItems: 'flex-end' },
  spentAmount: { ...theme.typography.body, fontWeight: '800', fontFamily: theme.typography.amount.fontFamily, fontSize: 15 },
  limitAmount: { ...theme.typography.caption },
  progressBarContainer: { height: 8, backgroundColor: theme.colors.surface, borderRadius: 4, overflow: 'hidden', marginTop: theme.spacing.sm },
  progressBar: { height: '100%', borderRadius: 4 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.xs },
  rolloverChip: { flexDirection: 'row', alignItems: 'center' },
  rolloverText: { ...theme.typography.caption, color: theme.colors.income },
  pctText: { ...theme.typography.caption, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.md },
  modalContent: { backgroundColor: theme.colors.surfaceCard, borderRadius: theme.radius.xl, padding: theme.spacing.sm },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.textMuted, alignSelf: 'center', marginVertical: theme.spacing.sm },
});
