import React, { useState, useEffect } from 'react';
import { useLanguageStore } from '../store/languageStore';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleApi, customerApi, vehicleApi, authApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';


const PRIORITY_OPTIONS = ['urgent', 'normal', 'low'];
const PRIORITY_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  urgent: { icon: '🔴', label: 'Urgent',  color: '#dc2626', bg: '#fee2e2' },
  normal: { icon: '🔵', label: 'Normal',  color: '#1d4ed8', bg: '#dbeafe' },
  low:    { icon: '⚪', label: 'Low',     color: '#64748b', bg: '#f1f5f9' },
};

const getDefaultDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AddScheduleScreen({ navigation, route }: any) {
  const { t } = useLanguageStore();
  const editingSchedule = route?.params?.schedule;
  const isEdit = !!editingSchedule;

  // Staff/technician search
  const [staffList, setStaffList]             = useState<any[]>([]);
  const [staffSearch, setStaffSearch]         = useState('');
  const [showStaffDrop, setShowStaffDrop]     = useState(false);

  // Customer search
  const [customers, setCustomers]             = useState<any[]>([]);
  const [customerSearch, setCustomerSearch]   = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  // Vehicles
  const [vehicles, setVehicles]               = useState<any[]>([]);

  const [loading, setLoading]                 = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    assignedToId:   editingSchedule?.assigned_to_id   || editingSchedule?.assignedToId   || '',
    assignedToName: editingSchedule?.assigned_to_name || editingSchedule?.assignedToName || '',
    title:          editingSchedule?.title            || '',
    description:    editingSchedule?.description      || editingSchedule?.work_description || '',
    customerId:     editingSchedule?.customer_id      || editingSchedule?.customerId      || '',
    customerName:   editingSchedule?.customer_name    || editingSchedule?.customerName    || '',
    vehicleId:      editingSchedule?.vehicle_id       || editingSchedule?.vehicleId       || '',
    dueDate:        editingSchedule?.due_date         || editingSchedule?.dueDate         || getDefaultDate(),
    dueTime:        editingSchedule?.due_time         || editingSchedule?.dueTime         || '09:00',
    priority:       editingSchedule?.priority         || 'normal',
    notes:          editingSchedule?.notes            || '',
  });

  // ── Search staff/technicians ──────────────────────────────
  const searchStaff = async (q: string) => {
    if (q.length < 1) { setStaffList([]); return; }
    try {
      const res = await authApi.getStaff({ search: q, roles: 'staff,technician' });
      setStaffList(res.data || []);
    } catch (e) { console.error(e); }
  };

  const selectStaff = (s: any) => {
    const name = s.full_name || s.fullName || s.username || '';
    setForm(p => ({ ...p, assignedToId: s.id, assignedToName: name }));
    setShowStaffDrop(false);
    setStaffSearch('');
    setStaffList([]);
  };

  // ── Search customers ──────────────────────────────────────
  const searchCustomers = async (q: string) => {
    if (q.length < 1) { setCustomers([]); return; }
    try {
      const res = await customerApi.getAll({ search: q });
      setCustomers(res.data.customers || []);
    } catch (e) { console.error(e); }
  };

  const selectCustomer = (c: any) => {
    const name = c.full_name || c.fullName || '';
    setForm(p => ({ ...p, customerId: c.id, customerName: name, vehicleId: '' }));
    setShowCustomerDrop(false);
    setCustomerSearch('');
    setCustomers([]);
    loadVehicles(c.id);
  };

  const loadVehicles = async (customerId: string) => {
    try {
      const res = await vehicleApi.getAll({ customerId });
      setVehicles(res.data || []);
    } catch { setVehicles([]); }
  };

  useEffect(() => {
    if (editingSchedule?.customerId || editingSchedule?.customer_id) {
      loadVehicles(editingSchedule.customerId || editingSchedule.customer_id);
    }
  }, []);

  // ── Validate ──────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.assignedToId)  e.assignedTo  = 'Please select a staff or technician';
    if (!form.title.trim())  e.title       = 'Please enter a work title';
    if (!form.dueDate || form.dueDate.length !== 10) e.dueDate = 'Enter date as YYYY-MM-DD';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        assignedToId:  form.assignedToId,
        title:         form.title.trim(),
        description:   form.description.trim(),
        customerId:    form.customerId  || null,
        vehicleId:     form.vehicleId   || null,
        dueDate:       form.dueDate,
        dueTime:       form.dueTime,
        priority:      form.priority,
        notes:         form.notes.trim(),
      };
      if (isEdit) {
        await scheduleApi.update(editingSchedule.id, payload);
      } else {
        await scheduleApi.create(payload);
      }
      Alert.alert(
        isEdit ? '✅ Schedule Updated' : '✅ Schedule Created',
        `Work assigned to ${form.assignedToName}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save schedule.');
    } finally { setLoading(false); }
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
          <Text style={styles.title}>{isEdit ? t('editSchedule') : t('assignWork')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Assign To ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('assignedTo')} *</Text>
            <TouchableOpacity
              style={[styles.selectBtn, errors.assignedTo ? { borderColor: Colors.danger } : null]}
              onPress={() => { setShowStaffDrop(!showStaffDrop); setStaffSearch(''); }}
            >
              {form.assignedToName
                ? (
                  <View style={styles.selectedStaffRow}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{form.assignedToName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.selectText}>{form.assignedToName}</Text>
                  </View>
                )
                : <Text style={styles.placeholderText}>{t('Searchstaffortechnicianname')}</Text>
              }
            </TouchableOpacity>
            {errors.assignedTo ? <Text style={styles.errText}>{errors.assignedTo}</Text> : null}

            {showStaffDrop && (
              <View style={styles.dropdown}>
                <TextInput
                  style={styles.dropdownSearch}
                  placeholder="Type name..."
                  placeholderTextColor={Colors.textTertiary}
                  value={staffSearch}
                  onChangeText={(t) => { setStaffSearch(t); searchStaff(t); }}
                  autoFocus
                />
                {staffList.map(s => (
                  <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => selectStaff(s)}>
                    <View style={styles.staffItemRow}>
                      <View style={styles.staffAvatar}>
                        <Text style={styles.staffAvatarText}>
                          {(s.full_name || s.fullName || s.username || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.dropdownName}>{s.full_name || s.fullName || s.username}</Text>
                        <Text style={styles.dropdownSub}>{s.role}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {staffList.length === 0 && staffSearch.length > 0 && (
                  <Text style={styles.noResult}>{t('Nostaffortechfound')}</Text>
                )}
              </View>
            )}
          </View>

          {/* ── Work Details ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('Workdetail')} *</Text>
            <Input
              label={t('Title')}
              placeholder="e.g. Oil Change — Toyota Camry"
              value={form.title}
              onChangeText={set('title')}
              error={errors.title}
            />
            <Input
              label={t('DescriptionInstructions')}
              placeholder={t('Detailedworkinstructions')}
              value={form.description}
              onChangeText={set('description')}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* ── Priority ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('priority')}</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map(p => {
                const m = PRIORITY_META[p];
                const active = form.priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, active && { backgroundColor: m.bg, borderColor: m.color }]}
                    onPress={() => set('priority')(p)}
                  >
                    <Text style={styles.priorityIcon}>{m.icon}</Text>
                    <Text style={[styles.priorityLabel, active && { color: m.color, fontWeight: '700' }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Due Date & Time ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('DueDate')} & {t('DueTime')}</Text>
            <Input
              label={t('Duedatep')}
              placeholder="YYYY-MM-DD"
              value={form.dueDate}
              onChangeText={set('dueDate')}
              keyboardType="numeric"
              error={errors.dueDate}
            />
            <Input
              label={t('DueTime')}
              placeholder="HH:MM (e.g. 14:30)"
              value={form.dueTime}
              onChangeText={set('dueTime')}
              keyboardType="numeric"
            />
          </View>

          {/* ── Customer (optional) ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('CustomerOptional')}</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => { setShowCustomerDrop(!showCustomerDrop); setCustomerSearch(''); }}
            >
              <Text style={form.customerName ? styles.selectText : styles.placeholderText}>
                {form.customerName || t('Searchcustomer')}
              </Text>
            </TouchableOpacity>
            {form.customerId && (
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, customerId: '', customerName: '', vehicleId: '' }))} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>{t('Clearcustomer')}</Text>
              </TouchableOpacity>
            )}
            {showCustomerDrop && (
              <View style={styles.dropdown}>
                <TextInput
                  style={styles.dropdownSearch}
                  placeholder={t('Typenameorphone')}
                  placeholderTextColor={Colors.textTertiary}
                  value={customerSearch}
                  onChangeText={(t) => { setCustomerSearch(t); searchCustomers(t); }}
                  autoFocus
                />
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                    <Text style={styles.dropdownName}>{c.full_name || c.fullName}</Text>
                    <Text style={styles.dropdownSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && customerSearch.length > 0 && (
                  <Text style={styles.noResult}>No customers found</Text>
                )}
              </View>
            )}

            {/* Vehicle picker */}
            {form.customerId && vehicles.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={styles.fieldLabel}>Vehicle (Optional)</Text>
                <TouchableOpacity
                  style={[styles.vehicleItem, !form.vehicleId && styles.vehicleItemActive]}
                  onPress={() => set('vehicleId')('')}
                >
                  <Text style={[styles.vehicleText, !form.vehicleId && { color: Colors.primary }]}>No specific vehicle</Text>
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
          </View>

          {/* ── Notes ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Input
              label={t('option')} 
              placeholder={t('Notesassignedstaff')}
              value={form.notes}
              onChangeText={set('notes')}
              multiline
              numberOfLines={3}
            />
          </View>

          <Button
            title={isEdit ?  t('saveChanges') :  `📋${t('assignWork')}`}
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
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title:       { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content:     { padding: Spacing.base },
  card:        { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle:{ fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  fieldLabel:  { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },

  selectBtn:       { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectedStaffRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  selectText:      { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.base, color: Colors.textTertiary },
  clearBtn:        { marginTop: 6, alignSelf: 'flex-start' },
  clearBtnText:    { fontSize: Typography.xs, color: Colors.danger, fontWeight: '600' },

  dropdown:       { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownSearch: { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem:   { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  staffItemRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffAvatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText:{ color: '#fff', fontWeight: '800', fontSize: Typography.sm },
  dropdownName:   { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownSub:    { fontSize: Typography.sm, color: Colors.textSecondary, textTransform: 'capitalize' },
  noResult:       { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center' },

  priorityRow:   { flexDirection: 'row', gap: 10 },
  priorityBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary, gap: 4 },
  priorityIcon:  { fontSize: 20 },
  priorityLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },

  vehicleItem:      { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8, backgroundColor: Colors.surfaceSecondary },
  vehicleItemActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  vehicleText:      { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  vehiclePlate:     { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  errText: { fontSize: Typography.xs, color: Colors.danger, marginTop: 4 },
});
