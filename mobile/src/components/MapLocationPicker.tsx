import { MapSurface } from './MapSurface';
import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './ui/Button';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  address?: string;
  onSelectLocation?: (lat: number, lng: number) => void;
  onUseCurrentLocation?: () => void;
  interactive?: boolean;
  height?: number;
  showCard?: boolean;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  latitude,
  longitude,
  address,
  onSelectLocation,
  onUseCurrentLocation,
  interactive = true,
  height = 240,
  showCard = true,
}) => {
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [coordinateError, setCoordinateError] = useState('');

  const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  useEffect(() => {
    if (valid) {
      setManualLat(latitude.toString());
      setManualLng(longitude.toString());
    }
  }, [latitude, longitude, valid]);

  return <View style={styles.outerContainer}>
    <View style={[styles.mapContainer, { height }]}>
      {valid ? (
        <MapSurface latitude={latitude} longitude={longitude} interactive={interactive} onSelectLocation={onSelectLocation} />
      ) : (
        <View style={styles.fallbackContainer}>
          <Ionicons name="map-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.fallbackTitle}>Choose the incident location</Text>
        </View>
      )}
    </View>
    {showCard && <View style={styles.locationCard}>
      <Ionicons name="location" size={20} color={COLORS.primary} />
      <View style={styles.addressInfo}><Text style={styles.locationHeader}>Incident location</Text><Text style={styles.addressText}>{address || 'Address unavailable'}</Text>{valid && <Text style={styles.coordsText}>Lat: {latitude.toFixed(4)} Long: {longitude.toFixed(4)}</Text>}</View>
    </View>}
    {interactive && onSelectLocation && <View style={{ marginTop: 16 }}>
      <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary, marginBottom: 12 }]}>Enter exact coordinates, or use your current location.</Text>
      <Input label="Incident latitude" value={manualLat} onChangeText={setManualLat} keyboardType="numbers-and-punctuation" placeholder="-90 to 90" />
      <Input label="Incident longitude" value={manualLng} onChangeText={setManualLng} keyboardType="numbers-and-punctuation" placeholder="-180 to 180" />
      {!!coordinateError && <Text accessibilityRole="alert" style={{ color: COLORS.error, marginBottom: 12 }}>{coordinateError}</Text>}
      <Button title="Set incident location" variant="outline" onPress={() => {
        const newLat = Number(manualLat), newLng = Number(manualLng);
        if (!manualLat.trim() || !manualLng.trim() || !Number.isFinite(newLat) || !Number.isFinite(newLng) || Math.abs(newLat) > 90 || Math.abs(newLng) > 180) { setCoordinateError('Enter a valid latitude and longitude.'); return; }
        setCoordinateError(''); onSelectLocation(newLat, newLng);
      }} />
    </View>}
    {onUseCurrentLocation && <TouchableOpacity style={styles.useCurrentBtn} onPress={onUseCurrentLocation} accessibilityRole="button" accessibilityLabel="Use Current Location"><Ionicons name="locate-outline" size={18} color={COLORS.primary} /><Text style={styles.useCurrentText}>Use Current Location</Text></TouchableOpacity>}
  </View>;
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    marginBottom: 14,
  },
  mapContainer: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F3ECE8',
    position: 'relative',
    ...SHADOWS.card,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  radarCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
    ...SHADOWS.card,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  locationHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  useCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    marginTop: 10,
    ...SHADOWS.card,
  },
  useCurrentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  redYellowPinMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOuterYellowRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFC107', // Golden Yellow outline
    borderWidth: 2,
    borderColor: '#FFA000',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }
    }),
  },
  pinInnerRedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary, // Crimson Red
    alignItems: 'center',
    justifyContent: 'center',
  },
});
