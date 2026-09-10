import { useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseReceiptText, type ParsedReceipt } from '@/utils/receiptParser';

export interface ScannedReceipt extends ParsedReceipt {
  imageUri: string;
}

interface UseReceiptScanResult {
  scanning: boolean;
  error: string | null;
  scanFromCamera: () => Promise<ScannedReceipt | null>;
  scanFromGallery: () => Promise<ScannedReceipt | null>;
  recognizeImage: (uri: string) => Promise<ScannedReceipt>;
  clearError: () => void;
}

function openSettingsAlert(target: 'kamera' | 'galeri') {
  Alert.alert(
    'Izin diperlukan',
    `Aplikasi membutuhkan izin ${target} untuk memindai struk. Buka Pengaturan untuk mengaktifkannya.`,
    [
      { text: 'Batal', style: 'cancel' },
      { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
    ],
  );
}

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    openSettingsAlert('kamera');
    return false;
  }
  const next = await ImagePicker.requestCameraPermissionsAsync();
  if (!next.granted) {
    if (!next.canAskAgain) openSettingsAlert('kamera');
    else Alert.alert('Izin diperlukan', 'Aplikasi membutuhkan izin kamera untuk memindai struk.');
    return false;
  }
  return true;
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    openSettingsAlert('galeri');
    return false;
  }
  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!next.granted) {
    if (!next.canAskAgain) openSettingsAlert('galeri');
    else Alert.alert('Izin diperlukan', 'Aplikasi membutuhkan izin galeri untuk memilih foto struk.');
    return false;
  }
  return true;
}

/**
 * Hook static-image OCR: ambil foto/pilih galeri -> ML Kit on-device -> parse.
 * Bukan live frame processor. Tidak jalan di Expo Go / Web (butuh Dev Client).
 */
export function useReceiptScan(): UseReceiptScanResult {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizeImage = useCallback(async (uri: string): Promise<ScannedReceipt> => {
    if (Platform.OS === 'web') {
      throw new Error('Pindai struk tidak didukung di Web. Gunakan aplikasi Android/iOS.');
    }
    // Modul native ML Kit tidak tersedia di Expo Go — hanya di Development Build.
    if (Constants.appOwnership === 'expo') {
      throw new Error(
        'Pindai struk butuh Development Build (bukan Expo Go). Jalankan eas build --profile development lalu buka aplikasi dari Dev Client.'
      );
    }
    if (!uri) throw new Error('File gambar tidak ditemukan.');

    setScanning(true);
    setError(null);
    try {
      const result = await TextRecognition.recognize(uri);
      const text = result?.text?.trim() ?? '';
      if (!text) {
        throw new Error('Teks struk tidak terbaca. Coba foto lebih terang dan sejajar.');
      }
      const parsed = parseReceiptText(text);
      if (parsed.amount === null && parsed.date === null && parsed.merchantName === null) {
        throw new Error('Teks terbaca tapi nominal/tanggal/merchant tidak ditemukan.');
      }
      return { ...parsed, imageUri: uri };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal memindai struk. Coba lagi.';
      setError(message);
      throw e instanceof Error ? e : new Error(message);
    } finally {
      setScanning(false);
    }
  }, []);

  const scanFromCamera = useCallback(async (): Promise<ScannedReceipt | null> => {
    if (!(await ensureCameraPermission())) return null;
    const picked = await ImagePicker.launchCameraAsync({
      quality: 1.0,
      allowsEditing: false,
      exif: false,
    });
    if (picked.canceled || !picked.assets[0]) return null;
    try {
      return await recognizeImage(picked.assets[0].uri);
    } catch (e) {
      Alert.alert('Pindai gagal', e instanceof Error ? e.message : 'Teks struk tidak terbaca. Coba foto lebih terang dan sejajar.');
      return null;
    }
  }, [recognizeImage]);

  const scanFromGallery = useCallback(async (): Promise<ScannedReceipt | null> => {
    if (!(await ensureMediaLibraryPermission())) return null;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1.0,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets[0]) return null;
    try {
      return await recognizeImage(picked.assets[0].uri);
    } catch (e) {
      Alert.alert('Pindai gagal', e instanceof Error ? e.message : 'Teks struk tidak terbaca. Coba pilih foto yang lebih jelas.');
      return null;
    }
  }, [recognizeImage]);

  const clearError = useCallback(() => setError(null), []);

  return { scanning, error, scanFromCamera, scanFromGallery, recognizeImage, clearError };
}
