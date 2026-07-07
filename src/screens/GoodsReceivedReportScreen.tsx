import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { stockApi, supplierApi } from '../services/api';
import { EmptyState, LoadingState } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { Supplier } from '../types';
import { useLanguageStore } from '../store/languageStore';

interface ReceivedTxn {
  id: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  notes?: string;
  createdAt: string;
  supplierId: string | null;
  supplierName: string;
  receivedByName?: string;
}

const formatCurrency = (v: number) => {
  if (!v || isNaN(v)) return '₭0';
  return '₭' + Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

export default function GoodsReceivedReportScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<ReceivedTxn[]>([]);
  const [summary, setSummary] = useState({ totalEvents: 0, totalQuantity: 0, totalCost: 0 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguageStore();

  const fetchReport = async (supplierId = selectedSupplierId) => {
    try {
      const params: any = {};
      if (supplierId) params.supplierId = supplierId;
      const res = await stockApi.getGoodsReceived(params);
      setTransactions(res.data.transactions || []);
      setSummary(res.data.summary || { totalEvents: 0, totalQuantity: 0, totalCost: 0 });
    } catch (error) {
      console.error('Fetch goods received report error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchReport();
    supplierApi.getAll({ isActive: 'true' }).then(res => setSuppliers(res.data.suppliers || [])).catch(() => {});
  }, []));

  const selectSupplier = (id: string | null) => {
    setSelectedSupplierId(id);
    setLoading(true);
    fetchReport(id);
  };

  // Group transactions by supplier for section display
  const sections = Object.values(
    transactions.reduce((acc: Record<string, { title: string; data: ReceivedTxn[] }>, txn) => {
      const key = txn.supplierId || 'unknown';
      if (!acc[key]) acc[key] = { title: txn.supplierName, data: [] };
      acc[key].data.push(txn);
      return acc;
    }, {})
  );

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('goodsReceivedReport')}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={styles.statValue}>{summary.totalEvents}</Text>
          <Text style={styles.statLabel}>{t('events')}</Text>
        </View>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{summary.totalQuantity}</Text>
          <Text style={styles.statLabel}>{t('unitsReceived')}</Text>
        </View>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={[styles.statValue, { color: Colors.primary, fontSize: Typography.base }]}>
            {formatCurrency(summary.totalCost)}
          </Text>
          <Text style={styles.statLabel}>{t('totalCost')}</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, !selectedSupplierId && styles.chipActive]}
          onPress={() => selectSupplier(null)}
        >
          <Text style={[styles.chipText, !selectedSupplierId && styles.chipTextActive]}>{t('allSuppliers')}</Text>
        </TouchableOpacity>
        {suppliers.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, selectedSupplierId === s.id && styles.chipActive]}
            onPress={() => selectSupplier(s.id)}
          >
            <Text style={[styles.chipText, selectedSupplierId === s.id && styles.chipTextActive]} numberOfLines={1}>
              {s.companyName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} tintColor={Colors.primary} />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>🚚 {section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.cardTop}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <Text style={styles.qty}>+{item.quantity}</Text>
            </View>
            <Text style={styles.sku}>SKU: {item.sku}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>{formatDate(item.createdAt)}</Text>
              {item.receivedByName ? <Text style={styles.footerText}>· {item.receivedByName}</Text> : null}
              <Text style={styles.footerCost}>{formatCurrency(item.quantity * item.unitCost)}</Text>
            </View>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="📥" title={t('noGoodsReceived')} subtitle={t('noGoodsReceivedSub')} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 8, marginVertical: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, maxWidth: 160 },
  chipActive: { backgroundColor: Colors.primaryAlpha, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  listContent: { padding: Spacing.base, paddingTop: 0 },
  sectionHeader: { fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  qty: { fontSize: Typography.base, fontWeight: '800', color: Colors.success },
  sku: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  footerText: { fontSize: Typography.xs, color: Colors.textSecondary },
  footerCost: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginLeft: 'auto' },
  notes: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 6, fontStyle: 'italic' },
});
