import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { vehicleApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';
import { ServiceRecord } from '../types';

const STATUS_FILTERS = ['all', 'waiting', 'in-service', 'ready', 'completed'];

const safeDate = (s: any): string => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2,'0');
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${mo[d.getMonth()]} ${d.getDate()}, ${h}:${m} ${ap}`;
  } catch { return '—'; }
};

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Status flow: what buttons to show for each status
const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string; bg: string }[]> = {
  'waiting':    [{ next: 'in-service', label: '▶ Start Service',   color: Colors.info,    bg: Colors.infoLight }],
  'in-service': [
    { next: 'ready',   label: '✓ Mark Ready',      color: Colors.success, bg: Colors.successLight },
    { next: 'waiting', label: '↩ Back to Waiting',  color: Colors.warning, bg: Colors.warningLight },
  ],
  'ready': [
    { next: 'completed',  label: '✅ Complete',        color: Colors.success, bg: Colors.successLight },
    { next: 'in-service', label: '↩ Back to Service',  color: Colors.info,    bg: Colors.infoLight },
  ],
  'completed': [],
  'cancelled': [],
};

export default function VehiclesScreen({ navigation }: any) {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { can } = usePermissions();
  const canCreate = can('services.create');
  const canUpdateStatus = can('services.updateStatus');
  const canDelete = can('services.delete');

  const fetchServices = async () => {
    try {
      const params: any = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      if (search) params.search = search;
      const res = await vehicleApi.getServices(params);
      setServices(res.data.services || []);
      const counts: Record<string, number> = { all: 0 };
      (res.data.statusCounts || []).forEach((row: any) => {
        counts[row.status] = parseInt(row.count);
        counts.all = (counts.all || 0) + parseInt(row.count);
      });
      setStatusCounts(counts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchServices(); }, [activeFilter]));

  const updateStatus = async (id: string, status: string) => {
    try {
      await vehicleApi.updateServiceStatus(id, { status });
      fetchServices();
    } catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Cancel Service', `Cancel service for ${item.make} ${item.model}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Service', style: 'destructive', onPress: async () => { try { await vehicleApi.updateServiceStatus(item.id, { status: 'cancelled' }); fetchServices(); } catch { } } }
    ]);
  };

  const navigateToInvoice = (item: any) => {
    navigation.navigate('AddInvoice', {
      customerId: item.customerId ?? item.customer_id ?? '',
      customerName: item.customerName ?? item.customer_name ?? '',
      serviceDescription: item.serviceName ?? item.service_name ?? '',
      serviceId: item.id,
      estimatedCost: item.totalCost ?? item.total_cost ?? 0,
      vehicleInfo: `${item.make} ${item.model} ${item.year} — ${item.licensePlate ?? item.license_plate ?? ''}`.trim(),
    });
  };

  const handleComplete = async (item: any) => {
    try {
      await vehicleApi.updateServiceStatus(item.id, { status: 'completed' });
      fetchServices();
      navigateToInvoice(item);
    } catch {
      Alert.alert('Error', 'Failed to complete service');
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const actions = STATUS_ACTIONS[item.status] || [];
    const cost = parseFloat(String(item.totalCost ?? item.total_cost ?? 0));

    return (
      <View style={[styles.card, Shadow.sm]}>
        {/* Vehicle + status */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{item.make} {item.model} {item.year}</Text>
            <Text style={styles.plate}>{item.licensePlate ?? item.license_plate}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.divider} />

        {/* Service details */}
        <Text style={styles.serviceName}>{item.serviceName ?? item.service_name}</Text>
        <Text style={styles.info}>👤 {item.customerName ?? item.customer_name}</Text>
        {(item.technicianName ?? item.technician_name) ? <Text style={styles.info}>🔧 {item.technicianName ?? item.technician_name}</Text> : null}
        <Text style={styles.info}>📅 {safeDate(item.checkedInAt ?? item.checked_in_at)}</Text>

        {cost > 0 && (
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Estimated Cost</Text>
            <Text style={styles.costValue}>{fmtKip(cost)}</Text>
          </View>
        )}

        {/* Status action buttons */}
        {canUpdateStatus && actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map(a => {
              // Complete button → mark done then open AddInvoice
              if (a.next === 'completed') {
                return (
                  <TouchableOpacity
                    key={a.next}
                    style={[styles.actionBtn, { backgroundColor: a.bg }]}
                    onPress={() => handleComplete(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={a.next}
                  style={[styles.actionBtn, { backgroundColor: a.bg }]}
                  onPress={() => updateStatus(item.id, a.next)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
            {canDelete && item.status !== 'completed' && item.status !== 'cancelled' && (
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.status === 'completed' && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneText}>✅ Service Completed</Text>
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() => navigateToInvoice(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.invoiceBtnText}>🧾 Create Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Vehicles & Services</Text>
          <Text style={styles.subtitle}>Track and manage vehicle services</Text>
        </View>
        {canCreate && (
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.navigate('SellParts')}>
              <Text style={styles.sellBtnText}>🛒 Sell Parts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('AddVehicle')}>
              <Text style={styles.outlineBtnText}>🚗 Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filledBtn} onPress={() => navigation.navigate('AddService')}>
              <Text style={styles.filledBtnText}>+ Service</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Search by make, model, plate..." placeholderTextColor={Colors.textTertiary} value={search} onChangeText={setSearch} onSubmitEditing={fetchServices} returnKeyType="search" />
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS} keyExtractor={i => i}
        contentContainerStyle={{ paddingHorizontal: Spacing.base }}
        style={{ flexGrow: 0, marginBottom: Spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.chip, activeFilter === item && styles.chipActive]} onPress={() => setActiveFilter(item)}>
            <Text style={[styles.chipText, activeFilter === item && styles.chipTextActive]}>
              {item.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              {statusCounts[item] !== undefined ? ` (${statusCounts[item]})` : ''}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      <FlatList
        data={services} keyExtractor={i => i.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchServices(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="🚗" title="No services found" subtitle="Add a new vehicle service to get started"
            actionLabel={canCreate ? '+ Add Service' : undefined}
            onAction={canCreate ? () => navigation.navigate('AddService') : undefined}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, gap: 8 },
  title: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  headerBtns: { flexDirection: 'row', gap: 6 },
  sellBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.success },
  sellBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  outlineBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.primary },
  outlineBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  filledBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  filledBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  searchRow: { paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, marginRight: 8, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  listContent: { padding: Spacing.base, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  vehicleName: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  plate: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 3, backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  serviceName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  info: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 3 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  costLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  costValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.success },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },
  delBtn: { width: 44, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.dangerLight },
  doneBanner: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, alignItems: 'center', gap: 10 },
  doneText: { fontSize: Typography.base, fontWeight: '700', color: Colors.success },
  invoiceBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  invoiceBtnText: { fontSize: Typography.sm, fontWeight: '700', color: '#fff' },
});
