import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import type { Book } from '@/types';

const ICON_CHOICES = ['book-outline', 'briefcase-outline', 'wallet-outline', 'home-outline', 'cart-outline', 'cash-outline', 'pie-chart-outline', 'star-outline'];
const COLOR_CHOICES = ['#6366F1', '#10B981', '#F97316', '#EC4899', '#38BDF8', '#8B5CF6', '#F59E0B', '#14B8A6'];

export default function BooksScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { books, activeBook, setActiveBook, createBook, updateBook, deleteBook } = useBook();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(COLOR_CHOICES[0]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setIcon(ICON_CHOICES[0]);
    setColor(COLOR_CHOICES[0]);
    setShowForm(true);
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setName(book.name);
    setIcon(book.icon || ICON_CHOICES[0]);
    setColor(book.color || COLOR_CHOICES[0]);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await updateBook(editing.id, { name: trimmed, icon, color });
        Alert.alert('Berhasil', 'Pembukuan diperbarui');
      } else {
        await createBook(trimmed, icon, color);
        Alert.alert('Berhasil', `Pembukuan "${trimmed}" dibuat`);
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal menyimpan pembukuan');
    }
  };

  const confirmDelete = (id: number, bookName: string) => {
    if (books.length <= 1) {
      Alert.alert('Tidak bisa dihapus', 'Minimal harus ada satu pembukuan.');
      return;
    }
    Alert.alert(
      'Hapus Pembukuan',
      `Semua data di "${bookName}" (transaksi, dompet, kategori, dll) akan dihapus permanen. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBook(id);
              Alert.alert('Berhasil', 'Pembukuan dihapus');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Gagal menghapus pembukuan');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manajemen Pembukuan</Text>
          <TouchableOpacity onPress={openCreate}>
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Data di tiap pembukuan terpisah. Ketuk untuk berpindah pembukuan aktif.</Text>

        {books.map(book => {
          const isActive = activeBook?.id === book.id;
          return (
            <TouchableOpacity
              key={book.id}
              style={[styles.item, isActive && { borderColor: book.color || theme.colors.primary, borderWidth: 2 }]}
              activeOpacity={0.7}
              onPress={() => setActiveBook(book.id)}
              onLongPress={() => {
                Alert.alert(book.name, '', [
                  { text: 'Batal', style: 'cancel' },
                  { text: 'Ganti Nama', onPress: () => openEdit(book) },
                  { text: 'Hapus', style: 'destructive', onPress: () => confirmDelete(book.id, book.name) },
                ]);
              }}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.icon, { backgroundColor: (book.color || theme.colors.primary) + '20' }]}>
                  <Ionicons name={(book.icon || 'book-outline') as any} size={20} color={book.color || theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.itemName}>{book.name}</Text>
                  <Text style={styles.itemSub}>{isActive ? 'Aktif' : 'Ketuk untuk aktif'}</Text>
                </View>
              </View>
              {isActive && <Ionicons name="checkmark-circle" size={22} color={book.color || theme.colors.primary} />}
              {!isActive && <Ionicons name="ellipse-outline" size={22} color={theme.colors.border} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing ? 'Ganti Nama Pembukuan' : 'Pembukuan Baru'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nama pembukuan (mis. Pribadi, Usaha)"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
          />
          <Text style={styles.fieldLabel}>Ikon</Text>
          <View style={styles.optionRow}>
            {ICON_CHOICES.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, icon === ic && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' }]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons name={ic as any} size={20} color={icon === ic ? theme.colors.primary : theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Warna</Text>
          <View style={styles.optionRow}>
            {COLOR_CHOICES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setShowForm(false)}>
              <Text style={styles.btnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSave, !name.trim() && { opacity: 0.4 }]}
              disabled={!name.trim()}
              onPress={handleSubmit}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>{editing ? 'Simpan' : 'Buat'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>
            Data pembukuan baru dimulai kosong (dompet & kategori terpisah).
          </Text>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.h2 },
  hint: { ...theme.typography.caption, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, color: theme.colors.textSecondary },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0,
    padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  itemName: { ...theme.typography.body, fontWeight: '500', marginBottom: 2 },
  itemSub: { ...theme.typography.caption },
  modal: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 40, paddingHorizontal: theme.spacing.md },
  modalTitle: { ...theme.typography.h2, marginBottom: theme.spacing.lg },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  iconOption: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border,
  },
  colorOption: { width: 36, height: 36, borderRadius: theme.radius.round, justifyContent: 'center', alignItems: 'center' },
  colorSelected: { borderWidth: 3, borderColor: theme.colors.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  btn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, alignItems: 'center' },
  btnCancel: { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  btnSave: { backgroundColor: theme.colors.primary },
  btnText: { ...theme.typography.body, fontWeight: '600', color: theme.colors.textPrimary },
  note: { ...theme.typography.caption, marginTop: theme.spacing.md, color: theme.colors.textSecondary, textAlign: 'center' },
});