import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import LanguageToggle from '../components/LanguageToggle';
import { RoleBadge } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const NOTIF_KEYS = {
  service: '@notif_service',
  stock:   '@notif_stock',
  appt:    '@notif_appt',
};

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const { t } = useLanguageStore();
  const [notifService, setNotifService] = useState(true);
  const [notifStock,   setNotifStock]   = useState(true);
  const [notifAppt,    setNotifAppt]    = useState(true);

  // ── Load saved notification prefs ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [s, st, a] = await Promise.all([
          AsyncStorage.getItem(NOTIF_KEYS.service),
          AsyncStorage.getItem(NOTIF_KEYS.stock),
          AsyncStorage.getItem(NOTIF_KEYS.appt),
        ]);
        if (s  !== null) setNotifService(s  === 'true');
        if (st !== null) setNotifStock(st   === 'true');
        if (a  !== null) setNotifAppt(a     === 'true');
      } catch {}
    })();
  }, []);

  const saveNotif = async (key: string, value: boolean) => {
    try { await AsyncStorage.setItem(key, String(value)); } catch {}
  };

  const handleNotifService = (v: boolean) => { setNotifService(v); saveNotif(NOTIF_KEYS.service, v); };
  const handleNotifStock   = (v: boolean) => { setNotifStock(v);   saveNotif(NOTIF_KEYS.stock,   v); };
  const handleNotifAppt    = (v: boolean) => { setNotifAppt(v);    saveNotif(NOTIF_KEYS.appt,    v); };

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const SettingRow = ({
    icon, label, subtitle, onPress, rightEl, showArrow = true
  }: {
    icon: string; label: string; subtitle?: string;
    onPress?: () => void; rightEl?: React.ReactNode; showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIconBox}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightEl || (showArrow && onPress && <Text style={styles.arrow}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings')}</Text>
          <Text style={styles.subtitle}>{t('settingsSubtitle')}</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, Shadow.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileUsername}>@{user?.username}</Text>
          </View>
          <RoleBadge role={user?.role || 'staff'} />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={[styles.settingGroup, Shadow.sm]}>
            <SettingRow
              icon="👤" label={t("editProfile")}
              subtitle={t("editProfileSub")}
              onPress={() => navigation.navigate('Profile')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="🔒" label={t("changePassword")}
              subtitle={t("changePasswordSub")}
              onPress={() => navigation.navigate('ChangePassword')}
            />
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <View style={styles.separator} />
                <SettingRow
                  icon="👥" label={t("manageUsers")}
                  subtitle={t("manageUsersSub")}
                  onPress={() => navigation.navigate('ManageUsers')}
                />
              </>
            )}
          </View>
        </View>

        {/* Notifications — persisted to AsyncStorage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={[styles.settingGroup, Shadow.sm]}>
            <SettingRow
              icon="🔧" label={t("serviceUpdates")}
              subtitle={t("serviceUpdatesSub")}
              showArrow={false}
              rightEl={
                <Switch value={notifService} onValueChange={handleNotifService}
                  trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="📦" label={t("lowStockAlerts")}
              subtitle={t("lowStockAlertsSub")}
              showArrow={false}
              rightEl={
                <Switch value={notifStock} onValueChange={handleNotifStock}
                  trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="📅" label={t("appointmentReminders")}
              subtitle={t("appointmentRemindersSub")}
              showArrow={false}
              rightEl={
                <Switch value={notifAppt} onValueChange={handleNotifAppt}
                  trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
              }
            />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={[styles.settingGroup, Shadow.sm]}>
            <SettingRow
              icon="📱" label={t("activeSessions")}
              subtitle={t("activeSessionsSub")}
              onPress={() => navigation.navigate('ActiveSessions')}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={[styles.settingGroup, Shadow.sm]}>
            <SettingRow
              icon="ℹ️" label={t('appVersion')}
              subtitle="Sam Saen Thai KT Lo,. Co GMS"
              showArrow={false}
              rightEl={<Text style={styles.versionText}>v1.0.0</Text>}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="📄" label={t('privacyPolicy')}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="🌐" label={t('language')}
              subtitle="English / ພາສາລາວ"
              showArrow={false}
              rightEl={<LanguageToggle />}
            />
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.logoutBtn, Shadow.sm]} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>{t('signOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  title: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.xl, borderRadius: BorderRadius.xl, padding: Spacing.base, gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography['2xl'], fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: Typography.sm, color: Colors.textSecondary },
  profileUsername: { fontSize: Typography.sm, color: Colors.textTertiary },
  section: { marginHorizontal: Spacing.base, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  settingGroup: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: 12 },
  settingIconBox: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  settingIcon: { fontSize: 18 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  settingSubtitle: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 1 },
  arrow: { fontSize: 22, color: Colors.textTertiary },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  versionText: { fontSize: Typography.sm, color: Colors.textTertiary, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingVertical: Spacing.base, gap: 8, borderWidth: 1.5, borderColor: Colors.dangerLight },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: Typography.md, fontWeight: '700', color: Colors.danger },
});
