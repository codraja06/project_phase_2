import React, { useState } from 'react';
import { Image, ImageSourcePropType, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Button } from './ui/Button';
import { FONT_FAMILY } from '../theme/typography';

export const CIVIC_PHOTOS = {
  city: require('../../assets/civic/chennai-streets.jpg'),
  bridge: require('../../assets/civic/chennai-bridge.jpg'),
  coast: require('../../assets/civic/marina-coast.jpg'),
  pothole: require('../../assets/civic/pothole.jpg'),
  waste: require('../../assets/civic/waste.jpg'),
  light: require('../../assets/civic/streetlight.jpg'),
  water: require('../../assets/civic/water.jpg'),
};
export type CivicPhotoName = keyof typeof CIVIC_PHOTOS;
export const categoryPhoto = (category: string): ImageSourcePropType => {
  if (/pothole|road/.test(category)) return CIVIC_PHOTOS.pothole;
  if (/garbage|waste/.test(category)) return CIVIC_PHOTOS.waste;
  if (/streetlight/.test(category)) return CIVIC_PHOTOS.light;
  if (/water|drain/.test(category)) return CIVIC_PHOTOS.water;
  return CIVIC_PHOTOS.city;
};

export const BrandBackdrop = ({ photo = 'city', opacity = .62 }: { photo?: CivicPhotoName; opacity?: number }) => <View pointerEvents="none" style={StyleSheet.absoluteFill}>
  <Image source={CIVIC_PHOTOS[photo]} accessible={false} resizeMode="cover" style={StyleSheet.absoluteFill} />
  <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.cinematic, opacity }]} />
  <View style={s.redEdge} /><View style={s.goldEdge} />
  <View style={{ position: 'absolute', right: 24, top: 24, width: 52, height: 52, borderWidth: 1, borderColor: COLORS.gold, opacity: .24, transform: [{ rotate: '45deg' }] }} />
  <View style={{ position: 'absolute', right: 33, top: 33, width: 34, height: 34, borderWidth: 1, borderColor: COLORS.gold, opacity: .24, transform: [{ rotate: '45deg' }] }} />
</View>;

export const CivicHero = ({ eyebrow, title, description, photo = 'city', actionLabel, onAction, compact = false }: {
  eyebrow: string; title: string; description?: string; photo?: CivicPhotoName;
  actionLabel?: string; onAction?: () => void; compact?: boolean;
}) => {
  const { isWide } = useBreakpoint();
  return <View style={[s.hero, { padding: isWide ? compact ? 24 : 36 : 22, minHeight: compact ? 150 : isWide ? 290 : 270 }]}>
    <BrandBackdrop photo={photo} opacity={compact ? .79 : .69} />
    <View style={{ maxWidth: compact ? 760 : 640, gap: compact ? 9 : 14 }}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={[s.heroTitle, { fontSize: compact ? isWide ? 28 : 24 : isWide ? 44 : 31, lineHeight: compact ? isWide ? 35 : 31 : isWide ? 51 : 38 }]}>{title}</Text>
      {!!description && <Text style={s.heroDescription}>{description}</Text>}
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} style={{ alignSelf: 'flex-start', backgroundColor: COLORS.gold, marginTop: 4, minWidth: 170 }} textStyle={{ color: COLORS.cinematic }} icon={<Ionicons name="arrow-forward" size={18} color={COLORS.cinematic} />} />}
    </View>
    {!compact && isWide && <View style={s.cityStamp}><Ionicons name="location-outline" size={15} color={COLORS.gold} /><Text style={s.stampText}>CHENNAI / TAMIL NADU</Text></View>}
  </View>;
};

const credits: { file: string; title: string; author: string; license: string; licenseUrl: string; source: string }[] = require('../../assets/civic/credits.json');
export const PhotoCredits = () => {
  const [expanded, setExpanded] = useState(false);
  return <View style={{ marginVertical: 16, gap: 8 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>Photography & visual identity {expanded ? '−' : '+'}</Text>
    </TouchableOpacity>
    {expanded && <View style={{ gap: 12 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 19 }}>An independent civic application with an original community-focused color theme. Reference photos illustrate civic contexts and are separate from submitted complaint evidence.</Text>
      {credits.map(credit => <View key={credit.file} style={{ gap: 4 }}>
        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(credit.source)}><Text style={{ color: COLORS.primary, fontSize: 12, lineHeight: 18 }}>{credit.title} · {credit.author}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(credit.licenseUrl || 'https://creativecommons.org/publicdomain/zero/1.0/')}><Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{credit.license} · resized, cropped and tinted for display</Text></TouchableOpacity>
      </View>)}
    </View>}
  </View>;
};

const s = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 16, justifyContent: 'center', backgroundColor: COLORS.cinematic, borderWidth: 1, borderColor: COLORS.authorityPrimary },
  redEdge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6, backgroundColor: COLORS.primary },
  goldEdge: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, backgroundColor: COLORS.gold },
  eyebrow: { color: COLORS.gold, fontSize: 10, lineHeight: 16, letterSpacing: 1.7, fontWeight: '800' },
  heroTitle: { color: COLORS.onCinematic, fontFamily: FONT_FAMILY.bold, fontWeight: '800', letterSpacing: -1.1 },
  heroDescription: { color: '#DDE9E4', fontSize: 14, lineHeight: 22, maxWidth: 530 },
  cityStamp: { position: 'absolute', right: 20, bottom: 16, flexDirection: 'row', gap: 5, alignItems: 'center' },
  stampText: { color: COLORS.onCinematic, fontSize: 9, fontWeight: '600', letterSpacing: 1.4 },
});
