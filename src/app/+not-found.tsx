import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme, type Theme } from '@/constants/theme';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <>
      <Stack.Screen options={{ title: 'Halaman Tidak Ditemukan' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Halaman ini tidak tersedia.</Text>
      </View>
    </>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});