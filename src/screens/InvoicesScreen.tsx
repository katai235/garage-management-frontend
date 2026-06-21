import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { invoiceApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

const STATUS_FILTERS = ['all','paid','unpaid','draft'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (isNaN(n) || !v) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const fmtDate = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch { return '—'; }
};

export default function InvoicesScreen({ navigation }: any) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const role = user?.role || 'technician';
  const canCreate = ['admin','manager','staff'].includes(role);
  const canPayment = ['admin','manager','staff'].includes(role);
  const canDelete = ['admin','manager'].includes(role);

  const fetchInvoices = async () => {
    try {
      const params: any = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      if (search) params.search = search;
      const res = await invoiceApi.getAll(params);
      setInvoices(res.data.invoices || []);
      setSummary(res.data.summary || {});
    } catch (e) { console.error('Fetch invoices error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchInvoices(); }, [activeFilter]));

  const handleCancel = (item: any) => {
    Alert.alert('Cancel Invoice', `Cancel invoice ${item.invoiceNumber || item.invoice_number}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Invoice', style: 'destructive', onPress: async () => { fetchInvoices(); } }
    ]);
  };

  const renderInvoice = ({ item }: { item: any }) => {
    const invoiceNum = item.invoiceNumber || item.invoice_number || '—';
    const customerName = item.customerName || item.customer_name || '—';
    const customerPhone = item.customerPhone || item.customer_phone;
    const make = item.make;
    const model = item.model;
    const licensePlate = item.licensePlate || item.license_plate;
    const totalAmount = parseFloat(String(item.totalAmount || item.total_amount || 0));
    const paidAmount = parseFloat(String(item.paidAmount || item.paid_amount || 0));
    const status = item.status || 'draft';
    const createdAt = item.createdAt || item.created_at;
    const balance = totalAmount - paidAmount;
    const isPaid = status === 'paid';
    const isCancelled = status === 'cancelled';

    return (
      <View style={[styles.card, Shadow.sm]}>
        {/* Top */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNum}>{invoiceNum}</Text>
            <Text style={styles.invoiceDate}>{fmtDate(createdAt)}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        <View style={styles.divider} />

        {/* Customer info */}
        <Text style={styles.customerName}>👤 {customerName}</Text>
        {customerPhone ? <Text style={styles.customerPhone}>{customerPhone}</Text> : null}
        {make ? <Text style={styles.vehicleText}>🚗 {make} {model}{licensePlate ? ` — ${licensePlate}` : ''}</Text> : null}

        {/* Amounts */}
        <View style={styles.amountRow}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>{t('total')}</Text>
            <Text style={styles.amountTotal}>{fmtKip(totalAmount)}</Text>
          </View>
          {paidAmount > 0 && (
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>{t('paid')}</Text>
              <Text style={[styles.amountNum, { color: Colors.success }]}>{fmtKip(paidAmount)}</Text>
            </View>
          )}
          {!isPaid && !isCancelled && (
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>{t('balance')}</Text>
              <Text style={[styles.amountNum, { color: Colors.danger }]}>{fmtKip(balance)}</Text>
            </View>
          )}
        </View>

        {/* Action buttons - always visible */}
        <View style={styles.actionSection}>
          {!isPaid && !isCancelled && canPayment && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => navigation.navigate('RecordPayment', { invoice: item })}
              activeOpacity={0.8}
            >
              <Text style={styles.payBtnText}>{t('recordPayment')}</Text>
            </TouchableOpacity>
          )}
          {isPaid && (
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>{t('fullyPaid')}</Text>
            </View>
          )}
          {isCancelled && (
            <View style={[styles.paidBadge, { backgroundColor: Colors.dangerLight }]}>
              <Text style={[styles.paidText, { color: Colors.danger }]}>❌ {t('cancelled')}</Text>
            </View>
          )}
          {/* View & print bill */}
          <TouchableOpacity
            style={styles.billBtn}
            onPress={() => navigation.navigate('InvoiceView', { invoice: item })}
            activeOpacity={0.8}
          >
            <Text style={styles.billBtnText}>🧾</Text>
          </TouchableOpacity>
          {/* Receipt — for all invoices */}
          <TouchableOpacity
            style={[styles.billBtn, { borderColor: Colors.success }]}
            onPress={() => navigation.navigate('Receipt', { invoice: item })}
            activeOpacity={0.8}
          >
            <Text style={styles.billBtnText}>🖨️</Text>
          </TouchableOpacity>
          {canDelete && !isCancelled && (
            <TouchableOpacity style={styles.delBtn} onPress={() => handleCancel(item)} activeOpacity={0.8}>
              <Text style={{ fontSize: Typography.base }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('invoices')}</Text>
          <Text style={styles.subtitle}>{t('invoicesSubtitle')}</Text>
        </View>
        {canCreate && (
          <Button title={t('newInvoice')} onPress={() => navigation.navigate('AddInvoice', {})} size="sm" />
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: t('revenue'), value: fmtKip(parseFloat(summary.total_revenue || 0)), color: Colors.success },
          { label: t('invoices').split(' ')[0], value: String(summary.total_invoices || 0), color: Colors.primary },
          { label: t('paid'), value: String(summary.paid_count || 0), color: Colors.success },
          { label: t('unpaid'), value: String(summary.unpaid_count || 0), color: Colors.danger },
        ].map(s => (
          <View key={s.label} style={[styles.summaryCard, Shadow.sm]}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍</Text>
          <TextInput style={styles.searchInput} placeholder={t('search')} placeholderTextColor={Colors.textTertiary} value={search} onChangeText={setSearch} onSubmitEditing={fetchInvoices} returnKeyType="search" />
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS} keyExtractor={i => i}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0, marginBottom: Spacing.md }}
        renderItem={({ item: f }) => (
          <TouchableOpacity style={[styles.filterTab, activeFilter === f && styles.filterTabActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      <FlatList
        data={invoices} keyExtractor={item => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoices(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="🧾" title={t('noInvoices')}
            subtitle={t('noInvoices')}
            actionLabel={canCreate ? t('newInvoice') : undefined}
            onAction={canCreate ? () => navigation.navigate('AddInvoice', {}) : undefined}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  title: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 6, marginBottom: Spacing.md },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: Typography.sm, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center' },
  searchRow: { paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  filterRow: { paddingHorizontal: Spacing.base, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  listContent: { padding: Spacing.base, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  invoiceNum: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  invoiceDate: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  customerName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  customerPhone: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  vehicleText: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  amountRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm, marginBottom: Spacing.md },
  amountCol: { flex: 1 },
  amountLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 3 },
  amountTotal: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary },
  amountNum: { fontSize: Typography.base, fontWeight: '700' },
  actionSection: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  payBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  paidBadge: { flex: 1, backgroundColor: Colors.successLight, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  paidText: { color: Colors.success, fontSize: Typography.base, fontWeight: '700' },
  delBtn: { width: 50, backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  billBtn: { width: 50, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  billBtnText: { fontSize: Typography.base },
});
