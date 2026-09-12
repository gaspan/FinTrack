import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeIn } from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { markUnlocked } from '@/lib/unlockGate';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    icon: 'wallet-outline',
    title: 'Kelola Keuangan',
    desc: 'Catat pemasukan dan pengeluaran harian Anda dengan mudah dan cepat.',
    gradient: ['#7B61FF', '#A78BFA'] as const,
  },
  {
    icon: 'pie-chart-outline',
    title: 'Analisis Visual',
    desc: 'Lihat tren keuangan melalui grafik interaktif yang cantik dan informatif.',
    gradient: ['#6366F1', '#818CF8'] as const,
  },
  {
    icon: 'shield-checkmark-outline',
    title: '100% Offline & Privat',
    desc: 'Semua data disimpan di perangkat Anda. Tidak ada yang dikirim ke server.',
    gradient: ['#D4A574', '#E8C99B'] as const,
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
              colors={[item.gradient[0] + '20', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.slideBg}
            />
            <View style={styles.iconArea}>
              <View style={styles.iconOuterRing}>
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <Ionicons name={item.icon as any} size={56} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
        keyExtractor={(_, i) => String(i)}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
            <Text style={styles.skipText}>Lewati</Text>
          </TouchableOpacity>
          <Button
            title={currentIndex === slides.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  slideBg: {
    ...StyleSheet.absoluteFill,
  },
  iconArea: {
    marginBottom: theme.spacing.xxl,
  },
  iconOuterRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...theme.typography.h1, marginBottom: theme.spacing.md, textAlign: 'center' },
  desc: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 300 },
  footer: { padding: theme.spacing.lg, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: theme.spacing.xl, gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 28,
  },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { paddingVertical: 8, paddingHorizontal: theme.spacing.md },
  skipText: { ...theme.typography.body, color: theme.colors.textSecondary },
});
