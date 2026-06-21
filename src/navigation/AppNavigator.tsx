import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Modal, ScrollView, Alert
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { RoleBadge } from '../components/UI';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import StockScreen from '../screens/StockScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import ActivityHistoryScreen from '../screens/ActivityHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddCustomerScreen from '../screens/AddCustomerScreen';
import AddStockItemScreen from '../screens/AddStockItemScreen';
import AddServiceScreen from '../screens/AddServiceScreen';
import AddAppointmentScreen from '../screens/AddAppointmentScreen';
import AddScheduleScreen from '../screens/AddScheduleScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ActiveSessionsScreen from '../screens/ActiveSessionsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SellPartsScreen from '../screens/SellPartsScreen';
import RestockScreen from '../screens/RestockScreen';
import AddInvoiceScreen from '../screens/AddInvoiceScreen';
import AddVehicleScreen from '../screens/AddVehicleScreen';
import RecordPaymentScreen from '../screens/RecordPaymentScreen';
import AdjustStockScreen from '../screens/AdjustStockScreen';
import InvoiceViewScreen from '../screens/InvoiceViewScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import StockItemViewScreen from '../screens/StockItemViewScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.72;

// ============================================
// SIDEBAR COMPONENT
// ============================================
const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard',   screen: 'Dashboard' },
  { icon: '🚗', label: 'Services',    screen: 'Vehicles' },
  { icon: '📅', label: 'Schedule',    screen: 'Appointments' },
  { icon: '👥', label: 'Customers',   screen: 'Customers' },
  { icon: '📦', label: 'Stock',       screen: 'Stock' },
  { icon: '🧾', label: 'Billing',     screen: 'Invoices' },
  { icon: '📋', label: 'Activity',    screen: 'ActivityHistory' },
];

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  activeScreen: string;
}

const Sidebar: React.FC<SidebarProps> = ({ visible, onClose, onNavigate, activeScreen }) => {
  const { user, logout } = useAuthStore();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { onClose(); logout(); } }
    ]);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={sideStyles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[sideStyles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Sidebar panel */}
        <Animated.View style={[sideStyles.panel, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={sideStyles.header}>
              <View style={sideStyles.logoBox}>
                <Text style={sideStyles.logoEmoji}>🔧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sideStyles.brandTop}>SAM SAEN THAI</Text>
                <Text style={sideStyles.brandBottom}>KT Lo,. Co</Text>
              </View>
              <TouchableOpacity style={sideStyles.closeBtn} onPress={onClose}>
                <Text style={sideStyles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* User info */}
            <View style={sideStyles.userBox}>
              <View style={sideStyles.userAvatar}>
                <Text style={sideStyles.userAvatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sideStyles.userName}>{user?.fullName || 'User'}</Text>
                <Text style={sideStyles.userEmail}>{user?.email || ''}</Text>
              </View>
              <RoleBadge role={user?.role || 'staff'} />
            </View>

            {/* Nav items */}
            <ScrollView style={sideStyles.navList} showsVerticalScrollIndicator={false}>
              <Text style={sideStyles.navGroup}>MAIN MENU</Text>
              {SIDEBAR_ITEMS.map(item => {
                const isActive = activeScreen === item.screen;
                return (
                  <TouchableOpacity
                    key={item.screen}
                    style={[sideStyles.navItem, isActive && sideStyles.navItemActive]}
                    onPress={() => { onNavigate(item.screen); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[sideStyles.navIconBox, isActive && sideStyles.navIconBoxActive]}>
                      <Text style={sideStyles.navIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[sideStyles.navLabel, isActive && sideStyles.navLabelActive]}>
                      {item.label}
                    </Text>
                    {isActive && <View style={sideStyles.navActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Logout */}
            <TouchableOpacity style={sideStyles.logoutBtn} onPress={handleLogout}>
              <Text style={sideStyles.logoutIcon}>🚪</Text>
              <Text style={sideStyles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const sideStyles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  panel: {
    width: SIDEBAR_WIDTH, backgroundColor: '#0F172A',
    position: 'absolute', left: 0, top: 0, bottom: 0,
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 22 },
  brandTop: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, fontWeight: '600' },
  brandBottom: { fontSize: Typography.base, color: '#FFFFFF', fontWeight: '800' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 14, fontWeight: '600' },
  userBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: Spacing.base, padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.lg,
  },
  userAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: Typography.lg, fontWeight: '800' },
  userName: { fontSize: Typography.base, fontWeight: '700', color: '#FFFFFF' },
  userEmail: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  navList: { flex: 1, paddingHorizontal: Spacing.sm },
  navGroup: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5, fontWeight: '700',
    paddingHorizontal: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, marginBottom: 2,
  },
  navItemActive: { backgroundColor: 'rgba(26,86,219,0.2)' },
  navIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  navIconBoxActive: { backgroundColor: Colors.primary },
  navIcon: { fontSize: 18 },
  navLabel: { flex: 1, fontSize: Typography.base, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  navLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  navActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: Spacing.base, padding: Spacing.md,
    backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)',
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: Typography.base, fontWeight: '700', color: '#DC2626' },
});

// ============================================
// MAIN LAYOUT WRAPPER — provides sidebar to all tab screens
// ============================================
const MainLayoutContext = React.createContext<{
  openSidebar: () => void;
  activeScreen: string;
  setActiveScreen: (s: string) => void;
}>({ openSidebar: () => {}, activeScreen: 'Dashboard', setActiveScreen: () => {} });

export const useMainLayout = () => React.useContext(MainLayoutContext);

function MainLayout({ navigation }: any) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState('Dashboard');

  const handleNavigate = (screen: string) => {
    setActiveScreen(screen);
    navigation.navigate(screen);
  };

  return (
    <MainLayoutContext.Provider value={{
      openSidebar: () => setSidebarVisible(true),
      activeScreen,
      setActiveScreen,
    }}>
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={handleNavigate}
        activeScreen={activeScreen}
      />

      {/* Bottom tab bar — only 3 buttons */}
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                <Text style={styles.tabEmoji}>🏠</Text>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>Home</Text>
              </View>
            ),
          }}
          listeners={{ focus: () => setActiveScreen('Dashboard') }}
        />
        <Tab.Screen
          name="MenuBtn"
          component={DashboardScreen}
          options={{
            tabBarIcon: () => (
              <TouchableOpacity
                style={styles.menuFab}
                onPress={() => setSidebarVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.menuFabIcon}>☰</Text>
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setSidebarVisible(true);
            },
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                <Text style={styles.tabEmoji}>⚙️</Text>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>Settings</Text>
              </View>
            ),
          }}
          listeners={{ focus: () => setActiveScreen('Settings') }}
        />
      </Tab.Navigator>
    </MainLayoutContext.Provider>
  );
}

// Hidden screens accessed via sidebar navigation (not tabs)
function MainWithScreens({ navigation }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainLayout} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="Stock" component={StockScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditCustomer" component={AddCustomerScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddService" component={AddServiceScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddStockItem" component={AddStockItemScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditStockItem" component={AddStockItemScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AdjustStock" component={AdjustStockScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddInvoice" component={AddInvoiceScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="InvoiceView" component={InvoiceViewScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddSchedule" component={AddScheduleScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditSchedule" component={AddScheduleScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Profile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="SellParts" component={SellPartsScreen} />
      <Stack.Screen name="RestockScreen" component={RestockScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="StockItemView" component={StockItemViewScreen} />
      <Stack.Screen name="ManageUsers" component={RegisterScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// ============================================
// ROOT NAVIGATOR
// ============================================
export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            <Stack.Screen name="Main" component={MainWithScreens} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 4, minWidth: 70 },
  tabItemActive: {},
  tabEmoji: { fontSize: 24 },
  tabLabel: { fontSize: 10, marginTop: 3, color: Colors.textTertiary, fontWeight: '500' },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  menuFab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...Shadow.lg,
  },
  menuFabIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
