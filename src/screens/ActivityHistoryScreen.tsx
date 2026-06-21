import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentApi } from '../services/api';
import { EmptyState, LoadingState } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { ActivityLog } from '../types';
import { useLanguageStore } from '../store/languageStore';

const ACTIVITY_TYPES = ['all', 'repair', 'stock', 'customer', 'invoice', 'appointment'];

const ACTIVITY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  repair:      { icon: '🔧', color: Colors.info,    bg: Colors.infoLight },
  stock:       { icon: '📦', color: '#8B5CF6',      bg: 'rgba(139,92,246,0.1)' },
  customer:    { icon: '👤', color: Colors.success,  bg: Colors.successLight },
  invoice:     { icon: '🧾', color: Colors.warning,  bg: Colors.warningLight },
  appointment: { icon: '📅', color: Colors.primary,  bg: Colors.primaryAlpha },
  user:        { icon: '🔐', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
  system:      { icon: '⚙️', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
};

const safeFormatDate = (dateStr: any): string => {
  try {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' — ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
};

export default function ActivityHistoryScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const { t } = useLanguageStore();

  // Translated labels for the filter chips, built here so they have access to t()
  const FILTER_LABELS: Record<string, string> = {
    all: t('filterAll'),
    repair: t('filterRepair'),
    stock: t('filterStock'),
    customer: t('filterCustomer'),
    invoice: t('filterInvoice'),
    appointment: t('filterAppointment'),
  };

  const fetchLogs = async () => {
    try {
      const params: any = {};
      if (activeType !== 'all') params.type = activeType;
      const res = await appointmentApi.getActivityLogs(params);
      setLogs(res.data.logs);
      setSummary(res.data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchLogs(); }, [activeType]));

  const renderLog = ({ item }: { item: ActivityLog }) => {
    const config = ACTIVITY_CONFIG[item.activityType] || ACTIVITY_CONFIG.system;
    const performedBy = item.performedByName || item.performed_by_name;
    const performedByRole = item.performedByRole || item.performed_by_role;
    return (
      <View style={[styles.card, Shadow.sm]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
            <Text style={styles.iconText}>{config.icon}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={styles.logTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.typeBadgeText, { color: config.color }]}>
                  {item.activityType}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text style={styles.logDescription} numberOfLines={2}>{item.description}</Text>
            )}
            {performedBy && (
              <View style={styles.accountRow}>
                <View style={styles.accountBadge}>
                  <Text style={styles.accountIcon}>👤</Text>
                  <Text style={styles.accountName}>{performedBy}</Text>
                  {performedByRole && (
                    <View style={styles.rolePill}>
                      <Text style={styles.roleText}>{performedByRole}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            <Text style={styles.metaTime}>{safeFormatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('activityHistory')}</Text>
        <Text style={styles.subtitle}>{t('activityHistorySubtitle')}</Text>
      </View>

      <View style={styles.summaryRow}>
        {[
          { label: t('total'), value: summary.total || 0, color: Colors.textPrimary },
          { label: t('repairs'), value: summary.repairs || 0, color: Colors.info },
          { label: t('stockChanges'), value: summary.stock_changes || 0, color: '#8B5CF6' },
          { label: t('customers'), value: summary.customer_actions || 0, color: Colors.success },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, Shadow.sm]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={ACTIVITY_TYPES}
        keyExtractor={(i) => i}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0, marginBottom: Spacing.md }}
        renderItem={({ item: type }) => (
          <TouchableOpacity
            style={[styles.filterTab, activeType === type && styles.filterTabActive]}
            onPress={() => setActiveType(type)}
          >
            {type !== 'all' && <Text style={styles.filterIcon}>{ACTIVITY_CONFIG[type]?.icon}</Text>}
            <Text style={[styles.filterText, activeType === type && styles.filterTextActive]}>
              {FILTER_LABELS[type] || type}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="📋" title={t('noActivityLogs')} subtitle={t('activityWillAppear')} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  title: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 6, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: '700' },
  statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  filterRow: { paddingHorizontal: Spacing.base, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterIcon: { fontSize: 12 },
  filterText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  listContent: { padding: Spacing.base, paddingTop: 0 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  logTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  logDescription: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 6, lineHeight: 18 },
  metaTime: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 4 },
  accountRow: { marginTop: 6, marginBottom: 2 },
  accountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surfaceSecondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  accountIcon: { fontSize: 11 },
  accountName: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textPrimary },
  rolePill: { backgroundColor: Colors.primaryAlpha, paddingHorizontal: 6, paddingVertical: 1, borderRadius: BorderRadius.full },
  roleText: { fontSize: 9, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' },
});
