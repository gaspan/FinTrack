import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useTheme, type Theme } from '@/constants/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { hapticLight } from '@/utils/haptic';
import { getEconNews, type NewsItem, type NewsKind } from '@/features/news/econNews';

const timeAgo = (at: number): string => {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
};

const NewsPage: React.FC<{ item: NewsItem; width: number }> = ({ item, width }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[styles.page, { width }]}
      activeOpacity={0.75}
      onPress={() => {
        hapticLight();
        WebBrowser.openBrowserAsync(item.link).catch(() => {});
      }}
      accessibilityRole="link"
      accessibilityLabel={`${item.title}, ${item.source}`}
    >
      <View style={styles.sourceRow}>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText} numberOfLines={1}>{item.source}</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(item.publishedAt)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={4}>{item.title}</Text>
      <View style={styles.readRow}>
        <Text style={styles.readText}>Baca selengkapnya</Text>
        <Ionicons name="open-outline" size={13} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

export const EconNewsCarousel: React.FC<{ kind?: NewsKind }> = ({ kind = 'national' }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenW } = useWindowDimensions();
  const pageW = Math.max(200, screenW - theme.spacing.md * 4);
  const gap = theme.spacing.sm;

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList<NewsItem>>(null);

  useEffect(() => {
    let cancelled = false;
    getEconNews(kind)
      .then((news) => {
        if (!cancelled) {
          setItems(news);
          setActive(0);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, retry]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / (pageW + gap)));
  };

  if (loading) {
    return (
      <View>
        <Skeleton height={150} style={{ borderRadius: theme.radius.md }} />
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </View>
    );
  }

  if (failed || items.length === 0) {
    return (
      <View style={styles.errorWrap}>
        <Ionicons name="newspaper-outline" size={30} color={theme.colors.textMuted} />
        <Text style={styles.errorTitle}>Berita tak tersedia</Text>
        <Text style={styles.errorText}>Periksa koneksi internet lalu coba lagi.</Text>
        <Button
          title="Coba lagi"
          onPress={() => {
            setLoading(true);
            setFailed(false);
            setRetry((n) => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        snapToInterval={pageW + gap}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap }}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => <NewsPage item={item} width={pageW} />}
      />
      <View style={styles.dots}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.id}
            style={styles.dotHit}
            activeOpacity={0.7}
            onPress={() => {
              setActive(i);
              listRef.current?.scrollToOffset({ offset: i * (pageW + gap), animated: true });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Berita ${i + 1}`}
          >
            <View style={[styles.dot, i === active && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.source}>Sumber: Google Berita (agregator media nasional)</Text>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  page: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 150,
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sourceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.round,
    backgroundColor: `${theme.colors.accent}1F`,
    maxWidth: '60%',
  },
  sourceText: { ...theme.typography.caption, fontWeight: '700', fontSize: 10, color: theme.colors.accent },
  timeText: { ...theme.typography.caption, fontSize: 10 },
  title: { ...theme.typography.body, fontWeight: '600', fontSize: 14, lineHeight: 20, color: theme.colors.textPrimary },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readText: { ...theme.typography.bodySmall, fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.sm, gap: 2 },
  dotHit: { padding: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.track },
  dotActive: { width: 18, backgroundColor: theme.colors.primary },
  errorWrap: { alignItems: 'center', gap: 6, paddingVertical: theme.spacing.lg },
  errorTitle: { ...theme.typography.body, fontWeight: '700', color: theme.colors.textPrimary },
  errorText: { ...theme.typography.bodySmall, marginBottom: theme.spacing.sm },
  source: { ...theme.typography.caption, fontSize: 9, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
