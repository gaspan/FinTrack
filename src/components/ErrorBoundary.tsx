import React from 'react';
import { Text, ScrollView, StyleSheet, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    AsyncStorage.setItem('last_boot_step', 'render_crash: ' + error.message).catch(() => {});
  }

  render() {
    if (this.state.error) {
      // Above ThemeProvider, so follow the OS color scheme directly.
      const dark = Appearance.getColorScheme() !== 'light';
      const styles = makeStyles(dark);
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terjadi kesalahan</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const makeStyles = (dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0A0E1A' : '#F8F9FA' },
  content: { padding: 24, paddingTop: 80 },
  title: { color: '#FF4C4C', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  message: { color: dark ? '#FFFFFF' : '#1A1A2E', fontSize: 15, marginBottom: 16 },
  stack: { color: dark ? '#8B95B0' : '#6B7280', fontSize: 11, fontFamily: 'monospace' },
});
