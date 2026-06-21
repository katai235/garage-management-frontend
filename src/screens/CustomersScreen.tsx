import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { customerApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';
import { Customer } from '../types';
import { useLanguageStore } from '../store/languageStore';

const formatCurrency = (v: number) => {
  if (!v || isNaN(v)) return '₭0';
  return '₭' + Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (dateStr: any): string => {
  try {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const getInitial = (name: any): string => {
  if (!name || typeof name !== 'string') return '?';
  return name.charAt(0).toUpperCase();
};

export default function CustomersScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = usePermissions();
  const { t } = useLanguageStore();

  const fetchCustomers = async (searchTerm = search) => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      const response = await customerApi.getAll(params);
      const data = response.data.customers || [];
      setCustomers(data);
      setSummary({
        total: response.data.total || 0,
        active: data.filter((c: Customer) => c.status === 'active').length,
        revenue: data.reduce((sum: number, c: Customer) => sum + (Number(c.totalSpent) || 0), 0),
      });
    } catch (error) {
      console.error('Fetch customers error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCustomers(); }, []));

  const handleDelete = (customer: Customer) => {
    Alert.alert(
      t('deleteCustomer'),
      `${t('deleteCustomerMsg')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await customerApi.update(customer.id, { status: 'inactive' });
              fetchCustomers();
            } catch {
              Alert.alert(t('error'), t('error'));
            }
          }
        }
      ]
    );
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[styles.card, Shadow.sm]}
      onPress={() => navigation.navigate('EditCustomer', { customer: item })}
      activeOpacity={0.9}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitial(item.fullName)}</Text>
        </View>
        <View style={styles.customerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.fullName || 'Unknown'}</Text>
            <StatusBadge status={item.status || 'active'} />
          </View>
          {item.phone ? <Text style={styles.phone}>📞 {item.phone}</Text> : null}
          {item.email ? <Text style={styles.email}>✉️ {item.email}</Text> : null}
          {item.address ? <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text> : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>{t('totalSpent')}</Text>
          <Text style={styles.footerValue}>{formatCurrency(item.totalSpent || 0)}</Text>
        </View>
        {item.vehicleCount !== undefined && (
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>{t('vehicle')}</Text>
            <Text style={styles.footerValue}>{item.vehicleCount}</Text>
          </View>
        )}
        {item.lastVisit ? (
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>{t('lastVisit')}</Text>
            <Text style={styles.footerDate}>{formatDate(item.lastVisit)}</Text>
          </View>
        ) : null}
      </View>

      {/* CRUD Actions - only for admin/manager */}
      {can('customers.edit') && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha }]}
            onPress={() => navigation.navigate('EditCustomer', { customer: item })}
          >
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>✏️ {t('edit')}</Text>
          </TouchableOpacity>
          {can('customers.delete') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.dangerLight }]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️ {t('delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('customers')}</Text>
          <Text style={styles.subtitle}>{t('customersSubtitle')}</Text>
        </View>
        {can('customers.create') && (
          <Button title={t('add')} onPress={() => navigation.navigate('AddCustomer')} size="sm" />
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{summary.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={[styles.statValue, { color: Colors.primary, fontSize: Typography.base }]}>
            {formatCurrency(summary.revenue)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Text>🔍</Text>
          <TextInput
            style={styles.searchText}
            placeholder={t('search')}
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchCustomers(search)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchCustomers(''); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="👥" title={t('noCustomers')}
            subtitle={t('addFirstCustomer')}
            actionLabel={can('customers.create') ? t('addCustomer') : undefined}
            onAction={can('customers.create') ? () => navigation.navigate('AddCustomer') : undefined}
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
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 8, marginBottom: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  searchRow: { paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchText: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  clearBtn: { fontSize: 16, color: Colors.textTertiary, padding: 4 },
  listContent: { padding: Spacing.base, paddingTop: 0 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primaryAlpha, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography.xl, fontWeight: '700', color: Colors.primary },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  phone: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  email: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  address: { fontSize: Typography.sm, color: Colors.textTertiary },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: 16 },
  footerItem: {},
  footerLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 2 },
  footerValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  footerDate: { fontSize: Typography.base, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },
});
