import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface SuccessModalProps {
  visible: boolean;
  complaintId: string;
  title?: string;
  message?: string;
  onViewComplaint: () => void;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  complaintId,
  title = 'Complaint registered successfully',
  message = 'Your complaint has been successfully registered and routed to municipal operations.',
  onViewComplaint,
  onClose,
}) => {
  const reducedMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        scaleAnim.setValue(1); opacityAnim.setValue(1); checkAnim.setValue(1); return;
      }
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible, reducedMotion, scaleAnim, opacityAnim, checkAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(26,26,26,0.72)' }}><ScrollView contentContainerStyle={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated confirmation icon using semantic theme colors */}
          <View style={styles.iconRingOuter}>
            <Animated.View
              style={[
                styles.iconRingInner,
                {
                  transform: [{ scale: checkAnim }],
                },
              ]}
            >
              <Ionicons name="checkmark-sharp" size={34} color="#FFFFFF" />
            </Animated.View>
          </View>

          {/* Heading & Details */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Complaint ID Badge Container */}
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>OFFICIAL COMPLAINT ID</Text>
            <Text style={styles.idValue}>{complaintId || 'Reference unavailable'}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              accessibilityLabel="VIEW COMPLAINT DETAILS"
              accessibilityRole="button"
              onPress={onViewComplaint}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>VIEW COMPLAINT DETAILS</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              accessibilityLabel="BACK TO HOME"
              accessibilityRole="button"
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>BACK TO HOME</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView></SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flexGrow: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)' as any } : {}),
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FEF08A',
    ...SHADOWS.floating,
  },
  iconRingOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFDE7', // Yellow accent highlight
    borderWidth: 3,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary, // Crimson Red
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  idCard: {
    width: '100%',
    backgroundColor: COLORS.backgroundNeutral,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderMaroon,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  idLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  idValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.darkCharcoal,
    letterSpacing: 0.8,
  },
  actionContainer: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  primaryBtnText: {
    flexShrink: 1,
    textAlign: 'center',
    color: COLORS.surface,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    width: '100%',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
