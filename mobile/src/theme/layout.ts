import { StyleSheet } from 'react-native';
import { COLORS } from './colors';

export const CONTENT_WIDTH = 1280;
export const PAGE = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: COLORS.background },
  content: { width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', padding: 16, paddingBottom: 32, gap: 24 },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -.4 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  section: { gap: 12, minWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
});
