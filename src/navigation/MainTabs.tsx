import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../components';
import { AnalyzeScreen } from '../features/analyze/AnalyzeScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { LookupScreen } from '../features/lookup/LookupScreen';
import { AccountScreen } from '../features/profile/AccountScreen';
import { cardShadow, colors } from '../theme';
import { ROUTES } from './routes';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<Exclude<keyof MainTabParamList, 'Analyze'>, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  History: ['time', 'time-outline'],
  Lookup: ['search', 'search-outline'],
  Account: ['person', 'person-outline'],
};

function tabIcon(name: keyof typeof TAB_ICONS) {
  const [active, inactive] = TAB_ICONS[name];
  return function TabIcon({ focused, color }: { focused: boolean; color: string }) {
    return <Icon name={focused ? active : inactive} size={24} color={color} />;
  };
}

// Nút giữa: tròn, nổi lên trên thanh tab, màu chính.
function AnalyzeTabButton({ onPress }: Pick<BottomTabBarButtonProps, 'onPress'>) {
  return (
    <View style={styles.analyzeSlot}>
      <Pressable
        onPress={(event) => onPress?.(event)}
        accessibilityRole="button"
        accessibilityLabel="Phân tích cuộc gọi"
        style={({ pressed }) => [styles.analyzeButton, pressed && styles.analyzeButtonPressed]}
      >
        <Icon name="mic" size={30} color={colors.textOnPrimary} />
      </Pressable>
      <Text style={styles.analyzeLabel} numberOfLines={1}>
        {ROUTES.Analyze.title}
      </Text>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: ROUTES.Home.title, tabBarIcon: tabIcon('Home') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: ROUTES.History.title, tabBarIcon: tabIcon('History') }}
      />
      <Tab.Screen
        name="Analyze"
        component={AnalyzeScreen}
        options={{
          title: ROUTES.Analyze.title,
          tabBarButton: (props) => <AnalyzeTabButton onPress={props.onPress} />,
        }}
      />
      <Tab.Screen
        name="Lookup"
        component={LookupScreen}
        options={{ title: ROUTES.Lookup.title, tabBarIcon: tabIcon('Lookup') }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: ROUTES.Account.title, tabBarIcon: tabIcon('Account') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.border },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  analyzeSlot: { flex: 1, alignItems: 'center' },
  analyzeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -24,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  analyzeButtonPressed: { backgroundColor: colors.primaryPressed },
  analyzeLabel: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 2 },
});
