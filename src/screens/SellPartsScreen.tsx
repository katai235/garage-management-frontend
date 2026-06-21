import { useLanguageStore } from '../store/languageStore';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { stockApi, customerApi, invoiceApi } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { LoadingState } from '../components/UI';

const fmtKip = (v: any) => {
  const n = parseFloat(String(v || 0));
  if (isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toLocaleString('en-US');
};

interface CartItem {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  quantity: number;
  maxQty: number;
  category: string;
}

export default function SellPartsScreen({ navigation }: any) {
  const { t } = useLanguageStore();
  const [step, setStep]                 = useState<'browse' | 'cart' | 'customer'>('browse');
  const [items, setItems]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [customers, setCustomers]       = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);

  const fetchStock = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await stockApi.getAll(params);
      // Only show in-stock items
      const available = (res.data.items || []).filter((i: any) => i.quantity > 0);
      setItems(available);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStock(); }, []));

  const customerSearchSeq = React.useRef(0);
  const searchCustomers = async (q: string) => {
    if (q.length < 1) { setCustomers([]); return; }
    const seq = ++customerSearchSeq.current;
    try {
      const res = await customerApi.getAll({ search: q });
      // Ignore this result if a newer search has started since
      if (seq !== customerSearchSeq.current) return;
      setCustomers(res.data.customers || []);
    } catch {}
  };

  // ── Cart logic ─────────────────────────────────────────────────────
  const addToCart = (item: any) => {
    const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;
    const maxQty = item.quantity;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        if (existing.quantity >= maxQty) {
          Alert.alert('Max Quantity', `Only ${maxQty} units available.`);
          return prev;
        }
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, sku: item.sku, sellingPrice, quantity: 1, maxQty, category: item.category }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const updateCartQty = (id: string, qty: number) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (qty < 1) return c;
      if (qty > c.maxQty) { Alert.alert('Max Quantity', `Only ${c.maxQty} units available.`); return c; }
      return { ...c, quantity: qty };
    }));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.sellingPrice * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const getCartQty = (id: string) => cart.find(c => c.id === id)?.quantity || 0;

  // ── Checkout ────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { Alert.alert('Empty Cart', 'Add items to cart first.'); return; }
    setCheckingOut(true);
    try {
      // 1. Deduct stock for each item
      const lowStockWarnings: string[] = [];
      for (const c of cart) {
        await stockApi.adjust(c.id, { type: 'remove', quantity: c.quantity, notes: 'Sold via parts sale' });
        // Check if now low/out
        const stockItem = items.find(i => i.id === c.id);
        const newQty = (stockItem?.quantity || 0) - c.quantity;
        const reorderLevel = stockItem?.reorderLevel ?? stockItem?.reorder_level ?? 0;
        if (newQty <= reorderLevel && newQty > 0) lowStockWarnings.push(`${c.name} is low (${newQty} left)`);
        if (newQty === 0) lowStockWarnings.push(`${c.name} is now out of stock`);
      }

      // 2. Create invoice — customerId is optional for parts sales
      const invoiceItems = cart.map(c => ({
        description: `${c.name} (SKU: ${c.sku})`,
        quantity: c.quantity,
        unitPrice: c.sellingPrice,
        type: 'part',
      }));

      const invoicePayload: any = {
        items:          invoiceItems,
        taxRate:        0,
        discountAmount: 0,
        notes:          'Parts sale',
      };
      // Only include customerId if one was selected
      if (selectedCustomer?.id) {
        invoicePayload.customerId = selectedCustomer.id;
      }

      const invoiceRes = await invoiceApi.create(invoicePayload);

      // 3. Warn about low stock
      if (lowStockWarnings.length > 0) {
        Alert.alert('⚠️ Stock Warning', lowStockWarnings.join('\n'));
      }

      // 4. Navigate to receipt
      const invoice = invoiceRes.data;
      // Add items to invoice object for receipt display
      invoice.items = invoiceItems;
      if (selectedCustomer) {
        invoice.customerName = selectedCustomer.full_name || selectedCustomer.fullName;
        invoice.customerPhone = selectedCustomer.phone;
      }

      Alert.alert(
        t('saleComplete'),
        `${cartCount} item(s) sold. Invoice created.`,
        [
          {
            text: t('view') + ' Receipt',
            onPress: () => {
              setCart([]);
              setSelectedCustomer(null);
              setStep('browse');
              navigation.navigate('Receipt', { invoice });
            },
          },
          {
            text: t('view') + ' Invoice',
            onPress: () => {
              setCart([]);
              setSelectedCustomer(null);
              setStep('browse');
              navigation.navigate('InvoiceView', { invoice });
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Checkout failed. Please try again.');
    } finally { setCheckingOut(false); }
  };

  // ── Render stock item ───────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => {
    const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;
    const qty = item.quantity;
    const inCart = getCartQty(item.id);
    const isLow = item.status === 'low-stock';

    return (
      <View style={[styles.itemCard, Shadow.sm]}>
        <View style={styles.itemTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.itemTagRow}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <Text style={styles.skuText}>SKU: {item.sku}</Text>
              {isLow && <View style={styles.lowBadge}><Text style={styles.lowBadgeText}>⚠️ Low</Text></View>}
            </View>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceText}>{fmtKip(sellingPrice)}</Text>
            <Text style={styles.stockText}>{qty} left</Text>
          </View>
        </View>

        {/* Add to cart controls */}
        <View style={styles.itemActions}>
          {inCart > 0 ? (
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => inCart === 1 ? removeFromCart(item.id) : updateCartQty(item.id, inCart - 1)}>
                <Text style={styles.qtyBtnText}>{inCart === 1 ? '🗑️' : '−'}</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{inCart}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.inCartText}>{t('inCart')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
              <Text style={styles.addBtnText}>{t('addToCart')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── BROWSE STEP ─────────────────────────────────────────────────────
  // NOTE: this is a plain function that RETURNS JSX, not a component.
  // Defining it as `const BrowseStep = () => (...)` and rendering
  // <BrowseStep /> would make React treat it as a brand-new component
  // type on every parent re-render (since the function reference changes
  // every render), forcing React Native to unmount + remount the whole
  // subtree — including the customer search dropdown's TextInput. That
  // teardown mid-keystroke is what caused "Trying to add unknown view tag".
  // Calling renderBrowseStep() directly avoids the remount entirely.
  const renderBrowseStep = () => (
    <>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('Searchparts')}
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchStock}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading
        ? <LoadingState />
        : <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>{t('noStockItems')}</Text>
              </View>
            }
          />
      }
    </>
  );

  // ── CART STEP ────────────────────────────────────────────────────────
  const renderCartStep = () => (
    <FlatList
      data={cart}
      keyExtractor={c => c.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Text style={styles.cartHeader}>{t('cart')} ({cartCount} items)</Text>
      }
      renderItem={({ item: c }) => (
        <View style={[styles.cartCard, Shadow.sm]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartName}>{c.name}</Text>
            <Text style={styles.cartSku}>SKU: {c.sku}</Text>
            <Text style={styles.cartPrice}>{fmtKip(c.sellingPrice)} each</Text>
          </View>
          <View style={styles.cartRight}>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => c.quantity === 1 ? removeFromCart(c.id) : updateCartQty(c.id, c.quantity - 1)}>
                <Text style={styles.qtyBtnText}>{c.quantity === 1 ? '🗑️' : '−'}</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{c.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(c.id, c.quantity + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cartLineTotal}>{fmtKip(c.sellingPrice * c.quantity)}</Text>
          </View>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.cartFooter}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{fmtKip(cartTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setStep('customer')}>
            <Text style={styles.checkoutBtnText}>Continue to Checkout →</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>{t('emptyCart')}</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => setStep('browse')}>
            <Text style={styles.browseBtnText}>{t('browseParts')}</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );

  // ── CUSTOMER STEP ────────────────────────────────────────────────────
  const renderCustomerStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
          <View>
            {/* Order summary */}
            <View style={[styles.summaryCard, Shadow.sm]}>
              <Text style={styles.sectionTitle}>{t('orderSummary')}</Text>
              {cart.map(c => (
                <View key={c.id} style={styles.summaryRow}>
                  <Text style={styles.summaryName} numberOfLines={1}>{c.name} × {c.quantity}</Text>
                  <Text style={styles.summaryAmt}>{fmtKip(c.sellingPrice * c.quantity)}</Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryName, { fontWeight: '800', color: Colors.textPrimary }]}>Total</Text>
                <Text style={[styles.summaryAmt, { fontWeight: '800', color: Colors.primary, fontSize: Typography.lg }]}>{fmtKip(cartTotal)}</Text>
              </View>
            </View>

            {/* Customer selection */}
            <View style={[styles.customerCard, Shadow.sm]}>
              <Text style={styles.sectionTitle}>{t('CustomerOptional')}</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => { setShowCustomerDrop(!showCustomerDrop); setCustomerSearch(''); }}
              >
                <Text style={selectedCustomer ? styles.selectText : styles.placeholderText}>
                  {selectedCustomer ? `👤 ${selectedCustomer.full_name || selectedCustomer.fullName}` : t('Searchcustomer')}
                </Text>
              </TouchableOpacity>
              {selectedCustomer && (
                <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>{t('Removecustomer')}</Text>
                </TouchableOpacity>
              )}
              {showCustomerDrop && (
                <View style={styles.dropdown}>
                  <TextInput
                    style={styles.dropdownInput}
                    placeholder={t('Typenameorphone')}
                    placeholderTextColor={Colors.textTertiary}
                    value={customerSearch}
                    onChangeText={val => { setCustomerSearch(val); searchCustomers(val); }}
                    autoFocus
                  />
                  {customers.map(c => (
                    <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch(''); }}>
                      <Text style={styles.dropdownName}>{c.full_name || c.fullName}</Text>
                      <Text style={styles.dropdownSub}>{c.phone}</Text>
                    </TouchableOpacity>
                  ))}
                  {customers.length === 0 && customerSearch.length > 1 && (
                    <Text style={styles.noResult}>{t('noCustomers')}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmBtn, checkingOut && { opacity: 0.6 }]}
              onPress={handleCheckout}
              disabled={checkingOut}
            >
              <Text style={styles.confirmBtnText}>
                {checkingOut ? '⏳ Processing...' : `${t('confirmSale')} — ${fmtKip(cartTotal)}`}
              </Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (step === 'customer') setStep('cart');
          else if (step === 'cart') setStep('browse');
          else navigation.goBack();
        }}>
          <Text style={styles.backBtn}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {step === 'browse' ? t('sellPartsTitle') : step === 'cart' ? t('cart') : t('checkout')}
        </Text>
        {/* Cart badge — hidden on browse, replaced by floating button */}
        {step !== 'browse' && cart.length > 0 && (
          <TouchableOpacity style={styles.cartBadge} onPress={() => setStep('cart')}>
            <Text style={styles.cartBadgeText}>🛒 {cartCount}</Text>
          </TouchableOpacity>
        )}
        {(step !== 'browse' || cart.length === 0) && step === 'browse' ? <View style={{ width: 60 }} /> : null}
        {step !== 'browse' ? <View style={{ width: 60 }} /> : null}
      </View>

      {/* Step tabs */}
      <View style={styles.stepBar}>
        {(['browse', 'cart', 'customer'] as const).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, (step === 'cart' && i === 0) || (step === 'customer' && i < 2) ? styles.stepDotDone : null]}>
              <Text style={[styles.stepDotText, step === s && styles.stepDotTextActive]}>
                {(step === 'cart' && i === 0) || (step === 'customer' && i < 2) ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
              {s === 'browse' ? t('browse') : s === 'cart' ? t('cart') : t('checkout')}
            </Text>
          </View>
        ))}
      </View>

      {step === 'browse'   && renderBrowseStep()}
      {step === 'cart'     && renderCartStep()}
      {step === 'customer' && renderCustomerStep()}
      {/* Floating cart button - only on browse step */}
      {step === 'browse' && cart.length > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => setStep('cart')} activeOpacity={0.9}>
          <View style={styles.floatingCartLeft}>
            <View style={styles.floatingCartBadge}>
              <Text style={styles.floatingCartBadgeText}>{cartCount}</Text>
            </View>
            <Text style={styles.floatingCartText}>{t('viewCart')}</Text>
          </View>
          <Text style={styles.floatingCartTotal}>{fmtKip(cartTotal)}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:        { fontSize: 17, color: Colors.primary, fontWeight: '600', width: 60 },
  title:          { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  cartBadge:      { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  cartBadgeText:  { color: '#fff', fontWeight: '700', fontSize: Typography.sm },

  // Step bar
  stepBar:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 24 },
  stepItem:       { alignItems: 'center', gap: 4 },
  stepDot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:  { backgroundColor: Colors.primary },
  stepDotDone:    { backgroundColor: Colors.success },
  stepDotText:    { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  stepDotTextActive: { color: '#fff' },
  stepLabel:      { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  stepLabelActive:{ color: Colors.primary },

  // Search
  searchRow:      { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: 8, ...Shadow.sm },
  searchInput:    { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },

  listContent:    { padding: Spacing.base, paddingBottom: 100 },

  // Stock item card
  itemCard:       { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  itemTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: Spacing.sm },
  itemName:       { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  itemTagRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryTag:    { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  categoryText:   { fontSize: Typography.xs, color: Colors.info, fontWeight: '600' },
  skuText:        { fontSize: Typography.xs, color: Colors.textTertiary },
  lowBadge:       { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  lowBadgeText:   { fontSize: Typography.xs, color: '#d97706', fontWeight: '700' },
  priceBox:       { alignItems: 'flex-end' },
  priceText:      { fontSize: Typography.md, fontWeight: '800', color: Colors.success },
  stockText:      { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  itemActions:    { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  addBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  addBtnText:     { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
  qtyRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
  qtyBtnText:     { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  qtyNum:         { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  inCartText:     { fontSize: Typography.xs, color: Colors.success, fontWeight: '600' },

  // Cart
  cartHeader:     { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  cartCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md, gap: 12 },
  cartName:       { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  cartSku:        { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 2 },
  cartPrice:      { fontSize: Typography.sm, color: Colors.textSecondary },
  cartRight:      { alignItems: 'flex-end', gap: 8 },
  cartLineTotal:  { fontSize: Typography.base, fontWeight: '800', color: Colors.success },
  cartFooter:     { marginTop: Spacing.md },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm },
  totalLabel:     { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  totalValue:     { fontSize: Typography.xl, fontWeight: '900', color: Colors.primary },
  checkoutBtn:    { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnText:{ color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  // Empty
  emptyBox:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  browseBtn:      { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText:  { color: '#fff', fontWeight: '700' },

  // Customer step
  summaryCard:    { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle:   { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryName:    { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  summaryAmt:     { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  summaryDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  customerCard:   { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  selectBtn:      { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectText:     { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText:{ fontSize: Typography.base, color: Colors.textTertiary },
  clearBtn:       { marginTop: 6, alignSelf: 'flex-start' },
  clearBtnText:   { fontSize: Typography.xs, color: Colors.danger, fontWeight: '600' },
  dropdown:       { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownInput:  { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem:   { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownName:   { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownSub:    { fontSize: Typography.sm, color: Colors.textSecondary },
  noResult:       { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center' },
  confirmBtn:     { backgroundColor: Colors.success, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  confirmBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  // Floating cart button
  floatingCart:       { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadow.md },
  floatingCartLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  floatingCartBadge:  { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  floatingCartBadgeText: { color: '#fff', fontWeight: '900', fontSize: Typography.sm },
  floatingCartText:   { color: '#fff', fontWeight: '700', fontSize: Typography.base },
  floatingCartTotal:  { color: '#fff', fontWeight: '900', fontSize: Typography.lg },
});
