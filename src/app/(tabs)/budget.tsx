import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { BudgetQueries, CategoryQueries } from '@/lib/queries';
import { Category } from '@/types';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { formatRupiah } from '@/utils/format';
import { hapticSuccess } from '@/utils/haptic';

export default function BudgetScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth] = useState(dayjs().format('YYYY-MM'));
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [budgetData, catData] = await Promise.all([
        new BudgetQueries(db).getByMonth(currentMonth),
        new CategoryQueries(db).getByType('expense'),
      ]);
      setBudgets(budgetData);
      setCategories(catData);
    } catch (e) { console.error(e); }
  }, [db, currentMonth]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatRp = formatRupiah;

  const overall = useMemo(() => {
    let totalLimit = 0, totalSpent = 0;
    const mapped = categories.map(cat => {
      const b = budgets.find(b => b.category_id === cat.id);
      const limit = b?.monthly_limit || 0;
      const spent = b?.spent || 0;
      totalLimit += limit;
      totalSpent += spent;
      return { category: cat, budget: b || { monthly_limit: 0, spent: 0 }, limit, spent };
    });
    const pct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { items: mapped, totalLimit, totalSpent, pct };
  }, [categories, budgets]);

  const handleSaveBudget = async (limit: number) => {
    if (!selectedCategory) return;
    try {
      await new BudgetQueries(db).setBudget(selectedCategory.id, limit, currentMonth);
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
        <Text style={styles.monthText}>{dayjs(currentMonth + '-01').format('MMMM YYYY')}</Text>
      </View>

      {/* Overall Summary Card */}
      <View style={styles.overallCard}>
        <View style={styles.overallRow}>
          <View style={styles.overallItem}>
            <Text style={styles.overallLabel}>Total Anggaran</Text>
            <Text style={styles.overallValue}>{formatRp(overall.totalLimit)}</Text>
          </View>
          <View style={styles.overallItem}>
            <Text style={styles.overallLabel}>Terpakai</Text>
            <Text style={[styles.overallValue, { color: theme.colors.expense }]}>{formatRp(overall.totalSpent)}</Text>
          </View>
          <View style={styles.overallItem}>
            <Text style={styles.overallLabel}>Sisa</Text>
            <Text style={[styles.overallValue, { color: theme.colors.income }]}>{formatRp(overall.totalLimit - overall.totalSpent)}</Text>
          </View>
        </View>
        <View style={styles.overallProgressBg}>
          <View style={[styles.overallProgress, { width: `${Math.min(overall.pct, 100)}%`, backgroundColor: progressColor }]} />
        </View>
        <Text style={styles.overallPct}>{overall.pct.toFixed(0)}% terpakai</Text>
      </View>

      {/* Category Budgets */}
      <View style={styles.list}>
        {overall.items.map((item) => {
          const { category, budget } = item;
          const pct = budget.monthly_limit > 0 ? (budget.spent / budget.monthly_limit) * 100 : 0;
          let barColor = theme.colors.success;
          if (pct > 90) barColor = theme.colors.danger;
          else if (pct > 70) barColor = theme.colors.warning;
          const capped = Math.min(pct, 100);

          return (
            <TouchableOpacity 
              key={category.id} 
              style={styles.budgetItem}
              activeOpacity={0.7}
              onPress={() => { setSelectedCategory(category); setCurrentLimit(budget.monthly_limit); setShowForm(true); }}
            >
              <View style={styles.budgetHeader}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <View style={styles.budgetAmountInfo}>
                  <Text style={styles.spentAmount}>{formatRp(budget.spent)}</Text>
                  <Text style={styles.limitAmount}>
                    / {budget.monthly_limit > 0 ? formatRp(budget.monthly_limit) : 'Belum diatur'}
                  </Text>
                </View>
              </View>
              {budget.monthly_limit > 0 && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${capped}%`, backgroundColor: barColor }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCategory && (
              <BudgetForm
                category={selectedCategory}
                initialLimit={currentLimit}
                onSubmit={handleSaveBudget}
                onCancel={() => setShowForm(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.md, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  monthText: { ...theme.typography.h3, color: theme.colors.primary },
  overallCard: {
    margin: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  overallItem: { alignItems: 'center', flex: 1 },
  overallLabel: { ...theme.typography.caption, marginBottom: 4 },
  overallValue: { ...theme.typography.body, fontWeight: 'bold' },
  overallProgressBg: {
    height: 8, backgroundColor: theme.colors.surface, borderRadius: 4, overflow: 'hidden',
  },
  overallProgress: { height: '100%', borderRadius: 4 },
  overallPct: { ...theme.typography.caption, textAlign: 'right', marginTop: 4 },
  list: { padding: theme.spacing.md },
  budgetItem: {
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  categoryName: { ...theme.typography.body, fontWeight: '600' },
  budgetAmountInfo: { alignItems: 'flex-end' },
  spentAmount: { ...theme.typography.body, fontWeight: 'bold' },
  limitAmount: { ...theme.typography.caption },
  progressBarContainer: { height: 8, backgroundColor: theme.colors.surface, borderRadius: 4, overflow: 'hidden', marginTop: theme.spacing.xs },
  progressBar: { height: '100%', borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: theme.spacing.md },
  modalContent: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg, padding: theme.spacing.sm },
});
