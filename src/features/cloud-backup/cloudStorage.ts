import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const GDRIVE_URI_KEY = 'gdrive_backup_uri';

export async function saveToCloudStorage(fileUri: string): Promise<void> {
  if (Platform.OS === 'android') {
    await saveToGoogleDrive(fileUri);
  }
}

export async function saveToGoogleDrive(fileUri: string): Promise<void> {
  const SAF = FileSystem.StorageAccessFramework;
  if (!SAF) return;

  let directoryUri = await AsyncStorage.getItem(GDRIVE_URI_KEY);
  if (!directoryUri) {
    const permissions = await SAF.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return;
    directoryUri = permissions.directoryUri;
    await AsyncStorage.setItem(GDRIVE_URI_KEY, directoryUri);
  }

  const fileName = fileUri.split('/').pop() || `FinTrack_Backup_${Date.now()}.json`;
  const content = await FileSystem.readAsStringAsync(fileUri);
  const destUri = await SAF.createFileAsync(directoryUri, fileName, 'application/json');
  await SAF.writeAsStringAsync(destUri, content);
}
