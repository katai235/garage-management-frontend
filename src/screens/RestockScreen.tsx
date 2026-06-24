import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { stockApi } from '../services/api';
import { LoadingState } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:3000';

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const CATEGORY_ICONS: Record<string, string> = {
  parts:'🔩', oils:'🛢️', filters:'🌀', tires:'🛞', tools:'🔧', supplies:'📦', other:'📋',
};

export default function RestockScreen({ navigation }: any) {
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Quick restock qty per item
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [restocking, setRestocking] = useState<string | null>(null);
  const { t } = useLanguageStore();

  const fetchLowStock = async () => {
    try {
      const [low, out] = await Promise.all([
        stockApi.getAll({ status: 'low-stock' }),
        stockApi.getAll({ status: 'out-of-stock' }),
      ]);
      const all = [
        ...(out.data.items || []),  // out-of-stock first
        ...(low.data.items || []),
      ];
      setItems(all);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchLowStock(); }, []));

  const handleQuickRestock = async (item: any) => {
    const qty = parseInt(quantities[item.id] || '0');
    if (!qty || qty <= 0) {
      Alert.alert(t('enterQuantity'), t('enterQuantityMsg'));
      return;
    }
    setRestocking(item.id);
    try {
      await stockApi.adjust(item.id, {
        type: 'add',
        quantity: qty,
        notes: 'Restock',
      });
      Alert.alert(`✅ ${t('restockedSuccess')}`, `${t('added')} ${qty} ${t('units')} ${t('to')} ${item.name}.`);
      setQuantities(prev => ({ ...prev, [item.id]: '' }));
      fetchLowStock();
    } catch (err: any) {
      Alert.alert(t('error'), err.response?.data?.error || t('failedRestock'));
    } finally { setRestocking(null); }
  };

  const renderItem = ({ item }: { item: any }) => {
    const reorderLevel = item.reorderLevel ?? item.reorder_level ?? 0;
    const costPrice    = item.costPrice    ?? item.cost_price    ?? 0;
    const isOut        = item.status === 'out-of-stock';
    const imageUrl     = item.imageUrl || item.image_url;
    const imageUri     = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`) : null;

    return (
      <View style={[styles.card, Shadow.sm, isOut && styles.cardOut]}>
        <View style={styles.cardTop}>
          {/* Image */}
          <View style={styles.itemImage}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.itemImageImg} resizeMode="cover" />
              : <Text style={styles.itemImageIcon}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
            }
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: isOut ? '#fee2e2' : '#fef3c7' }]}>
                <Text style={[styles.statusText, { color: isOut ? '#991b1b' : '#92400e' }]}>
                  {isOut ? `❌ ${t('outOfStockShort')}` : `⚠️ ${t('lowStockShort')}`}
                </Text>
              </View>
            </View>
            <Text style={styles.skuText}>{t('sku')}: {item.sku} · {item.category}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>{t('current')}</Text>
                <Text style={[styles.statValue, { color: isOut ? Colors.danger : Colors.warning }]}>{item.quantity}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>{t('reorderAt')}</Text>
                <Text style={styles.statValue}>{reorderLevel}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>{t('cost')}</Text>
                <Text style={styles.statValue}>{fmtKip(costPrice)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick restock input */}
        <View style={styles.restockRow}>
          <View style={styles.restockInput}>
            <TextInput
              style={styles.qtyInput}
              placeholder={t('qtyToAddPlaceholder')}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={quantities[item.id] || ''}
              onChangeText={v => setQuantities(prev => ({ ...prev, [item.id]: v }))}
            />
          </View>
          <TouchableOpacity
            style={[styles.restockBtn, restocking === item.id && { opacity: 0.6 }]}
            onPress={() => handleQuickRestock(item)}
            disabled={restocking === item.id}
          >
            <Text style={styles.restockBtnText}>
              {restocking === item.id ? '⏳' : `${t('restock')}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => navigation.navigate('AdjustStock', { item })}
          >
            <Text style={styles.adjustBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('restockItems')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <LoadingState />
        : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLowStock(); }} tintColor={Colors.primary} />
            }
            ListHeaderComponent={
              items.length > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    {items.filter(i => i.status === 'out-of-stock').length} {t('outOfStock')} ·{' '}
                    {items.filter(i => i.status === 'low-stock').length} {t('lowStock')}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>{t('allStockGood')}</Text>
                <Text style={styles.emptySub}>{t('noItemsNeedRestock')}</Text>
              </View>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  title:        { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  listContent:  { padding: Spacing.base, paddingBottom: 100 },
  listHeader:   { marginBottom: Spacing.md },
  listHeaderText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },

  card:         { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardOut:      { borderWidth: 1.5, borderColor: '#fca5a5' },
  cardTop:      { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },

  itemImage:    { width: 64, height: 64, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  itemImageImg: { width: '100%', height: '100%' },
  itemImageIcon:{ fontSize: 28 },

  nameRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  itemName:     { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText:   { fontSize: Typography.xs, fontWeight: '700' },
  skuText:      { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 8 },

  statsRow:     { flexDirection: 'row', gap: 8 },
  statChip:     { flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.sm, padding: 6, alignItems: 'center' },
  statLabel:    { fontSize: 9, color: Colors.textTertiary, marginBottom: 2 },
  statValue:    { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },

  restockRow:   { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  restockInput: { flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border },
  qtyInput:     { paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.base, color: Colors.textPrimary },
  restockBtn:   { flex: 2, backgroundColor: Colors.success, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  restockBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
  adjustBtn:    { width: 44, backgroundColor: Colors.primaryAlpha, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  adjustBtnText:{ fontSize: Typography.base },

  emptyBox:     { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:    { fontSize: 56 },
  emptyTitle:   { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary },
  emptySub:     { fontSize: Typography.base, color: Colors.textSecondary },
});
