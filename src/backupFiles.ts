import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportBackup } from './db';
import { MAX_BACKUP_BYTES, parseBackup } from './backup';

export async function shareBackup() {
  if (!(await Sharing.isAvailableAsync()))
    throw Error('File sharing is unavailable on this device');
  const contents = JSON.stringify(exportBackup());
  const file = new File(
    Paths.cache,
    `cuebracket-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  try {
    file.create();
    file.write(contents);
    if (file.size > MAX_BACKUP_BYTES) throw Error('This backup exceeds the supported 10 MB limit');
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save CueBracket backup',
    });
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  // Recipients may read after the share sheet closes. Keep this temporary cache copy.
  // Android can reclaim it; a lasting backup must be saved outside the app.
}

export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if (!file.exists || file.size > MAX_BACKUP_BYTES || (asset.size ?? 0) > MAX_BACKUP_BYTES)
      throw Error('Choose a CueBracket JSON backup no larger than 10 MB');
    return { name: asset.name, backup: parseBackup(await file.text()) };
  } finally {
    // Only the picker-created cache copy is ours to remove; never delete the selected original.
    if (file.uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`) && file.exists) file.delete();
  }
}
