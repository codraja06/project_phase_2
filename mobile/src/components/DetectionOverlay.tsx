import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetectionResult } from '../types/ai';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface DetectionOverlayProps {
  imageUri: string;
  detections: DetectionResult[];
  confidence?: number;
  height?: number;
  showToggle?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  imageUri,
  detections = [],
  confidence,
  height = 280,
  showToggle = true,
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 640, height: 640 });
  const [showBoxes, setShowBoxes] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!imageUri) return;
    setImageLoaded(false);
    setImageError(false);

    let active = true;
    Image.getSize(imageUri, (width, height) => {
      if (!active) return;
      setNaturalSize({ width, height }); setImageLoaded(true);
    }, () => {
      if (!active) return;
      setImageError(true);
    });
    return () => { active = false; };
  }, [imageUri]);

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const cWidth = containerSize.width;
  const cHeight = containerSize.height;
  const nWidth = naturalSize.width > 0 ? naturalSize.width : 640;
  const nHeight = naturalSize.height > 0 ? naturalSize.height : 640;

  let renderedW = cWidth;
  let renderedH = cHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (cWidth > 0 && cHeight > 0) {
    const containerRatio = cWidth / cHeight;
    const imageRatio = nWidth / nHeight;

    if (imageRatio > containerRatio) {
      renderedW = cWidth;
      renderedH = cWidth / imageRatio;
      offsetX = 0;
      offsetY = (cHeight - renderedH) / 2;
    } else {
      renderedH = cHeight;
      renderedW = cHeight * imageRatio;
      offsetX = (cWidth - renderedW) / 2;
      offsetY = 0;
    }
  }

  const scale = renderedW / nWidth;

  const validDetections = detections.filter(
    (d) =>
      d.bbox &&
      typeof d.bbox.x1 === 'number' &&
      typeof d.bbox.y1 === 'number' &&
      typeof d.bbox.x2 === 'number' &&
      typeof d.bbox.y2 === 'number' &&
      d.bbox.x2 > d.bbox.x1 &&
      d.bbox.y2 > d.bbox.y1
  );

  return (
    <View style={[styles.wrapper, { height }]}>
      <View style={styles.container} onLayout={handleLayout}>
        {!imageLoaded && !imageError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Processing Visual AI Feed...</Text>
          </View>
        )}

        {imageError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.errorText}>Unable to display issue image</Text>
          </View>
        ) : (
          <Image
            accessibilityLabel="Reported civic issue photograph"
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />
        )}

        {/* HUD AI Tag Badge (Top Left) */}
        {imageLoaded && (
          <View style={styles.hudBadge}>
            <Ionicons name="sparkles" size={11} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.hudText}>{detections.length ? 'AI DETECTION OVERLAY' : 'ISSUE PHOTO'}</Text>
          </View>
        )}

        {/* Real YOLO Bounding Box Overlays */}
        {showBoxes &&
          imageLoaded &&
          cWidth > 0 &&
          validDetections.map((item, index) => {
            const { x1, y1, x2, y2 } = item.bbox || { x1: 0, y1: 0, x2: 0, y2: 0 };

            const boxLeft = offsetX + x1 * scale;
            const boxTop = offsetY + y1 * scale;
            const boxWidth = Math.max((x2 - x1) * scale, 0);
            const boxHeight = Math.max((y2 - y1) * scale, 0);
            const conf = Math.round((item.confidence || confidence || 0) * 100);
            const rawName = item.category || 'Civic Issue';
            const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/_/g, ' ');

            return (
              <View
                key={`bbox-${index}-${item.category || 'defect'}`}
                testID={`detection-box-${index}`}
                style={[
                  styles.boundingBox,
                  {
                    left: boxLeft,
                    top: boxTop,
                    width: boxWidth,
                    height: boxHeight,
                  },
                ]}
              >
                {/* Pill Label: e.g. "Pothole 92%" */}
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>
                    {formattedName} {conf > 0 ? `${conf}%` : ''}
                  </Text>
                </View>

                {/* HUD Corner Brackets */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            );
          })}

        {/* Toggle Bounding Box Button */}
        {showToggle && validDetections.length > 0 && (
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShowBoxes(!showBoxes)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={showBoxes ? 'Hide AI bounding box' : 'Show AI bounding box'}
          >
            <Ionicons
              name={showBoxes ? 'eye-off' : 'eye'}
              size={13}
              color="#FFFFFF"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.toggleBtnText}>
              {showBoxes ? 'Hide Bounding Box' : 'Show Bounding Box'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const BoundingBoxOverlay = DetectionOverlay;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.cinematic,
    borderWidth: 1.5,
    borderColor: COLORS.authorityPrimary,
    ...SHADOWS.card,
  },
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  hudBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(242, 193, 78, 0.6)',
  },
  hudText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(242, 193, 78, 0.10)',
    borderRadius: 4,
  },
  tagBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  tagText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderColor: COLORS.surface,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  toggleBtn: {
    minHeight: 44,
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  toggleBtnText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});
