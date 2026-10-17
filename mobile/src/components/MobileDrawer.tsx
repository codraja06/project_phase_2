import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, Modal, ScrollView, Platform, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthoritySidebar } from './AuthoritySidebar';
import { useMobileMenu } from '../contexts/MobileMenuContext';
import { COLORS } from '../constants/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';

export const MobileDrawer: React.FC<{
  activeRoute: string;
  onNavigate: (route: string) => void;
}> = ({ activeRoute, onNavigate }) => {
  const { isMenuOpen, closeMenu } = useMobileMenu();
  const { isDesktop } = useBreakpoint();
  if (isDesktop || !isMenuOpen) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeMenu}>
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <SafeAreaView style={styles.drawerContainer}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close navigation" onPress={closeMenu} style={{ minHeight: 44, padding: 12, alignItems: 'flex-end' }}><Text style={{ color: COLORS.primary, fontWeight: '600' }}>Close</Text></TouchableOpacity>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <AuthoritySidebar
          activeRoute={activeRoute}
          onNavigate={(route) => {
            onNavigate(route);
            closeMenu();
          }}
        />
        </ScrollView>
      </SafeAreaView>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: 260,
    maxWidth: '88%',
    height: '100%',
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' ? { boxShadow: '2px 0 8px rgba(0,0,0,0.1)' } : { elevation: 5 }),
  },
});
