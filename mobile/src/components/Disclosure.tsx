import React, { useId, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

/** One-level progressive disclosure. Required workflow actions stay outside it. */
export const Disclosure = ({ title, summary, children, defaultExpanded = false, keepMounted = false }: {
  title: string; summary?: string; children: React.ReactNode; defaultExpanded?: boolean; keepMounted?: boolean;
}) => {
  const [open, setOpen] = useState(defaultExpanded);
  const id = useId();
  return <View style={s.section}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}
      {...(Platform.OS === 'web' ? { 'aria-controls': id } : {})}
      onPress={() => setOpen(value => !value)} style={({ pressed }) => [s.toggle, pressed && { backgroundColor: COLORS.backgroundNeutral }]}>
      <View style={s.text}><Text style={s.title}>{title}</Text>{!!summary && <Text style={s.summary}>{summary}</Text>}</View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} accessible={false} />
    </Pressable>
    <View nativeID={id} style={[s.body, !open && { display: 'none' }]} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>{(open || keepMounted) ? children : null}</View>
  </View>;
};
const s = StyleSheet.create({
  section: { minWidth: 0, width: '100%', borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  toggle: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 }, title: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: COLORS.textPrimary },
  summary: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, marginTop: 2 },
  body: { gap: 12, paddingBottom: 16, minWidth: 0 },
});
