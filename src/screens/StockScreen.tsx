import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { stockApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useLanguageStore } from '../store/languageStore';

const CATEGORIES = ['all','parts','oils','filters','tires','tools','supplies'];
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.base * 2 - 10) / 2;

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:3000';

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'in-stock':     { bg: '#d1fae5', text: '#065f46' },
  'low-stock':    { bg: '#fef3c7', text: '#92400e' },
  'out-of-stock': { bg: '#fee2e2', text: '#991b1b' },
};

const CATEGORY_ICONS: Record<string, string> = {
  parts:'🔩', oils:'🛢️', filters:'🌀', tires:'🛞', tools:'🔧', supplies:'📦', other:'📋',
};

export default function StockScreen({ navigation }: any) {
  const [items, setItems]               = useState<any[]>([]);
  const [summary, setSummary]           = useState<any>({});
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useState<'list' | 'grid'>('list');
  const { can } = usePermissions();
  const { t } = useLanguageStore();
  const canCreate = can('stock.create');
  const canEdit   = can('stock.edit');
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
    Alert.alert('🗑️ Delete Item',
      `Delete "${item.name}" (${item.sku}) from inventory?\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await stockApi.delete(item.id); fetchStock(); }
          catch (e: any) { Alert.alert('Error', e.response?.data?.error || 'Failed to delete.'); }
        }},
      ]
    );
  };

  const getImageUri = (item: any) => {
    const url = item.imageUrl || item.image_url;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  // ── LIST CARD ─────────────────────────────────────────────────────
  const renderListItem = ({ item }: { item: any }) => {
    const costPrice    = item.costPrice    ?? item.cost_price    ?? 0;
    const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;
    const reorderLevel = item.reorderLevel ?? item.reorder_level ?? 0;
    const status       = item.status || 'in-stock';
    const imageUri     = getImageUri(item);

    return (
      <View style={[styles.listCard, Shadow.sm]}>
        <View style={styles.listCardTop}>
          {/* Image or icon */}
          <View style={styles.listImage}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.listImageImg} resizeMode="cover" />
              : <Text style={styles.listImageIcon}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <StatusBadge status={status} />
            </View>
            <View style={styles.tagsRow}>
              <View style={styles.categoryTag}><Text style={styles.categoryText}>{item.category}</Text></View>
              <Text style={styles.sku}>{t('sku')}: {item.sku}</Text>
            </View>
          </View>
        </View>

        <View style={styles.listGrid}>
          {[
            { label: t('supplier'),      value: item.supplier || '—' },
            { label: t('quantity'),      value: `${item.quantity} Units`, warn: status !== 'in-stock' },
            { label: t('reorderLevel'), value: `${reorderLevel} Units` },
            { label: t('location'),      value: item.location || '—' },
            { label: t('costPrice'),    value: fmtKip(costPrice) },
            { label: t('sellingPrice'), value: fmtKip(sellingPrice), green: true },
          ].map(g => (
            <View key={g.label} style={styles.gridItem}>
              <Text style={styles.gridLabel}>{g.label}</Text>
              <Text style={[styles.gridValue, g.warn && { color: Colors.warning }, g.green && { color: Colors.success, fontWeight: '700' }]}>{g.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          {canAdjust && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha }]} onPress={() => navigation.navigate('AdjustStock', { item })}><Text style={[styles.actionBtnText, { color: Colors.primary }]}>⚙️ Adjust</Text></TouchableOpacity>}
          {canEdit   && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successLight }]} onPress={() => navigation.navigate('EditStockItem', { item })}><Text style={[styles.actionBtnText, { color: Colors.success }]}>✏️ Edit</Text></TouchableOpacity>}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border, flex: 0, width: 44 }]} onPress={() => navigation.navigate('StockItemView', { item })}><Text style={styles.actionBtnText}>📄</Text></TouchableOpacity>
          {canDelete && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.dangerLight, flex: 0, width: 44 }]} onPress={() => handleDelete(item)}><Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text></TouchableOpacity>}
        </View>
      </View>
    );
  };

  // ── GRID CARD ─────────────────────────────────────────────────────
  const renderGridItem = ({ item }: { item: any }) => {
    const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;
    const status       = item.status || 'in-stock';
    const imageUri     = getImageUri(item);
    const sc           = STATUS_COLORS[status] || STATUS_COLORS['in-stock'];

    return (
      <TouchableOpacity
        style={[styles.gridCard, Shadow.sm]}
        onPress={() => navigation.navigate('StockItemView', { item })}
        activeOpacity={0.85}
      >
        {/* Photo */}
        <View style={styles.gridCardImage}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.gridCardImageImg} resizeMode="cover" />
            : (
              <View style={styles.gridCardImagePlaceholder}>
                <Text style={styles.gridCardImageIcon}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
              </View>
            )
          }
          {/* Status dot */}
          <View style={[styles.gridStatusDot, { backgroundColor: sc.bg }]}>
            <Text style={[styles.gridStatusDotText, { color: sc.text }]}>
              {status === 'in-stock' ? '✓' : status === 'low-stock' ? '⚠' : '✕'}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.gridCardBody}>
          <Text style={styles.gridCardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.gridCardSku}>{t('sku')}: {item.sku}</Text>
          <Text style={styles.gridCardPrice}>{fmtKip(sellingPrice)}</Text>
          <Text style={[styles.gridCardQty, status !== 'in-stock' && { color: Colors.warning }]}>
            {item.quantity} units left
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.gridCardActions}>
          {canAdjust && (
            <TouchableOpacity
              style={styles.gridActionBtn}
              onPress={() => navigation.navigate('AdjustStock', { item })}
            >
              <Text style={styles.gridActionText}>⚙️</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[styles.gridActionBtn, { flex: 1 }]}
              onPress={() => navigation.navigate('EditStockItem', { item })}
            >
              <Text style={styles.gridActionText}>{t('editItem')}</Text>
            </TouchableOpacity>
          )}
          {(status === 'low-stock' || status === 'out-of-stock') && canAdjust && (
            <TouchableOpacity
              style={[styles.gridActionBtn, { backgroundColor: Colors.warningLight ?? '#fef3c7' }]}
              onPress={() => navigation.navigate('AdjustStock', { item })}
            >
              <Text style={[styles.gridActionText, { color: Colors.warning }]}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingState />;

  const lowStockCount = items.filter(i => i.status === 'low-stock' || i.status === 'out-of-stock').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('stock')}</Text>
          <Text style={styles.subtitle}>{t('stockSubtitle')}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* View toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.viewToggleIcon, viewMode === 'list' && styles.viewToggleIconActive]}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={[styles.viewToggleIcon, viewMode === 'grid' && styles.viewToggleIconActive]}>⊞</Text>
            </TouchableOpacity>
          </View>
          {canCreate && <Button title={t('addStockItem')} onPress={() => navigation.navigate('AddStockItem')} size="sm" />}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: t('totalItems'), value: summary.total_items || 0,                              color: Colors.primary },
          { label: t('lowStock'),   value: summary.low_stock || 0,                                color: Colors.warning },
          { label: t('outOfStock'),value: summary.out_of_stock || 0,                             color: Colors.danger },
          { label: t('totalValue'), value: fmtKip(parseFloat(summary.total_value || 0)), color: Colors.success },
        ].map(s => (
          <View key={s.label} style={[styles.summaryCard, Shadow.sm]}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Restock banner */}
      {lowStockCount > 0 && canAdjust && (
        <TouchableOpacity
          style={styles.restockBanner}
          onPress={() => navigation.navigate('RestockScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.restockBannerText}>
            ⚠️ {lowStockCount} item{lowStockCount > 1 ? 's' : ''} need restocking
          </Text>
          <Text style={styles.restockBannerAction}>View →</Text>
        </TouchableOpacity>
      )}

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

      {/* List or Grid */}
      <FlatList
        key={viewMode} // forces re-render when switching
        data={items}
        keyExtractor={item => item.id}
        renderItem={viewMode === 'list' ? renderListItem : renderGridItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="📦" title={t('noStockItems')}
            subtitle={t('stockSubtitle')}
            actionLabel={canCreate ? t('addStockItem') : undefined}
            onAction={canCreate ? () => navigation.navigate('AddStockItem') : undefined}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  title:        { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle:     { fontSize: Typography.sm, color: Colors.textSecondary },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // View toggle
  viewToggle:          { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 3, ...Shadow.sm },
  viewToggleBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm },
  viewToggleBtnActive: { backgroundColor: Colors.primary },
  viewToggleIcon:      { fontSize: 16, color: Colors.textTertiary },
  viewToggleIconActive:{ color: '#fff' },

  // Summary
  summaryRow:   { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 6, marginBottom: Spacing.md },
  summaryCard:  { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: Typography.sm, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center' },

  // Restock banner
  restockBanner:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.base, marginBottom: Spacing.sm, backgroundColor: '#fef3c7', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#f59e0b' },
  restockBannerText:   { fontSize: Typography.sm, fontWeight: '600', color: '#92400e' },
  restockBannerAction: { fontSize: Typography.sm, fontWeight: '800', color: '#d97706' },

  // Filter
  filterRow:    { paddingHorizontal: Spacing.base, gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#fff' },

  // Search
  searchRow:    { paddingHorizontal: Spacing.base, marginVertical: Spacing.md },
  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchInput:  { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },

  listContent:  { padding: Spacing.base, paddingTop: 0, paddingBottom: 100 },

  // ── LIST card ──
  listCard:       { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  listCardTop:    { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  listImage:      { width: 60, height: 60, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  listImageImg:   { width: '100%', height: '100%' },
  listImageIcon:  { fontSize: 28 },
  titleRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  itemName:       { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  tagsRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryTag:    { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryText:   { fontSize: Typography.xs, color: Colors.info, fontWeight: '600' },
  sku:            { fontSize: Typography.xs, color: Colors.textTertiary },
  listGrid:       { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginBottom: Spacing.md },
  gridItem:       { width: '50%', marginBottom: Spacing.md, paddingRight: 8 },
  gridLabel:      { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 2 },
  gridValue:      { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  actionsRow:     { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn:      { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  actionBtnText:  { fontSize: Typography.sm, fontWeight: '700' },

  // ── GRID card ──
  gridRow:                  { gap: 10, paddingHorizontal: Spacing.base, paddingBottom: Spacing.md },
  gridCard:                 { width: CARD_W, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  gridCardImage:            { width: '100%', height: CARD_W * 0.75, backgroundColor: Colors.surfaceSecondary, position: 'relative' },
  gridCardImageImg:         { width: '100%', height: '100%' },
  gridCardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridCardImageIcon:        { fontSize: 40 },
  gridStatusDot:            { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridStatusDotText:        { fontSize: 11, fontWeight: '900' },
  gridCardBody:             { padding: 10 },
  gridCardName:             { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  gridCardSku:              { fontSize: 10, color: Colors.textTertiary, marginBottom: 4 },
  gridCardPrice:            { fontSize: Typography.base, fontWeight: '800', color: Colors.success, marginBottom: 2 },
  gridCardQty:              { fontSize: Typography.xs, color: Colors.textSecondary },
  gridCardActions:          { flexDirection: 'row', gap: 6, padding: 8, paddingTop: 0 },
  gridActionBtn:            { backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.sm, paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  gridActionText:           { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary },
});
