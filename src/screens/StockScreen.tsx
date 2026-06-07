import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { stockApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';

const CATEGORIES = ['all','parts','oils','filters','tires','tools','supplies'];

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function StockScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { can } = usePermissions();
  const canCreate = can('stock.create');
  const canEdit = can('stock.edit');
  const canDelete = can('stock.delete');
  const canAdjust = can('stock.adjust');

  const fetchStock = async () => {
    try {
      const params: any = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (search) params.search = search;
      const res = await stockApi.getAll(params);
      setItems(res.data.items || []);
      setSummary(res.data.summary || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStock(); }, [activeCategory]));

  const handleDelete = (item: any) => {
    Alert.alert(
      '🗑️ Delete Item',
      `Are you sure you want to delete "${item.name}" (SKU: ${item.sku}) from inventory?\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await stockApi.delete(item.id);
              fetchStock();
            } catch (e: any) {
              const msg = e.response?.data?.error || 'Failed to delete item. Please try again.';
              Alert.alert('Error', msg);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const costPrice = item.costPrice ?? item.cost_price ?? 0;
    const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;
    const reorderLevel = item.reorderLevel ?? item.reorder_level ?? 0;
    const status = item.status || 'in-stock';

    return (
      <View style={[styles.card, Shadow.sm]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <StatusBadge status={status} />
          </View>
          <View style={styles.tagsRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.sku}>SKU: {item.sku}</Text>
          </View>
        </View>

        {/* Grid info */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Supplier</Text>
            <Text style={styles.gridValue}>{item.supplier || '—'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Quantity</Text>
            <Text style={[styles.gridValue, status !== 'in-stock' && { color: Colors.warning }]}>
              {item.quantity} Units
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Reorder Level</Text>
            <Text style={styles.gridValue}>{reorderLevel} Units</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Location</Text>
            <Text style={styles.gridValue}>{item.location || '—'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Cost Price</Text>
            <Text style={styles.gridValue}>{fmtKip(costPrice)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Selling Price</Text>
            <Text style={[styles.gridValue, { color: Colors.success, fontWeight: '700' }]}>{fmtKip(sellingPrice)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {canAdjust && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha }]} onPress={() => navigation.navigate('AdjustStock', { item })}>
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>⚙️ Adjust</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successLight }]} onPress={() => navigation.navigate('EditStockItem', { item })}>
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
          {/* View / screenshot card — available to everyone */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border, flex: 0, width: 44 }]}
            onPress={() => navigation.navigate('StockItemView', { item })}
          >
            <Text style={styles.actionBtnText}>📄</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.dangerLight, flex: 0, width: 44 }]} onPress={() => handleDelete(item)}>
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text>
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
          <Text style={styles.title}>Stock & Inventory</Text>
          <Text style={styles.subtitle}>Manage parts, supplies, and levels</Text>
        </View>
        {canCreate && (
          <Button title="+ Add" onPress={() => navigation.navigate('AddStockItem')} size="sm" />
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Total Items', value: summary.total_items || 0, color: Colors.primary },
          { label: 'Low Stock', value: summary.low_stock || 0, color: Colors.warning },
          { label: 'Out of Stock', value: summary.out_of_stock || 0, color: Colors.danger },
          { label: 'Total Value', value: fmtKip(parseFloat(summary.total_value || 0)), color: Colors.success },
        ].map(s => (
          <View key={s.label} style={[styles.summaryCard, Shadow.sm]}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Category filter */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={CATEGORIES} keyExtractor={i => i}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0, marginBottom: Spacing.sm }}
        renderItem={({ item: cat }) => (
          <TouchableOpacity style={[styles.chip, activeCategory === cat && styles.chipActive]} onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Search by name, SKU, supplier..." placeholderTextColor={Colors.textTertiary} value={search} onChangeText={setSearch} onSubmitEditing={fetchStock} returnKeyType="search" />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={items} keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="📦" title="No stock items"
            subtitle="Add your first inventory item"
            actionLabel={canCreate ? '+ Add Stock Item' : undefined}
            onAction={canCreate ? () => navigation.navigate('AddStockItem') : undefined}
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
  filterRow: { paddingHorizontal: Spacing.base, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  searchRow: { paddingHorizontal: Spacing.base, marginVertical: Spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  listContent: { padding: Spacing.base, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardHeader: { marginBottom: Spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  itemName: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryTag: { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryText: { fontSize: Typography.xs, color: Colors.info, fontWeight: '600' },
  sku: { fontSize: Typography.xs, color: Colors.textTertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginBottom: Spacing.md },
  gridItem: { width: '50%', marginBottom: Spacing.md, paddingRight: 8 },
  gridLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 2 },
  gridValue: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  actionsRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },
});
