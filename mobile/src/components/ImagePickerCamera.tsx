import { selectImage } from '../services/imageSelection';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { CIVIC_PHOTOS } from './CivicVisuals';

interface ImagePickerCameraProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onRetakeImage?: () => void;
}

export const ImagePickerCamera: React.FC<ImagePickerCameraProps> = ({
  imageUri,
  onImageSelected,
  onRetakeImage,
}) => {
  const [error, setError] = useState('');
  const choose = async (source: 'camera' | 'library') => {
    try {
      const asset = await selectImage(source);
      if (!asset) return;
      if ((asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) || (asset.fileSize || 0) > 10 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP image, 10 MB or smaller.');
      setError(''); onImageSelected(asset.uri);
    } catch (e: any) { setError(e.message || 'The image could not be selected. Please try again.'); }
  };
  const handleTakePhoto = () => choose('camera');
  const handlePickGallery = () => choose('library');

  if (imageUri) {
    return (
      <View style={styles.retakeRow}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => onRetakeImage?.()}
          accessibilityRole="button"
          accessibilityLabel="Change or retake photo"
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.retakeBtnText}>Change / Retake Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && <Text accessibilityRole="alert" style={{ color: COLORS.error, marginBottom: 12 }}>{error}</Text>}

      <View
        style={[styles.captureCard, { borderStyle: Platform.OS === 'web' ? 'dashed' : 'solid' }]}
      >
        <View style={styles.iconBox}>
          <Ionicons name="camera" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.captureTitle}>Upload an Issue Image</Text>
        <Text style={styles.captureSub}>Capture a photo or choose an image from your device</Text>
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', maxWidth: 350, marginVertical: 16 }}>
          {[CIVIC_PHOTOS.pothole, CIVIC_PHOTOS.waste, CIVIC_PHOTOS.water].map((photo, index) => <Image key={index} source={photo} accessible={false} style={{ flex: 1, height: 72, borderRadius: 8 }} resizeMode="cover" />)}
        </View>
        <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 14 }}>Reference photos · upload your own evidence below</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleTakePhoto}
            accessibilityLabel="Capture Photo"
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Capture Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={handlePickGallery}
            accessibilityLabel="Upload Image"
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="images-outline" size={16} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextSecondary}>Upload Image</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  captureCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  captureTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  captureSub: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primarySurface,
  },
  actionBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
    fontSize: 13,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  actionBtnTextSecondary: {
    ...TYPOGRAPHY.button,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  retakeRow: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
