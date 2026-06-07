import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { authApi } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDate = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch { return '—'; }
};

const deviceIcon = (ua: string) => {
  if (!ua) return '📱';
  const u = ua.toLowerCase();
  if (u.includes('android')) return '🤖';
  if (u.includes('iphone') || u.includes('ios')) return '🍎';
  if (u.includes('windows')) return '🖥️';
  if (u.includes('mac')) return '💻';
  return '📱';
};

export default function ActiveSessionsScreen({ navigation }: any) {
  const [sessions, setSessions]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking]     = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await authApi.getSessions();
      setSessions(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchSessions(); }, []));

  const handleRevoke = (session: any) => {
    const isCurrent = session.is_current;
    Alert.alert(
      isCurrent ? 'Sign Out?' : 'Revoke Session',
      isCurrent
        ? 'This will sign you out of the app.'
        : `Remove this session?\n${fmtDate(session.created_at)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrent ? 'Sign Out' : 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking(session.id);
            try {
              await authApi.revokeSession(session.id);
              fetchSessions();
            } catch {
              Alert.alert('Error', 'Failed to revoke session.');
            } finally { setRevoking(null); }
          },
        },
      ]
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all devices except the current session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.revokeAllSessions();
              fetchSessions();
              Alert.alert('✅ Done', 'All other sessions have been signed out.');
            } catch {
              Alert.alert('Error', 'Failed to revoke sessions.');
            }
          },
        },
      ]
    );
  };

  const renderSession = ({ item }: { item: any }) => {
    const isRevoking = revoking === item.id;
    return (
      <View style={[styles.card, Shadow.sm, item.is_current && styles.currentCard]}>
        <View style={styles.cardLeft}>
          <Text style={styles.deviceIcon}>{deviceIcon(item.user_agent || '')}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.deviceLabel}>
              {item.is_current ? 'This Device' : 'Other Device'}
            </Text>
            {item.is_current && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={styles.sessionDate}>Signed in: {fmtDate(item.created_at)}</Text>
          <Text style={styles.sessionExpiry}>Expires: {fmtDate(item.expires_at)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.revokeBtn, item.is_current && styles.revokeBtnCurrent]}
          onPress={() => handleRevoke(item)}
          disabled={isRevoking}
        >
          {isRevoking
            ? <ActivityIndicator size="small" color={item.is_current ? Colors.primary : Colors.danger} />
            : <Text style={[styles.revokeBtnText, item.is_current && { color: Colors.primary }]}>
                {item.is_current ? 'Sign Out' : 'Revoke'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <View style={styles.loadingBox}><ActivityIndicator size="large" color={Colors.primary} /></View>
        : (
          <FlatList
            data={sessions}
            keyExtractor={i => i.id}
            renderItem={renderSession}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={Colors.primary} />
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}
                </Text>
                {sessions.filter(s => !s.is_current).length > 0 && (
                  <TouchableOpacity onPress={handleRevokeAll}>
                    <Text style={styles.revokeAllBtn}>Sign out all others</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📱</Text>
                <Text style={styles.emptyText}>No active sessions found</Text>
              </View>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:          { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  headerTitle:      { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  loadingBox:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:             { padding: Spacing.base, paddingBottom: 60 },
  listHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  listHeaderText:   { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },
  revokeAllBtn:     { fontSize: Typography.sm, color: Colors.danger, fontWeight: '700' },
  card:             { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md, gap: 12 },
  currentCard:      { borderWidth: 2, borderColor: Colors.primary },
  cardLeft:         { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  deviceIcon:       { fontSize: 22 },
  cardInfo:         { flex: 1, gap: 3 },
  cardTopRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceLabel:      { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  currentBadge:     { backgroundColor: Colors.primaryAlpha, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  currentBadgeText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '700' },
  sessionDate:      { fontSize: Typography.xs, color: Colors.textSecondary },
  sessionExpiry:    { fontSize: Typography.xs, color: Colors.textTertiary },
  revokeBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.md, backgroundColor: Colors.dangerLight },
  revokeBtnCurrent: { backgroundColor: Colors.primaryAlpha },
  revokeBtnText:    { fontSize: Typography.sm, fontWeight: '700', color: Colors.danger },
  emptyBox:         { alignItems: 'center', paddingTop: 60 },
  emptyIcon:        { fontSize: 48, marginBottom: Spacing.md },
  emptyText:        { fontSize: Typography.base, color: Colors.textSecondary },
});
