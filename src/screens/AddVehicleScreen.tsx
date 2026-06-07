import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleApi, customerApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const FUEL_TYPES = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'LPG'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

export default function AddVehicleScreen({ navigation, route }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerId: route?.params?.customerId || '',
    customerName: route?.params?.customerName || '',
    make: '', model: '',
    year: String(CURRENT_YEAR),
    licensePlate: '', color: '',
    vin: '', mileage: '',
    fuelType: 'Gasoline', notes: '',
  });

  useEffect(() => {
    if (route?.params?.customerId) {
      setForm(prev => ({
        ...prev,
        customerId: route.params.customerId,
        customerName: route.params.customerName || '',
      }));
    }
  }, []);

  const searchCustomers = async (query: string) => {
    try { const res = await customerApi.getAll({ search: query }); setCustomers(res.data.customers || []); } catch (e) {}
  };

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerId: c.id, customerName: c.full_name || c.fullName }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customer = 'Please select a customer';
    if (!form.make.trim()) e.make = 'Make is required';
    if (!form.model.trim()) e.model = 'Model is required';
    if (!form.licensePlate.trim()) e.licensePlate = 'License plate is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await vehicleApi.create({
        customerId: form.customerId,
        make: form.make,
        model: form.model,
        year: parseInt(form.year),
        licensePlate: form.licensePlate.toUpperCase(),
        color: form.color,
        vin: form.vin,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        fuelType: form.fuelType,
        notes: form.notes,
      });
      Alert.alert('Success', 'Vehicle registered successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to register vehicle');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Register Vehicle</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Customer */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Customer *</Text>
            <TouchableOpacity
              style={[styles.selectBtn, errors.customer ? { borderColor: Colors.danger } : null]}
              onPress={() => setShowCustomerSearch(!showCustomerSearch)}
            >
              <Text style={form.customerName ? styles.selectText : styles.placeholderText}>
                {form.customerName || 'Tap to search customer...'}
              </Text>
            </TouchableOpacity>
            {errors.customer ? <Text style={styles.errorText}>{errors.customer}</Text> : null}
            {showCustomerSearch && (
              <View style={styles.dropdown}>
                <TextInput
                  style={styles.dropdownInput}
                  placeholder="Type name or phone..."
                  placeholderTextColor={Colors.textTertiary}
                  value={customerSearch}
                  onChangeText={(t) => { setCustomerSearch(t); searchCustomers(t); }}
                  autoFocus
                />
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                    <Text style={styles.dropdownItemName}>{c.full_name || c.fullName}</Text>
                    <Text style={styles.dropdownItemSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && customerSearch.length > 1 && (
                  <Text style={styles.noResult}>No customers found</Text>
                )}
              </View>
            )}
          </View>

          {/* Vehicle Info */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Make *" placeholder="Toyota" value={form.make} onChangeText={set('make')} error={errors.make} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Model *" placeholder="Camry" value={form.model} onChangeText={set('model')} error={errors.model} autoCapitalize="words" />
              </View>
            </View>

            {/* Year Selector */}
            <Text style={styles.fieldLabel}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
              {YEARS.slice(0, 15).map(y => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearChip, form.year === y && styles.yearChipActive]}
                  onPress={() => setForm(prev => ({ ...prev, year: y }))}
                >
                  <Text style={[styles.yearChipText, form.year === y && styles.yearChipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input label="License Plate *" placeholder="ABC-1234" value={form.licensePlate} onChangeText={set('licensePlate')} error={errors.licensePlate} autoCapitalize="characters" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Color" placeholder="White" value={form.color} onChangeText={set('color')} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Mileage (km)" placeholder="50000" value={form.mileage} onChangeText={set('mileage')} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* Fuel Type */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Fuel Type</Text>
            <View style={styles.chipGrid}>
              {FUEL_TYPES.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, form.fuelType === f && styles.chipActive]}
                  onPress={() => setForm(prev => ({ ...prev, fuelType: f }))}
                >
                  <Text style={[styles.chipText, form.fuelType === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <Input label="VIN (optional)" placeholder="Vehicle Identification Number" value={form.vin} onChangeText={set('vin')} autoCapitalize="characters" />
            <Input label="Notes" placeholder="Any notes about the vehicle..." value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />
          </View>

          <Button title="Register Vehicle" onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
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
  fieldLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  selectBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectText: { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.base, color: Colors.textTertiary },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownInput: { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownItemSub: { fontSize: Typography.sm, color: Colors.textSecondary },
  noResult: { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center', fontSize: Typography.sm },
  row: { flexDirection: 'row', gap: 12 },
  yearScroll: { marginBottom: Spacing.md },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary, marginRight: 8 },
  yearChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  yearChipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  yearChipTextActive: { color: Colors.primary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  errorText: { fontSize: Typography.xs, color: Colors.danger, marginTop: 4 },
});
