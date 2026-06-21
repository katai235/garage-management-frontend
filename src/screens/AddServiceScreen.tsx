import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleApi, customerApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

const SERVICE_TYPES = ['Oil Change & Filter','Brake Replacement','Tire Rotation','Full Inspection','Battery Replacement','Air Conditioning Service','Transmission Service','Engine Tune-Up','Other'];

export default function AddServiceScreen({ navigation, route }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useLanguageStore();
  const [form, setForm] = useState({
    customerId: '', customerName: '', vehicleId: '', vehicleDisplay: '',
    serviceName: '', diagnosis: '', internalNotes: '', laborCost: '', partsCost: '',
  });

  useEffect(() => {
    if (route?.params?.customerId) {
      setForm(prev => ({ ...prev, customerId: route.params.customerId, customerName: route.params.customerName || '' }));
      loadVehicles(route.params.customerId);
    }
  }, []);

  const searchCustomers = async (query: string) => {
    try { const res = await customerApi.getAll({ search: query }); setCustomers(res.data.customers || []); } catch (e) {}
  };

  const loadVehicles = async (customerId: string) => {
    try { const res = await vehicleApi.getAll({ customerId }); setVehicles(res.data || []); } catch (e) {}
  };

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerId: c.id, customerName: c.full_name || c.fullName, vehicleId: '', vehicleDisplay: '' }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
    loadVehicles(c.id);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customer = 'Please select a customer';
    if (!form.vehicleId) e.vehicle = 'Please select a vehicle';
    if (!form.serviceName) e.serviceName = 'Please select a service type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await vehicleApi.createService({
        customerId: form.customerId, vehicleId: form.vehicleId,
        serviceName: form.serviceName, diagnosis: form.diagnosis,
        internalNotes: form.internalNotes,
        laborCost: parseFloat(form.laborCost) || 0,
        partsCost: parseFloat(form.partsCost) || 0,
      });
      Alert.alert('Success', 'Service record created!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create service');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ {t('back')}</Text></TouchableOpacity>
          <Text style={styles.title}>{t('NewService')}</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Customer */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('customers')} *</Text>
            <TouchableOpacity style={[styles.selectBtn, errors.customer ? { borderColor: Colors.danger } : null]} onPress={() => setShowCustomerSearch(!showCustomerSearch)}>
              <Text style={form.customerName ? styles.selectText : styles.placeholderText}>{form.customerName || 'Tap to search customer...'}</Text>
            </TouchableOpacity>
            {errors.customer ? <Text style={styles.errorText}>{errors.customer}</Text> : null}
            {showCustomerSearch && (
              <View style={styles.dropdown}>
                <TextInput style={styles.dropdownInput} placeholder={t('Typenameorphone')} placeholderTextColor={Colors.textTertiary} value={customerSearch} onChangeText={(t) => { setCustomerSearch(t); searchCustomers(t); }} autoFocus />
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                    <Text style={styles.dropdownItemName}>{c.full_name || c.fullName}</Text>
                    <Text style={styles.dropdownItemSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && customerSearch.length > 1 && <Text style={styles.noResult}>{t('Nocustomersfound')}</Text>}
              </View>
            )}
          </View>

          {/* Vehicle */}
          {form.customerId ? (
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.sectionTitle}>{t('vehicle')} *</Text>
              {vehicles.length === 0 ? (
                <Text style={styles.noResult}>No vehicles found for this customer</Text>
              ) : vehicles.map(v => (
                <TouchableOpacity key={v.id} style={[styles.vehicleItem, form.vehicleId === v.id && styles.vehicleItemActive]} onPress={() => setForm(prev => ({ ...prev, vehicleId: v.id }))}>
                  <Text style={[styles.vehicleText, form.vehicleId === v.id && { color: Colors.primary }]}>🚗 {v.year} {v.make} {v.model}</Text>
                  <Text style={styles.vehiclePlate}>{v.license_plate || v.licensePlate}</Text>
                </TouchableOpacity>
              ))}
              {errors.vehicle ? <Text style={styles.errorText}>{errors.vehicle}</Text> : null}
            </View>
          ) : null}

          {/* Service Type */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('ServiceType')} *</Text>
            <View style={styles.chipGrid}>
              {SERVICE_TYPES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, form.serviceName === s && styles.chipActive]} onPress={() => setForm(prev => ({ ...prev, serviceName: s }))}>
                  <Text style={[styles.chipText, form.serviceName === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.serviceName ? <Text style={styles.errorText}>{errors.serviceName}</Text> : null}
          </View>

          {/* Cost & Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('Cost')}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label={t('Laborcost')} placeholder="0.00" value={form.laborCost} onChangeText={t => setForm(p => ({ ...p, laborCost: t }))} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('Partcost')} placeholder="0.00" value={form.partsCost} onChangeText={t => setForm(p => ({ ...p, partsCost: t }))} keyboardType="decimal-pad" />
              </View>
            </View>
            <Input label={t('Diagnosis')} placeholder={t('Describetheissue')} value={form.diagnosis} onChangeText={t => setForm(p => ({ ...p, diagnosis: t }))} multiline numberOfLines={3} />
            <Input label={t('InternalNotes')} placeholder={t('Notesfortheteam')} value={form.internalNotes} onChangeText={t => setForm(p => ({ ...p, internalNotes: t }))} multiline numberOfLines={2} />
          </View>

          <Button title={t('CreateServiceRecord')} onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.base },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  selectBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectText: { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.base, color: Colors.textTertiary },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownInput: { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownItemSub: { fontSize: Typography.sm, color: Colors.textSecondary },
  noResult: { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center', fontSize: Typography.sm },
  vehicleItem: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8, backgroundColor: Colors.surfaceSecondary },
  vehicleItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  vehicleText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  vehiclePlate: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  errorText: { fontSize: Typography.xs, color: Colors.danger, marginTop: 4 },
});
