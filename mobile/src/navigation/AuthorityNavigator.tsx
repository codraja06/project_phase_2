import { WorkspaceShell } from '../components/WorkspaceShell';
import { PrimaryTabBar } from '../components/PrimaryTabBar';
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthorityTabParamList, AuthorityStackParamList } from '../types/navigation';
import { COLORS } from '../constants/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AuthoritySidebar } from '../components/AuthoritySidebar';
import { MobileDrawer } from '../components/MobileDrawer';
import { MobileMenuProvider } from '../contexts/MobileMenuContext';

import { AuthorityDashboardScreen } from '../screens/authority/AuthorityDashboardScreen';
import { AuthorityComplaintsScreen } from '../screens/authority/AuthorityComplaintsScreen';
import { AuthorityMapScreen } from '../screens/authority/AuthorityMapScreen';
import { AuthorityAnalyticsScreen } from '../screens/authority/AuthorityAnalyticsScreen';
import { AuthorityNotificationsScreen } from '../screens/authority/AuthorityNotificationsScreen';
import { AuthorityProfileScreen } from '../screens/authority/AuthorityProfileScreen';
import { AuthorityDetailScreen } from '../screens/authority/AuthorityDetailScreen';

const Tab = createBottomTabNavigator<AuthorityTabParamList>();
const Stack = createNativeStackNavigator<AuthorityStackParamList>();

// ─── Tab definitions (NO User Management) ───────────────────────────────────
const TAB_ITEMS: {
  name: keyof AuthorityTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'AuthorityDashboard', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'AllComplaints', label: 'Complaints', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'AuthorityMap', label: 'Map', icon: 'map-outline', iconActive: 'map' },
  { name: 'AuthorityAnalytics', label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { name: 'AuthorityNotifications', label: 'Feed', icon: 'notifications-outline', iconActive: 'notifications' },
  { name: 'AuthorityProfile', label: 'Profile', icon: 'shield-outline', iconActive: 'shield' },
];

import { NotificationBadge } from '../components/NotificationBadge';
import { useUnreadCount } from '../hooks/useUnreadCount';

// ─── Mobile Bottom Tab Bar ──────────────────────────────────────────────────
const MobileBottomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8);
  const { unreadCount } = useUnreadCount();

  return (
    <View style={[tabStyles.container, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route, index) => {
        const tabDef = TAB_ITEMS.find(t => t.name === route.name);
        if (!tabDef) return null; // Skip any routes not in our tab list

        const isFocused = state.index === index;
        const color = isFocused ? COLORS.secondary : 'rgba(255,255,255,0.55)';
        const isNotif = route.name === 'AuthorityNotifications';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tabDef.label}
            onPress={onPress}
            style={tabStyles.tab}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={isFocused ? tabDef.iconActive : tabDef.icon} size={22} color={color} />
              {isNotif && unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -8 }}>
                  <NotificationBadge count={unreadCount} />
                </View>
              )}
            </View>
            <Text style={[tabStyles.label, { color }]} numberOfLines={1}>{tabDef.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.authorityPrimary,
    borderTopWidth: 1,
    borderTopColor: COLORS.authorityDark,
    paddingTop: 8,
    // Web sticky
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, bottom: 0, width: '100%' } : {}),
    zIndex: 100,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 44, // Touch target
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});

// ─── Authority Tabs with Responsive Shell ────────────────────────────────────
const AuthorityTabs = (_props: any) => {
  const { isWide } = useBreakpoint();
  const [activeRoute, setActiveRoute] = useState<string>('AuthorityDashboard');
  const tabNavRef = useRef<any>(null);

  const CustomTabBar = useCallback(
    (props: BottomTabBarProps) => {
      tabNavRef.current = props.navigation;
      const currentRoute = props.state.routes[props.state.index]?.name ?? 'AuthorityDashboard';
      if (currentRoute !== activeRoute) {
        setTimeout(() => setActiveRoute(currentRoute), 0);
      }
      // Desktop: sidebar replaces tab bar
      if (isWide) return null;
      return <PrimaryTabBar {...props} routes={['AuthorityDashboard','AllComplaints','AuthorityMap','AuthorityAnalytics','AuthorityProfile']} />;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWide, activeRoute]
  );

  const handleSidebarNavigate = useCallback((routeName: string) => {
    tabNavRef.current?.navigate(routeName);
  }, []);

  return (
    <WorkspaceShell role="authority" activeRoute={activeRoute} onNavigate={handleSidebarNavigate}>
      <MobileDrawer activeRoute={activeRoute} onNavigate={handleSidebarNavigate} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tab.Navigator
          tabBar={CustomTabBar}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.secondary,
            tabBarInactiveTintColor: 'rgba(255,255,255,0.50)',
          }}
        >
          <Tab.Screen name="AuthorityDashboard" component={AuthorityDashboardScreen as any} options={{ title: 'Dashboard' }} />
          <Tab.Screen name="AllComplaints" component={AuthorityComplaintsScreen as any} options={{ title: 'Complaints' }} />
          <Tab.Screen name="AuthorityMap" component={AuthorityMapScreen as any} options={{ title: 'Map' }} />
          <Tab.Screen name="AuthorityAnalytics" component={AuthorityAnalyticsScreen as any} options={{ title: 'Analytics' }} />
          <Tab.Screen name="AuthorityNotifications" component={AuthorityNotificationsScreen as any} options={{ title: 'Feed' }} />
          <Tab.Screen name="AuthorityProfile" component={AuthorityProfileScreen as any} options={{ title: 'Profile' }} />
        </Tab.Navigator>
      </View>
    </WorkspaceShell>
  );
};

// ─── Authority Stack Navigator ────────────────────────────────────────────────
const AuthorityDetailWorkspace = (props: any) => <WorkspaceShell role="authority" activeRoute="AuthorityComplaintDetail" onNavigate={screen => props.navigation.navigate('AuthorityTabs', { screen })}><AuthorityDetailScreen {...props} /></WorkspaceShell>;
export const AuthorityNavigator: React.FC = () => {
  return (
    <MobileMenuProvider>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerShadowVisible: false,
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: COLORS.textPrimary },
        }}
      >
        <Stack.Screen name="AuthorityTabs" component={AuthorityTabs as any} options={{ headerShown: false }} />
        <Stack.Screen name="AuthorityComplaintDetail" component={AuthorityDetailWorkspace} options={{ title: 'Complaint Details', headerShown: false }} />
      </Stack.Navigator>
    </MobileMenuProvider>
  );
};
