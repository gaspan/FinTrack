import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { CategoryQueries } from '@/lib/queries';
import { Category, TransactionType } from '@/types';
import { CategoryForm } from '@/components/forms/CategoryForm';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    try { setCategories(await new CategoryQueries(db).getAll()); } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async (data: { name: string; type: TransactionType; icon: string; color: string }) => {
    try {
      if (editingCategory) {
        await new CategoryQueries(db).update(editingCategory.id, data);
      } else {
        await new CategoryQueries(db).create(data);
      }
      setShowForm(false);
      setEditingCategory(null);
      loadData();
    } catch (e) { console.error(e); Alert.alert('Error', 'Gagal menyimpan kategori'); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manajemen Kategori</Text>
        <TouchableOpacity onPress={() => { setEditingCategory(null); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={styles.item}
          activeOpacity={0.7}
          onLongPress={() => {
            Alert.alert(cat.name, '', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Edit', onPress: () => { setEditingCategory(cat); setShowForm(true); }},
              { text: 'Hapus', style: 'destructive', onPress: async () => { await new CategoryQueries(db).delete(cat.id); loadData(); }},
            ]);
          }}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.icon, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon as any} size={20} color={cat.color} />
            </View>
            <View>
              <Text style={styles.itemName}>{cat.name}</Text>
              <Text style={styles.itemType}>{cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowForm(false); setEditingCategory(null); }}>
        <View style={styles.modal}>
          <CategoryForm
            initialData={editingCategory ? { name: editingCategory.name, type: editingCategory.type, icon: editingCategory.icon, color: editingCategory.color } : undefined}
            onCancel={() => { setShowForm(false); setEditingCategory(null); }}
            onSubmit={handleSave}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.h2 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0,
    padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  itemName: { ...theme.typography.body, fontWeight: '500', marginBottom: 2 },
  itemType: { ...theme.typography.caption },
  modal: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 40 },
});
