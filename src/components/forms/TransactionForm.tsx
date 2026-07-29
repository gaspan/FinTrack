import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, type Theme } from '@/constants/theme';
import { TransactionType, Category, Wallet, Tag, TransactionAttachment } from '@/types';
import { NumericInput } from '../ui/NumericInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { TagInput, TagInputRef } from '../ui/TagInput';
import { hapticLight, hapticSuccess } from '@/utils/haptic';

interface TransactionFormProps {
  initialType?: TransactionType;
  initialData?: {
    type: TransactionType;
    amount: number;
    category_id: number;
    wallet_id: number;
    transaction_date: string;
    notes: string | null;
    tags?: Tag[];
    attachments?: TransactionAttachment[];
  };
  categories: Category[];
  wallets: Wallet[];
  onSubmit: (data: {
    type: TransactionType;
    amount: number;
    category_id: number;
    wallet_id: number;
    transaction_date: string;
    notes: string;
    tags: number[];
    attachmentPaths: string[];
  }) => void;
  loading?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialType = 'expense',
  initialData,
  categories,
  wallets,
  onSubmit,
  loading = false,
}) => {
  const isEditing = !!initialData;
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const defaultStyles = useDefaultStyles('light');
  const [type, setType] = useState<TransactionType>(initialData?.type || initialType);
  const [amount, setAmount] = useState<number>(initialData?.amount || 0);
  const [categoryId, setCategoryId] = useState<number | null>(initialData?.category_id || null);
  const [walletId, setWalletId] = useState<number | null>(initialData?.wallet_id || wallets[0]?.id || null);
  const [date, setDate] = useState(initialData ? dayjs(initialData.transaction_date) : dayjs());
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialData?.tags || []);
  const [attachmentUris, setAttachmentUris] = useState<string[]>(
    initialData?.attachments?.map(a => a.file_path) || []
  );
  const [savingAttachment, setSavingAttachment] = useState(false);
  const tagInputRef = useRef<TagInputRef>(null);

  // Filter categories based on selected type
  const filteredCategories = categories.filter(c => c.type === type);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const newFiltered = categories.filter(c => c.type === newType);
    if (newFiltered.length > 0) {
      setCategoryId(newFiltered[0].id);
    } else {
      setCategoryId(null);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = await Promise.all(
        result.assets.map(async (asset) => {
          const fileName = `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
          const dest = FileSystem.documentDirectory + 'attachments/' + fileName;
          await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'attachments/', { intermediates: true });
          await FileSystem.copyAsync({ from: asset.uri, to: dest });
          return dest;
        })
      );
      setAttachmentUris(prev => [...prev, ...newUris]);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin diperlukan', 'Aplikasi membutuhkan izin kamera untuk mengambil foto');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const fileName = `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const dest = FileSystem.documentDirectory + 'attachments/' + fileName;
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'attachments/', { intermediates: true });
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      setAttachmentUris(prev => [...prev, dest]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachmentUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (amount <= 0 || !categoryId || !walletId) return;
    hapticSuccess();
    const tagIds = await tagInputRef.current?.commitPending() ?? selectedTags.map(t => t.id);
    onSubmit({
      type,
      amount,
      category_id: categoryId,
      wallet_id: walletId,
      transaction_date: date.format('YYYY-MM-DD'),
      notes,
      tags: tagIds,
      attachmentPaths: attachmentUris,
    });
  };

  const isFormValid = amount > 0 && categoryId !== null && walletId !== null;

  return (
    <View style={styles.container}>
      {/* Type Switcher */}
      <View style={styles.typeSwitcher}>
        <TouchableOpacity
          style={[styles.typeTab, type === 'income' && styles.typeTabActiveIncome]}
          onPress={() => handleTypeChange('income')}
          activeOpacity={0.8}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
            Pemasukan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeTab, type === 'expense' && styles.typeTabActiveExpense]}
          onPress={() => handleTypeChange('expense')}
          activeOpacity={0.8}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>
            Pengeluaran
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <NumericInput
            value={amount}
            onChangeValue={setAmount}
            autoFocus
          />
          <View style={styles.quickAmountRow}>
            {[10000, 25000, 50000, 100000, 250000, 500000].map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quickChip, amount === q && styles.quickChipActive]}
                onPress={() => setAmount(q)}
              >
                <Text style={[styles.quickChipText, amount === q && styles.quickChipTextActive]}>
                  {q >= 1000 ? `${(q / 1000).toLocaleString('id')}K` : String(q)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanggal</Text>
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {date.isSame(dayjs(), 'day') ? 'Hari ini, ' : ''}{date.format('DD MMMM YYYY')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                style={[
                  styles.categoryItem,
                  categoryId === cat.id && styles.categoryItemActive,
                  categoryId === cat.id && { borderColor: cat.color }
                ]}
                onPress={() => { setCategoryId(cat.id); hapticLight(); }}
              >
                <View style={[
                  styles.categoryIconContainer,
                  { backgroundColor: categoryId === cat.id ? cat.color : theme.colors.surfaceElevated }
                ]}>
                  <Ionicons 
                    name={cat.icon as any} 
                    size={24} 
                    color={categoryId === cat.id ? '#FFF' : cat.color} 
                  />
                </View>
                <Text style={[
                  styles.categoryLabel,
                  categoryId === cat.id && { color: theme.colors.textPrimary, fontWeight: '600' }
                ]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Wallet Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dompet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
            {wallets.map(wallet => (
              <TouchableOpacity
                key={wallet.id}
                activeOpacity={0.7}
                style={[
                  styles.walletChip,
                  walletId === wallet.id && styles.walletChipActive
                ]}
                onPress={() => setWalletId(wallet.id)}
              >
                {wallet.icon && (
                  <Ionicons 
                    name={wallet.icon as any} 
                    size={16} 
                    color={walletId === wallet.id ? '#FFF' : wallet.color || theme.colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text style={[
                  styles.walletChipText,
                  walletId === wallet.id && styles.walletChipTextActive
                ]}>
                  {wallet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Input
            label="Catatan (Opsional)"
            placeholder="Makan siang, bensin, dll"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            style={{ height: 80, paddingTop: 12 }}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag</Text>
          <TagInput ref={tagInputRef} selectedTags={selectedTags} onTagsChange={setSelectedTags} />
        </View>

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lampiran</Text>
          {attachmentUris.length > 0 && (
            <View style={styles.attachmentPreviewRow}>
              {attachmentUris.map((uri, idx) => (
                <View key={idx} style={styles.attachmentItem}>
                  <Image source={{ uri }} style={styles.attachmentThumb} />
                  <TouchableOpacity
                    style={styles.attachmentRemove}
                    onPress={() => removeAttachment(idx)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handlePickImage}>
              <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.attachmentBtnText}>Pilih dari Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.attachmentBtnText}>Ambil Foto</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Padding for bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button 
          title={isEditing ? "Simpan Perubahan" : "Simpan Transaksi"} 
          fullWidth 
          disabled={!isFormValid}
          loading={loading}
          onPress={handleSubmit}
        />
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Tanggal</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                mode="single"
                date={date.toDate()}
                onChange={(params: any) => {
                  setDate(dayjs(params.date));
                  setShowDatePicker(false);
                }}
                styles={{
                  ...defaultStyles,
                  header: { backgroundColor: '#4A90D9', borderBottomWidth: 0 },
                  month_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                  year_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                  button_prev_image: { tintColor: '#FFFFFF' },
                  button_next_image: { tintColor: '#FFFFFF' },
                  weekdays: { backgroundColor: '#F0F4FF' },
                  weekday_label: { color: '#4A90D9', fontWeight: '600' },
                  day: { backgroundColor: '#FFFFFF' },
                  day_label: { color: '#1A1A2E' },
                  selected: { backgroundColor: '#4A90D9', borderRadius: 8 },
                  selected_label: { color: '#FFFFFF', fontWeight: '700' },
                  today: { borderColor: '#4A90D9', borderWidth: 2, borderRadius: 8 },
                  today_label: { color: '#4A90D9', fontWeight: '700' },
                  days: { backgroundColor: '#F8FAFF' },
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  typeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: 4,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  typeTabActiveIncome: {
    backgroundColor: theme.colors.income,
  },
  typeTabActiveExpense: {
    backgroundColor: theme.colors.expense,
  },
  typeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  typeTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  amountContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  quickAmountRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs,
    marginTop: theme.spacing.sm, justifyContent: 'center',
  },
  quickChip: {
    paddingVertical: 6, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.round, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  quickChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  quickChipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  quickChipTextActive: { color: '#FFF' },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  categoryItemActive: {
    // Add subtle background or border if needed
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryLabel: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  walletScroll: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.round,
    marginRight: theme.spacing.sm,
  },
  walletChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  walletChipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  walletChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  footer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h3,
  },
  pickerContainer: {
    marginHorizontal: -theme.spacing.sm,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flex: 1,
    justifyContent: 'center',
  },
  attachmentBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
