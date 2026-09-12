import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInDown } from 'react-native-reanimated';
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
  /** Hasil scan struk: hanya mengisi field yang masih kosong (amount 0, notes '', tanggal hari ini). */
  scannedPatch?: {
    amount: number | null;
    transactionDate: string | null;
    notes: string | null;
    attachmentUri?: string | null;
    patchId: number;
  } | null;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialType = 'expense',
  initialData,
  categories,
  wallets,
  onSubmit,
  loading = false,
  scannedPatch = null,
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
  const [walletSearchQuery, setWalletSearchQuery] = useState('');

  // Animated sliding indicator for type switcher
  const switcherIndicatorX = useSharedValue(type === 'income' ? 0 : 1);
  const switcherIndicatorStyle = useAnimatedStyle(() => ({
    left: `${switcherIndicatorX.value * 50}%` as any,
  }));

  const filteredWallets = useMemo(() => {
    if (!walletSearchQuery.trim()) return wallets;
    return wallets.filter(w => w.name.toLowerCase().includes(walletSearchQuery.toLowerCase()));
  }, [wallets, walletSearchQuery]);

  // Terapkan hasil scan struk tanpa menimpa input user (fill-empty-only).
  // Sengaja via effect: patch datang async dari parent setelah user mungkin
  // sudah mengetik, jadi tidak bisa diinisialisasi sekali di useState.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!scannedPatch) return;
    if (scannedPatch.amount !== null && scannedPatch.amount > 0) {
      setAmount((prev) => (prev > 0 ? prev : scannedPatch.amount as number));
    }
    if (scannedPatch.transactionDate) {
      const scanned = dayjs(scannedPatch.transactionDate);
      if (scanned.isValid()) {
        setDate((prev) => (prev.isSame(dayjs(), 'day') ? scanned : prev));
      }
    }
    if (scannedPatch.notes) {
      setNotes((prev) => (prev.trim() ? prev : (scannedPatch.notes as string)));
    }
    if (scannedPatch.attachmentUri) {
      const uri = scannedPatch.attachmentUri;
      setAttachmentUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
    }
  }, [scannedPatch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter categories based on selected type
  const filteredCategories = categories.filter(c => c.type === type);

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === type) return;
    hapticLight();
    setType(newType);
    switcherIndicatorX.value = withSpring(newType === 'income' ? 0 : 1, { damping: 18, stiffness: 200 });
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
      {/* Type Switcher — Animated sliding indicator */}
      <View style={styles.typeSwitcher}>
        <Animated.View style={[styles.typeIndicator, switcherIndicatorStyle]}>
          <LinearGradient
            colors={type === 'income' ? theme.colors.incomeGradient : theme.colors.expenseGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeIndicatorGradient}
          />
        </Animated.View>
        <TouchableOpacity
          style={styles.typeTab}
          onPress={() => handleTypeChange('income')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-down-circle"
            size={16}
            color={type === 'income' ? theme.colors.textOnPrimary : theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
            Pemasukan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.typeTab}
          onPress={() => handleTypeChange('expense')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up-circle"
            size={16}
            color={type === 'expense' ? theme.colors.textOnPrimary : theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
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
                onPress={() => { setAmount(q); hapticLight(); }}
                activeOpacity={0.7}
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
            <View style={styles.dateIconContainer}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.dateText}>
              {date.isSame(dayjs(), 'day') ? 'Hari ini, ' : ''}{date.format('DD MMMM YYYY')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map((cat, idx) => {
              const isActive = categoryId === cat.id;
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.duration(200).delay(idx * 30)}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.categoryItem,
                      isActive && styles.categoryItemActive,
                    ]}
                    onPress={() => { setCategoryId(cat.id); hapticLight(); }}
                  >
                    <View style={[
                      styles.categoryIconContainer,
                      isActive
                        ? { backgroundColor: cat.color, ...theme.shadow.sm }
                        : { backgroundColor: cat.color + '15' }
                    ]}>
                      <Ionicons 
                        name={cat.icon as any} 
                        size={24} 
                        color={isActive ? theme.colors.textOnPrimary : cat.color} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryLabel,
                      isActive && { color: theme.colors.textPrimary, fontWeight: '700' }
                    ]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Wallet Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dompet</Text>
          
          <View style={styles.walletSearchContainer}>
            <Ionicons name="search" size={16} color={theme.colors.textMuted} style={styles.walletSearchIcon} />
            <TextInput
              style={styles.walletSearchInput}
              placeholder="Cari dompet..."
              placeholderTextColor={theme.colors.textMuted}
              value={walletSearchQuery}
              onChangeText={setWalletSearchQuery}
            />
            {walletSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setWalletSearchQuery('')} style={styles.walletSearchClear}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
            {filteredWallets.length === 0 ? (
              <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic', paddingHorizontal: theme.spacing.md }}>
                Dompet tidak ditemukan
              </Text>
            ) : (
              filteredWallets.map(wallet => {
                const isActive = walletId === wallet.id;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    activeOpacity={0.7}
                    style={[
                      styles.walletChip,
                      isActive && styles.walletChipActive
                    ]}
                    onPress={() => { setWalletId(wallet.id); hapticLight(); }}
                  >
                    {wallet.icon && (
                      <Ionicons 
                        name={wallet.icon as any} 
                        size={16} 
                        color={isActive ? theme.colors.textOnPrimary : wallet.color || theme.colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text style={[
                      styles.walletChipText,
                      isActive && styles.walletChipTextActive
                    ]}>
                      {wallet.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
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
                    <View style={styles.attachmentRemoveBg}>
                      <Ionicons name="close" size={14} color={theme.colors.textOnPrimary} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handlePickImage} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.attachmentBtnText}>Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.attachmentBtnText}>Kamera</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Padding for bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['transparent', theme.colors.surfaceElevated]}
          style={styles.footerGradient}
          pointerEvents="none"
        />
        <View style={styles.footerContent}>
          <Button 
            title={isEditing ? "Simpan Perubahan" : "Simpan Transaksi"} 
            fullWidth 
            disabled={!isFormValid}
            loading={loading}
            onPress={handleSubmit}
          />
        </View>
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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Tanggal</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
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
                  header: { backgroundColor: theme.colors.primary, borderBottomWidth: 0 },
                  month_selector_label: { color: theme.colors.textOnPrimary, fontWeight: '600' },
                  year_selector_label: { color: theme.colors.textOnPrimary, fontWeight: '600' },
                  button_prev_image: { tintColor: theme.colors.textOnPrimary },
                  button_next_image: { tintColor: theme.colors.textOnPrimary },
                  weekdays: { backgroundColor: theme.colors.surfaceElevated },
                  weekday_label: { color: theme.colors.primary, fontWeight: '600' },
                  day: { backgroundColor: theme.colors.surface },
                  day_label: { color: theme.colors.textPrimary },
                  selected: { backgroundColor: theme.colors.primary, borderRadius: 10 },
                  selected_label: { color: theme.colors.textOnPrimary, fontWeight: '700' },
                  today: { borderColor: theme.colors.primary, borderWidth: 2, borderRadius: 10 },
                  today_label: { color: theme.colors.primary, fontWeight: '700' },
                  days: { backgroundColor: theme.colors.surface },
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
    borderRadius: theme.radius.lg,
    padding: 4,
    position: 'relative',
  },
  typeIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    zIndex: 0,
  },
  typeIndicatorGradient: {
    flex: 1,
    borderRadius: theme.radius.md,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  typeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  typeTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  amountContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  quickAmountRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm,
    marginTop: theme.spacing.md, justifyContent: 'center',
  },
  quickChip: {
    paddingVertical: 8, paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.round, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  quickChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadow.glow,
  },
  quickChipText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, fontWeight: '600' },
  quickChipTextActive: { color: theme.colors.textOnPrimary },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  dateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  categoryItem: {
    width: 88,
    alignItems: 'center',
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  categoryItemActive: {
    // Handled inline with glow
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  categoryLabel: {
    ...theme.typography.caption,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  walletSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    height: 44,
  },
  walletSearchIcon: {
    marginRight: theme.spacing.sm,
  },
  walletSearchInput: {
    flex: 1,
    ...theme.typography.body,
    paddingVertical: 0,
    color: theme.colors.textPrimary,
  },
  walletSearchClear: {
    padding: theme.spacing.xs,
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
    ...theme.shadow.glow,
  },
  walletChipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  walletChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: '700',
  },
  footer: {
    position: 'relative',
  },
  footerGradient: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    height: 24,
  },
  footerContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceCard,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
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
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    marginHorizontal: -theme.spacing.sm,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  attachmentRemoveBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flex: 1,
    justifyContent: 'center',
  },
  attachmentBtnText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
