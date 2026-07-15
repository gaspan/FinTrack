import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { BudgetQueries, CategoryQueries } from '@/lib/queries';
import { Category } from '@/types';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { formatRupiah } from '@/utils/format';

export default function BudgetScreen() {
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
      const budgetQueries = new BudgetQueries(db);
      const catQueries = new CategoryQueries(db);
      
      const [budgetData, catData] = await Promise.all([
        budgetQueries.getByMonth(currentMonth),
        catQueries.getByType('expense')
      ]);
      
      setBudgets(budgetData);
      setCategories(catData);
    } catch (e) {
      console.error(e);
    }
  }, [db, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatRp = formatRupiah;

  const handleSaveBudget = async (limit: number) => {
    if (!selectedCategory) return;
    
    try {
      const budgetQueries = new BudgetQueries(db);
      await budgetQueries.setBudget(selectedCategory.id, limit, currentMonth);
      setShowForm(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Combine categories with their budgets
  const combinedData = categories.map(cat => {
    const b = budgets.find(b => b.category_id === cat.id);
    return {
      category: cat,
      budget: b || { monthly_limit: 0, spent: 0 }
    };
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.monthText}>{dayjs(currentMonth + '-01').format('MMMM YYYY')}</Text>
      </View>

      <View style={styles.list}>
        {combinedData.map((item) => {
          const { category, budget } = item;
          const percentage = budget.monthly_limit > 0 ? (budget.spent / budget.monthly_limit) * 100 : 0;
          
          let progressColor = theme.colors.success;
          if (percentage > 90) progressColor = theme.colors.danger;
          else if (percentage > 70) progressColor = theme.colors.warning;
          
          const cappedPercentage = Math.min(percentage, 100);

          return (
            <TouchableOpacity 
              key={category.id} 
              style={styles.budgetItem}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedCategory(category);
                setCurrentLimit(budget.monthly_limit);
                setShowForm(true);
              }}
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
                  <View style={[styles.progressBar, { width: `${cappedPercentage}%`, backgroundColor: progressColor }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={showForm}
        transparent
        animationType="fade"
      >
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  monthText: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  list: {
    padding: theme.spacing.md,
  },
  budgetItem: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  categoryName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  budgetAmountInfo: {
    alignItems: 'flex-end',
  },
  spentAmount: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  limitAmount: {
    ...theme.typography.caption,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm, // Form has its own padding
  }
});
