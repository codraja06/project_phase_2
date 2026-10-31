import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function sharePowerBiCsv(csv: string) {
  const name = `civictrack-powerbi-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    try { const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device. Use the web dashboard to download the CSV.');
  const uri = `${FileSystem.cacheDirectory}${name}`;
  try {
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Share Power BI data', UTI: 'public.comma-separated-values-text' });
  } finally { await FileSystem.deleteAsync(uri, { idempotent: true }); }
}
