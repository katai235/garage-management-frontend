import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supplierApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';
import { Supplier } from '../types';
import { useLanguageStore } from '../store/languageStore';

const getInitial = (name: any): string => {
  if (!name || typeof name !== 'string') return '?';
  return name.charAt(0).toUpperCase();
};

export default function SuppliersScreen({ navigation }: any) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = usePermissions();
  const { t } = useLanguageStore();

  const fetchSuppliers = async (searchTerm = search) => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      const response = await supplierApi.getAll(params);
      const data = response.data.suppliers || [];
      setSuppliers(data);
      setSummary({
        total: parseInt(response.data.summary?.total_suppliers) || 0,
        active: parseInt(response.data.summary?.active_suppliers) || 0,
      });
    } catch (error) {
      console.error('Fetch suppliers error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchSuppliers(); }, []));

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(
      t('deleteSupplier'),
      t('deleteSupplierMsg'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const res = await supplierApi.delete(supplier.id);
              if (res.data?.deactivated) {
                Alert.alert(t('supplierDeactivated'), res.data.message);
              }
              fetchSuppliers();
            } catch {
              Alert.alert(t('error'), t('failedDeleteSupplier'));
            }
          }
        }
      ]
    );
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={[styles.card, Shadow.sm]}
      onPress={() => navigation.navigate('EditSupplier', { supplier: item })}
      activeOpacity={0.9}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitial(item.companyName)}</Text>
        </View>
        <View style={styles.supplierInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.companyName || 'Unknown'}</Text>
            <StatusBadge status={item.isActive ? 'active' : 'inactive'} />
          </View>
          {item.contactPerson ? <Text style={styles.contact}>👤 {item.contactPerson}</Text> : null}
          {item.phone ? <Text style={styles.phone}>📞 {item.phone}</Text> : null}
          {item.email ? <Text style={styles.email}>✉️ {item.email}</Text> : null}
          {item.address ? <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text> : null}
        </View>
      </View>

      {item.stockItemCount !== undefined && (
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>{t('itemsSupplied')}</Text>
            <Text style={styles.footerValue}>{item.stockItemCount}</Text>
          </View>
        </View>
      )}

      {can('suppliers.edit') && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha }]}
            onPress={() => navigation.navigate('EditSupplier', { supplier: item })}
          >
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>✏️ {t('edit')}</Text>
          </TouchableOpacity>
          {can('suppliers.delete') && (
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
          <Text style={styles.title}>{t('suppliers')}</Text>
          <Text style={styles.subtitle}>{t('suppliersSubtitle')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.reportLinkBtn}
            onPress={() => navigation.navigate('GoodsReceivedReport')}
          >
            <Text style={styles.reportLinkText}>📥 {t('goodsReceivedReport')}</Text>
          </TouchableOpacity>
          {can('suppliers.create') && (
            <Button title={t('add')} onPress={() => navigation.navigate('AddSupplier')} size="sm" />
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>{t('total')}</Text>
        </View>
        <View style={[styles.statBox, Shadow.sm]}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{summary.active}</Text>
          <Text style={styles.statLabel}>{t('active')}</Text>
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
            onSubmitEditing={() => fetchSuppliers(search)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchSuppliers(''); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.id}
        renderItem={renderSupplier}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSuppliers(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="🚚" title={t('noSuppliers')}
            subtitle={t('addFirstSupplier')}
            actionLabel={can('suppliers.create') ? t('addSupplier') : undefined}
            onAction={can('suppliers.create') ? () => navigation.navigate('AddSupplier') : undefined}
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
  supplierInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  contact: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  phone: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  email: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  address: { fontSize: Typography.sm, color: Colors.textTertiary },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: 16 },
  footerItem: {},
  footerLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 2 },
  footerValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },
  reportLinkBtn: { backgroundColor: Colors.infoLight, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  reportLinkText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.info },
});
