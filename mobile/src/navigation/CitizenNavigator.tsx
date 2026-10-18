import { WorkspaceShell } from '../components/WorkspaceShell';
import { PrimaryTabBar } from '../components/PrimaryTabBar';
import { CivicAssistantScreen } from '../screens/citizen/CivicAssistantScreen';
import { CitizenMapScreen } from '../screens/citizen/CitizenMapScreen';
import React, { useCallback, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CitizenTabParamList, CitizenStackParamList } from '../types/navigation';
import { COLORS } from '../constants/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { CitizenSidebar } from '../components/CitizenSidebar';

import { CitizenDashboardScreen } from '../screens/citizen/CitizenDashboardScreen';
import { ReportIssueScreen } from '../screens/citizen/ReportIssueScreen';
import { ComplaintHistoryScreen } from '../screens/citizen/ComplaintHistoryScreen';
import { ProfileScreen } from '../screens/citizen/ProfileScreen';
import { NotificationsScreen } from '../screens/citizen/NotificationsScreen';
import { ComplaintDetailScreen } from '../screens/citizen/ComplaintDetailScreen';

import { NotificationBadge } from '../components/NotificationBadge';
import { useUnreadCount } from '../hooks/useUnreadCount';

const Tab = createBottomTabNavigator<CitizenTabParamList>();
const Stack = createNativeStackNavigator<CitizenStackParamList>();

// ─── Citizen Tabs with Responsive Shell ──────────────────────────────────────
const CitizenTabs = (_props: any) => {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadCount();

  const { isWide } = useBreakpoint();
  const [activeRoute, setActiveRoute] = useState<string>('CitizenDashboard');

  // Ref to the Tab navigator's navigation object, populated by the custom tab bar
  const tabNavRef = useRef<any>(null);

  // Custom tab bar: on desktop renders nothing (sidebar replaces it),
  // on mobile/tablet renders the standard BottomTabBar.
  const CustomTabBar = useCallback(
    (props: BottomTabBarProps) => {
      // Keep the tab nav ref updated
      tabNavRef.current = props.navigation;

      // Sync active route state from tab state
      const currentRoute = props.state.routes[props.state.index]?.name ?? 'CitizenDashboard';
      if (currentRoute !== activeRoute) {
        // Use setTimeout to avoid setState-during-render warning
        setTimeout(() => setActiveRoute(currentRoute), 0);
      }

      if (isWide) return null;
      return <PrimaryTabBar {...props} routes={['CitizenDashboard', 'ReportIssue', 'ComplaintHistory', 'Notifications', 'CitizenProfile']} />;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWide, activeRoute, insets.bottom]
  );

  // Navigates between tabs from the sidebar
  const handleSidebarNavigate = useCallback((routeName: string) => {
    tabNavRef.current?.navigate(routeName);
  }, []);

  return (
    <WorkspaceShell role="citizen" activeRoute={activeRoute} onNavigate={handleSidebarNavigate}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tab.Navigator
          tabBar={CustomTabBar}
          screenOptions={({ route }: { route: { name: string } }) => ({
            headerStyle: {
              backgroundColor: COLORS.surface,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            },
            headerShadowVisible: false,
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
              color: COLORS.textPrimary,
            },
            tabBarActiveTintColor: COLORS.primary,
            tabBarLabelPosition: 'below-icon',
            tabBarItemStyle: { minWidth: 0 },
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: Math.max(insets.bottom, 8),
              paddingTop: 8,
              height: 56 + Math.max(insets.bottom, 8),
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: -2,
            },
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
              size: number;
            }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
              if (route.name === 'CitizenDashboard') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'ReportIssue') {
                iconName = focused ? 'camera' : 'camera-outline';
              } else if (route.name === 'ComplaintHistory') {
                iconName = focused ? 'document-text' : 'document-text-outline';
              } else if (route.name === 'CivicAssistant') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'CitizenMap') {
                iconName = focused ? 'map' : 'map-outline';
              } else if (route.name === 'Notifications') {
                iconName = focused ? 'notifications' : 'notifications-outline';
              } else if (route.name === 'CitizenProfile') {
                iconName = focused ? 'person' : 'person-outline';
              }
              return (
                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={iconName} size={22} color={color} />
                  {route.name === 'Notifications' && unreadCount > 0 && (
                    <View style={{ position: 'absolute', top: -4, right: -10 }}>
                      <NotificationBadge count={unreadCount} />
                    </View>
                  )}
                </View>
              );
            },
          })}
        >
          <Tab.Screen
            name="CitizenDashboard"
            component={CitizenDashboardScreen as any}
            options={{ title: 'Home', headerShown: false }}
          />
          <Tab.Screen
            name="ReportIssue"
            component={ReportIssueScreen as any}
            options={{ title: 'Report', headerShown: false }}
          />
          <Tab.Screen
            name="ComplaintHistory"
            component={ComplaintHistoryScreen as any}
            options={{ title: 'Complaints', headerShown: false }}
          />
          <Tab.Screen name="CivicAssistant" component={CivicAssistantScreen as any} options={{ title: 'Civic Assistance', headerShown: false }} />
          <Tab.Screen name="CitizenMap" component={CitizenMapScreen as any} options={{ title: 'Map', headerShown: false }} />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen as any}
            options={{ title: 'Alerts', headerShown: false }}
          />
          <Tab.Screen
            name="CitizenProfile"
            component={ProfileScreen as any}
            options={{ title: 'Profile', headerShown: false }}
          />
        </Tab.Navigator>
      </View>
    </WorkspaceShell>
  );
};

// ─── Citizen Stack Navigator ──────────────────────────────────────────────────
const CitizenDetailWorkspace = (props: any) => <WorkspaceShell role="citizen" activeRoute="ComplaintDetail" onNavigate={screen => props.navigation.navigate('CitizenTabs', { screen })}><ComplaintDetailScreen {...props} /></WorkspaceShell>;
export const CitizenNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: COLORS.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="CitizenTabs"
        component={CitizenTabs as any}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComplaintDetail"
        component={CitizenDetailWorkspace}
        options={{
          title: 'Complaint Details',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
