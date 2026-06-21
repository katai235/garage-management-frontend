import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appointmentApi, customerApi, vehicleApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';


const SERVICE_TYPES = [
  'Oil Change','Brake Service','Tire Rotation',
  'Full Inspection','Battery Check','AC Service',
  'Transmission Service','Engine Tune-Up','Other'
];
const DURATIONS = ['30 min','60 min','90 min','120 min','180 min'];
const DURATION_MAP: Record<string, number> = {
  '30 min': 30, '60 min': 60, '90 min': 90, '120 min': 120, '180 min': 180
};

const getDefaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AddAppointmentScreen({ navigation }: any) {
  const { t } = useLanguageStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    vehicleId: '',
    serviceDescription: '',
    scheduledDate: getDefaultDate(),
    scheduledTime: '09:00',
    duration: '60 min',
    notes: '',
  });

  const searchCustomers = async (q: string) => {
    if (q.length < 1) { setCustomers([]); return; }
    try {
      const res = await customerApi.getAll({ search: q });
      setCustomers(res.data.customers || []);
    } catch (e) { console.error(e); }
  };

  const loadVehicles = async (customerId: string) => {
    try {
      const res = await vehicleApi.getAll({ customerId });
      setVehicles(res.data || []);
    } catch (e) { setVehicles([]); }
  };

  const selectCustomer = (c: any) => {
    const name = c.full_name || c.fullName || '';
    setForm(p => ({ ...p, customerId: c.id, customerName: name, vehicleId: '' }));
    setShowSearch(false);
    setSearchQuery('');
    setCustomers([]);
    loadVehicles(c.id);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customer = 'Please select a customer';
    if (!form.serviceDescription) e.service = 'Please select a service type';
    if (!form.scheduledDate || form.scheduledDate.length !== 10) e.date = 'Enter date as YYYY-MM-DD';
    if (!form.scheduledTime || form.scheduledTime.length < 4) e.time = 'Enter time as HH:MM';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Combine date and time into ISO string
      const dateTimeStr = `${form.scheduledDate}T${form.scheduledTime}:00`;
      const scheduledAt = new Date(dateTimeStr).toISOString();

      await appointmentApi.create({
        customerId: form.customerId,
        vehicleId: form.vehicleId || null,
        serviceDescription: form.serviceDescription,
        scheduledAt,
        durationMinutes: DURATION_MAP[form.duration] || 60,
        notes: form.notes,
      });

      Alert.alert(
        '✅ Appointment Booked!',
        `Appointment for ${form.customerName} on ${form.scheduledDate} at ${form.scheduledTime} has been created.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to create appointment. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ {t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('addAppointment')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Customer Selection */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('customer')} *</Text>
            <TouchableOpacity
              style={[styles.selectBtn, errors.customer ? { borderColor: Colors.danger } : null]}
              onPress={() => { setShowSearch(!showSearch); if (!showSearch) setSearchQuery(''); }}
            >
              <Text style={form.customerName ? styles.selectText : styles.placeholderText}>
                {form.customerName || t('Taptosearchcustomer')}
              </Text>
            </TouchableOpacity>
            {errors.customer ? <Text style={styles.errText}>{errors.customer}</Text> : null}

            {showSearch && (
              <View style={styles.dropdown}>
                <TextInput
                  style={styles.dropdownSearch}
                  placeholder={t('Typenameorphone')}
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={(t) => { setSearchQuery(t); searchCustomers(t); }}
                  autoFocus
                />
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                    <Text style={styles.dropdownName}>{c.full_name || c.fullName}</Text>
                    <Text style={styles.dropdownSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && searchQuery.length > 0 && (
                  <Text style={styles.noResult}>No customers found</Text>
                )}
              </View>
            )}
          </View>

          {/* Vehicle Selection (optional) */}
          {form.customerId && vehicles.length > 0 && (
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.sectionTitle}>{t('VehicleOptional')}</Text>
              <TouchableOpacity
                style={[styles.vehicleItem, !form.vehicleId && styles.vehicleItemActive]}
                onPress={() => set('vehicleId')('')}
              >
                <Text style={[styles.vehicleText, !form.vehicleId && { color: Colors.primary }]}>
                  No specific vehicle
                </Text>
              </TouchableOpacity>
              {vehicles.map((v: any) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleItem, form.vehicleId === v.id && styles.vehicleItemActive]}
                  onPress={() => set('vehicleId')(v.id)}
                >
                  <Text style={[styles.vehicleText, form.vehicleId === v.id && { color: Colors.primary }]}>
                    🚗 {v.year} {v.make} {v.model}
                  </Text>
                  <Text style={styles.vehiclePlate}>{v.license_plate || v.licensePlate}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Service Type */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('ServiceType')} *</Text>
            <View style={styles.chipGrid}>
              {SERVICE_TYPES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, form.serviceDescription === s && styles.chipActive]}
                  onPress={() => set('serviceDescription')(s)}
                >
                  <Text style={[styles.chipText, form.serviceDescription === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.service ? <Text style={styles.errText}>{errors.service}</Text> : null}
          </View>

          {/* Date & Time */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('datetime')} *</Text>
            <Input
              label={t('date')}
              placeholder="YYYY-MM-DD (e.g. 2026-05-20)"
              value={form.scheduledDate}
              onChangeText={set('scheduledDate')}
              keyboardType="numeric"
              error={errors.date}
            />
            <Input
              label={t('time')}
              placeholder="HH:MM (e.g. 09:00 or 14:30)"
              value={form.scheduledTime}
              onChangeText={set('scheduledTime')}
              keyboardType="numeric"
              error={errors.time}
            />
            <Text style={styles.fieldLabel}>{t('duration')}</Text>
            <View style={styles.chipGrid}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, form.duration === d && styles.chipActive]}
                  onPress={() => set('duration')(d)}
                >
                  <Text style={[styles.chipText, form.duration === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Input
              label="Notes (Optional)"
              placeholder="Any additional notes..."
              value={form.notes}
              onChangeText={set('notes')}
              multiline
              numberOfLines={3}
            />
          </View>

          <Button
            title={t('bookappointment')}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginBottom: 40 }}
          />
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
  fieldLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  selectBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectText: { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.base, color: Colors.textTertiary },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownSearch: { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownSub: { fontSize: Typography.sm, color: Colors.textSecondary },
  noResult: { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center' },
  vehicleItem: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8, backgroundColor: Colors.surfaceSecondary },
  vehicleItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  vehicleText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  vehiclePlate: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  errText: { fontSize: Typography.xs, color: Colors.danger, marginTop: 4 },
});
