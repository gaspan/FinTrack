import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingTop: 80 },
  title: { color: '#EF4444', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  message: { color: '#fff', fontSize: 15, marginBottom: 16 },
  stack: { color: '#94A3B8', fontSize: 11, fontFamily: 'Courier' },
});
