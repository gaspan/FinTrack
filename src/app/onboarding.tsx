import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type Theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { markUnlocked } from '@/lib/unlockGate';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'wallet-outline',
    title: 'Kelola Keuangan',
    desc: 'Catat pemasukan dan pengeluaran harian Anda dengan mudah dan cepat.',
    color: '#00D09C',
  },
  {
    icon: 'pie-chart-outline',
    title: 'Analisis Visual',
    desc: 'Lihat tren keuangan melalui grafik interaktif yang cantik dan informatif.',
    color: '#6366F1',
  },
  {
    icon: 'shield-checkmark-outline',
    title: '100% Offline & Privat',
    desc: 'Semua data disimpan di perangkat Anda. Tidak ada yang dikirim ke server.',
    color: '#38BDF8',
  },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onDone = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    markUnlocked();
    router.replace('/(tabs)' as any);
  };

  const onNext = () => {
    if (currentIndex === slides.length - 1) {
      onDone();
    } else {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e: any) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={[item.color + '30', 'transparent']}
              style={styles.iconBg}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={64} color={item.color} />
              </View>
            </LinearGradient>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
        keyExtractor={(_, i) => String(i)}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && { backgroundColor: theme.colors.primary, width: 24 }]} />
          ))}
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={onDone}>
            <Text style={styles.skipText}>Lewati</Text>
          </TouchableOpacity>
          <Button title={currentIndex === slides.length - 1 ? 'Mulai' : 'Lanjut'} onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  iconBg: { width: '100%', alignItems: 'center', paddingVertical: 60, borderRadius: theme.radius.xl, marginBottom: theme.spacing.xl },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  title: { ...theme.typography.h1, marginBottom: theme.spacing.md, textAlign: 'center' },
  desc: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  footer: { padding: theme.spacing.lg, paddingBottom: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: theme.spacing.xl, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.textSecondary },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipText: { ...theme.typography.body, color: theme.colors.textSecondary },
});
