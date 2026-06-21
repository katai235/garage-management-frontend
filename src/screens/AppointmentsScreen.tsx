import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentApi, scheduleApi } from '../services/api';
import { StatusBadge, EmptyState, LoadingState, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

const DAYS        = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const addDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
const subDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()-n); return r; };
const isToday  = (d: Date) => { const t = new Date(); return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear(); };
const toYMD    = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
const fullDate = (d: Date) => `${DAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const safeTime = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch { return '—'; }
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: '#fee2e2', text: '#dc2626' },
  normal: { bg: '#dbeafe', text: '#1d4ed8' },
  low:    { bg: '#f1f5f9', text: '#64748b' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#fef3c7', text: '#d97706' },
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8' },
  done:        { bg: '#d1fae5', text: '#059669' },
  cancelled:   { bg: '#f1f5f9', text: '#94a3b8' },
};

const { width: SCREEN_W } = Dimensions.get('window');

export default function AppointmentsScreen({ navigation }: any) {
  const [activeTab, setActiveTab]           = useState<'appointments' | 'schedules'>('appointments');
  const tabAnim                             = useRef(new Animated.Value(0)).current;

  // ── Appointments state ──
  const [appointments, setAppointments]     = useState<any[]>([]);
  const [apptLoading, setApptLoading]       = useState(true);
  const [apptRefreshing, setApptRefreshing] = useState(false);
  const [selectedDate, setSelectedDate]     = useState(new Date());

  // ── Schedules state ──
  const [schedules, setSchedules]           = useState<any[]>([]);
  const [schedLoading, setSchedLoading]     = useState(true);
  const [schedRefreshing, setSchedRefreshing] = useState(false);
  const [schedDate, setSchedDate]           = useState(new Date());

  const { can, isAdminOrManager } = usePermissions();
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const isManager   = isAdminOrManager();
  const canCreate   = can('appointments.create');

  // ─────────────────────────────────────────
  // TAB SWITCH
  // ─────────────────────────────────────────
  const switchTab = (tab: 'appointments' | 'schedules') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'appointments' ? 0 : 1,
      useNativeDriver: true,
      tension: 80, friction: 14,
    }).start();
  };

  const indicatorX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, (SCREEN_W - 32) / 2 + 4],
  });

  // ─────────────────────────────────────────
  // APPOINTMENTS FETCH
  // ─────────────────────────────────────────
  const fetchAppointments = async (date = selectedDate) => {
    try {
      const res = await appointmentApi.getAll({ date: toYMD(date) });
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); setAppointments([]); }
    finally { setApptLoading(false); setApptRefreshing(false); }
  };

  // ─────────────────────────────────────────
  // SCHEDULES FETCH
  // ─────────────────────────────────────────
  const fetchSchedules = async (date = schedDate) => {
    try {
      const params: any = { date: toYMD(date) };
      // Staff/technicians only see their own schedules
      if (!isManager) params.assignedTo = user?.id;
      const res = await scheduleApi.getAll(params);
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); setSchedules([]); }
    finally { setSchedLoading(false); setSchedRefreshing(false); }
  };

  useFocusEffect(useCallback(() => {
    fetchAppointments();
    fetchSchedules();
  }, [selectedDate, schedDate]));

  // ─────────────────────────────────────────
  // APPOINTMENT ACTIONS
  // ─────────────────────────────────────────
  const updateApptStatus = async (id: string, status: string) => {
    try { await appointmentApi.update(id, { status }); fetchAppointments(); }
    catch { Alert.alert('Error', 'Failed to update appointment'); }
  };

  const handleCancelAppt = (item: any) => {
    Alert.alert('Cancel Appointment', `Cancel appointment for ${item.customer_name || item.customerName}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: async () => {
        try { await appointmentApi.update(item.id, { status: 'cancelled' }); fetchAppointments(); }
        catch { Alert.alert('Error', 'Failed to cancel'); }
      }},
    ]);
  };

  // ─────────────────────────────────────────
  // SCHEDULE ACTIONS
  // ─────────────────────────────────────────
  const updateSchedStatus = async (id: string, status: string) => {
    try { await scheduleApi.update(id, { status }); fetchSchedules(); }
    catch { Alert.alert('Error', 'Failed to update schedule'); }
  };

  const handleDeleteSched = (item: any) => {
    Alert.alert('Delete Schedule', `Delete this work schedule for ${item.assigned_to_name || 'the staff'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await scheduleApi.delete(item.id); fetchSchedules(); }
        catch { Alert.alert('Error', 'Failed to delete schedule'); }
      }},
    ]);
  };

  // ─────────────────────────────────────────
  // APPOINTMENT CARD
  // ─────────────────────────────────────────
  const renderAppt = ({ item }: { item: any }) => {
    const scheduledAt   = item.scheduled_at || item.scheduledAt;
    const customerName  = item.customer_name || item.customerName || '—';
    const customerPhone = item.customer_phone || item.customerPhone;
    const make          = item.make;
    const model         = item.model;
    const service       = item.service_description || item.serviceDescription || item.service_type_name;
    const duration      = item.duration_minutes || item.durationMinutes || 60;
    const status        = item.status || 'pending';
    const canEdit       = can('appointments.edit');
    const canDelete     = can('appointments.delete');

    return (
      <View style={[styles.card, Shadow.sm]}>
        <View style={styles.cardRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeText}>{safeTime(scheduledAt)}</Text>
            <Text style={styles.timeSub}>{duration}m</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.personName} numberOfLines={1}>{customerName}</Text>
              <StatusBadge status={status} />
            </View>
            {customerPhone ? <Text style={styles.detail}>📞 {customerPhone}</Text> : null}
            {make         ? <Text style={styles.detail}>🚗 {make} {model}</Text>  : null}
            {service      ? <Text style={styles.detail}>🔧 {service}</Text>       : null}
          </View>
        </View>

        {canEdit && (status === t('pending') || status === 'confirmed' || status === 'in-progress') && (
          <View style={styles.actionsRow}>
            {status === 'pending' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successLight }]} onPress={() => updateApptStatus(item.id, 'confirmed')}>
                <Text style={[styles.actionBtnText, { color: Colors.success }]}>{t('confirm2')}</Text>
              </TouchableOpacity>
            )}
            {(status === 'pending' || status === 'confirmed') && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.infoLight }]} onPress={() => updateApptStatus(item.id, 'in-progress')}>
                <Text style={[styles.actionBtnText, { color: Colors.info }]}>{t('start')}</Text>
              </TouchableOpacity>
            )}
            {status !== 'completed' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha }]} onPress={() => updateApptStatus(item.id, 'completed')}>
                <Text style={[styles.actionBtnText, { color: Colors.primary }]}>{t('done')}</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.dangerLight, flex: 0, width: 44 }]} onPress={() => handleCancelAppt(item)}>
                <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────
  // SCHEDULE CARD
  // ─────────────────────────────────────────
  const renderSchedule = ({ item }: { item: any }) => {
    const title         = item.title || 'Work Task';
    const description   = item.description || item.work_description || '';
    const assignedName  = item.assigned_to_name || item.assignedToName || '—';
    const assignedRole  = item.assigned_to_role || item.assignedToRole || '';
    const customerName  = item.customer_name || item.customerName || '';
    const vehicleInfo   = item.vehicle_info || (item.make ? `${item.make} ${item.model}` : '');
    const licensePlate  = item.license_plate || item.licensePlate || '';
    const dueDate       = item.due_date || item.dueDate;
    const dueTime       = item.due_time || item.dueTime;
    const priority      = item.priority || 'normal';
    const status        = item.status || 'pending';
    const pColor        = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal;
    const sColor        = STATUS_COLORS[status]     || STATUS_COLORS.pending;

    return (
      <View style={[styles.card, Shadow.sm]}>
        {/* Top row: title + badges */}
        <View style={styles.schedTopRow}>
          <Text style={styles.schedTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: pColor.bg }]}>
              <Text style={[styles.badgeText, { color: pColor.text }]}>
                {priority === 'urgent' ? '🔴' : priority === 'normal' ? '🔵' : '⚪'} {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sColor.bg }]}>
              <Text style={[styles.badgeText, { color: sColor.text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            </View>
          </View>
        </View>

        {/* Assigned to */}
        <View style={styles.assignedRow}>
          <View style={styles.assignedAvatar}>
            <Text style={styles.assignedAvatarText}>{assignedName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.assignedName}>{assignedName}</Text>
            {assignedRole ? <Text style={styles.assignedRole}>{assignedRole}</Text> : null}
          </View>
        </View>

        <View style={styles.schedDivider} />

        {/* Details grid */}
        {description ? (
          <View style={styles.schedDetailRow}>
            <Text style={styles.schedDetailIcon}>📋</Text>
            <Text style={styles.schedDetailText} numberOfLines={3}>{description}</Text>
          </View>
        ) : null}
        {customerName ? (
          <View style={styles.schedDetailRow}>
            <Text style={styles.schedDetailIcon}>👤</Text>
            <Text style={styles.schedDetailText}>{customerName}</Text>
          </View>
        ) : null}
        {vehicleInfo ? (
          <View style={styles.schedDetailRow}>
            <Text style={styles.schedDetailIcon}>🚗</Text>
            <Text style={styles.schedDetailText}>{vehicleInfo}{licensePlate ? ` — ${licensePlate}` : ''}</Text>
          </View>
        ) : null}
        {dueDate ? (
          <View style={styles.schedDetailRow}>
            <Text style={styles.schedDetailIcon}>🗓️</Text>
            <Text style={styles.schedDetailText}>
              {dueDate}{dueTime ? ` at ${dueTime}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={[styles.actionsRow, { marginTop: Spacing.md }]}>
          {/* Staff/tech can update status */}
          {status === 'pending' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.infoLight }]} onPress={() => updateSchedStatus(item.id, 'in-progress')}>
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>{t('startWork')}</Text>
            </TouchableOpacity>
          )}
          {status === 'in-progress' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successLight }]} onPress={() => updateSchedStatus(item.id, 'done')}>
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>{t('markDone')}</Text>
            </TouchableOpacity>
          )}
          {status === 'done' && (
            <View style={[styles.actionBtn, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>✅ Completed</Text>
            </View>
          )}
          {/* Manager can edit / delete */}
          {isManager && (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryAlpha, flex: 0, paddingHorizontal: 16 }]} onPress={() => navigation.navigate('EditSchedule', { schedule: item })}>
                <Text style={[styles.actionBtnText, { color: Colors.primary }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.dangerLight, flex: 0, width: 44 }]} onPress={() => handleDeleteSched(item)}>
                <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────
  // APPOINTMENT SUMMARY STATS
  // ─────────────────────────────────────────
  const apptCounts = {
    total:     appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    done:      appointments.filter(a => a.status === 'completed').length,
  };

  const schedCounts = {
    total:      schedules.length,
    pending:    schedules.filter(s => s.status === 'pending').length,
    inProgress: schedules.filter(s => s.status === 'in-progress').length,
    done:       schedules.filter(s => s.status === 'done').length,
  };

  const sortedAppts = [...appointments].sort((a, b) =>
    new Date(a.scheduled_at || a.scheduledAt).getTime() -
    new Date(b.scheduled_at || b.scheduledAt).getTime()
  );
  const sortedScheds = [...schedules].sort((a, b) => {
    const pa = { urgent: 0, normal: 1, low: 2 }[a.priority as string] ?? 1;
    const pb = { urgent: 0, normal: 1, low: 2 }[b.priority as string] ?? 1;
    return pa - pb;
  });

  // ─────────────────────────────────────────
  // DATE NAVIGATOR shared component
  // ─────────────────────────────────────────
  const DateNav = ({ date, onPrev, onNext }: { date: Date; onPrev: () => void; onNext: () => void }) => (
    <View style={styles.dateNav}>
      <TouchableOpacity style={styles.navBtn} onPress={onPrev}>
        <Text style={styles.navArrow}>‹</Text>
      </TouchableOpacity>
      <View style={styles.datePill}>
        <Text style={styles.dateText}>{fullDate(date)}</Text>
        {isToday(date) && (
          <View style={styles.todayBadge}><Text style={styles.todayText}>Today</Text></View>
        )}
      </View>
      <TouchableOpacity style={styles.navBtn} onPress={onNext}>
        <Text style={styles.navArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('appointments')}</Text>
          <Text style={styles.subtitle}>{t('appointmentsSubtitle')}</Text>
        </View>
        {activeTab === 'appointments' && canCreate && (
          <Button title={`+ ${t('newAppointment')}`} onPress={() => navigation.navigate('AddAppointment')} size="sm" />
        )}
        {activeTab === 'schedules' && isManager && (
          <Button title={t('addSchedule')} onPress={() => navigation.navigate('AddSchedule')} size="sm" />
        )}
      </View>

      {/* ── Tab Switcher ── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorX }], width: (SCREEN_W - 40) / 2 }]} />
          <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab('appointments')} activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === 'appointments' && styles.tabTextActive]}>
              📅 {t('appointments')}
            </Text>
            {apptCounts.total > 0 && (
              <View style={[styles.tabBadge, activeTab === 'appointments' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'appointments' && styles.tabBadgeTextActive]}>
                  {apptCounts.total}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab('schedules')} activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive]}>
              🗂️ {t('schedules')}
            </Text>
            {schedCounts.total > 0 && (
              <View style={[styles.tabBadge, activeTab === 'schedules' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'schedules' && styles.tabBadgeTextActive]}>
                  {schedCounts.total}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── APPOINTMENTS TAB ── */}
      {activeTab === 'appointments' && (
        <>
          <DateNav
            date={selectedDate}
            onPrev={() => setSelectedDate(subDays(selectedDate, 1))}
            onNext={() => setSelectedDate(addDays(selectedDate, 1))}
          />
          <View style={styles.statsRow}>
            {[
              { label: 'Total',     value: apptCounts.total,     color: Colors.textPrimary },
              { label: 'Confirmed', value: apptCounts.confirmed, color: Colors.success },
              { label: 'Pending',   value: apptCounts.pending,   color: Colors.warning },
              { label: 'Done',      value: apptCounts.done,      color: Colors.textSecondary },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, Shadow.sm]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          {apptLoading
            ? <LoadingState />
            : <FlatList
                data={sortedAppts}
                keyExtractor={i => i.id}
                renderItem={renderAppt}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={apptRefreshing} onRefresh={() => { setApptRefreshing(true); fetchAppointments(); }} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📅</Text>
                    <Text style={styles.emptyTitle}>{t('noAppointments')}</Text>
                    {canCreate && <Button title={`+ ${t('newAppointment')}`} onPress={() => navigation.navigate('AddAppointment')} style={{ marginTop: Spacing.base }} />}
                  </View>
                }
              />
          }
        </>
      )}

      {/* ── SCHEDULES TAB ── */}
      {activeTab === 'schedules' && (
        <>
          <DateNav
            date={schedDate}
            onPrev={() => setSchedDate(subDays(schedDate, 1))}
            onNext={() => setSchedDate(addDays(schedDate, 1))}
          />
          <View style={styles.statsRow}>
            {[
              { label: 'Total',       value: schedCounts.total,      color: Colors.textPrimary },
              { label: 'Pending',     value: schedCounts.pending,    color: Colors.warning },
              { label: 'In Progress', value: schedCounts.inProgress, color: Colors.info },
              { label: 'Done',        value: schedCounts.done,       color: Colors.success },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, Shadow.sm]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          {!isManager && (
            <View style={styles.myWorkBanner}>
              <Text style={styles.myWorkText}>{t('myWork')}</Text>
            </View>
          )}
          {schedLoading
            ? <LoadingState />
            : <FlatList
                data={sortedScheds}
                keyExtractor={i => i.id}
                renderItem={renderSchedule}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={schedRefreshing} onRefresh={() => { setSchedRefreshing(true); fetchSchedules(); }} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>🗂️</Text>
                    <Text style={styles.emptyTitle}>
                      {isManager ? t('noSchedules') : t('myWork')}
                    </Text>
                    {isManager && <Button title={`${t('addSchedule')} ${t('assignWork')}`} onPress={() => navigation.navigate('AddSchedule')} style={{ marginTop: Spacing.base }} />}
                  </View>
                }
              />
          }
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base },
  title:      { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  subtitle:   { fontSize: Typography.sm, color: Colors.textSecondary },

  // Tab switcher
  tabContainer: { paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  tabBar:      { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 4, ...Shadow.sm, position: 'relative', overflow: 'hidden' },
  tabIndicator:{ position: 'absolute', top: 4, bottom: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.md - 2 },
  tabBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, zIndex: 1 },
  tabText:     { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabBadge:    { backgroundColor: Colors.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText:   { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  tabBadgeTextActive: { color: '#fff' },

  // Date nav
  dateNav:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.base, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadow.sm },
  navBtn:    { padding: Spacing.md },
  navArrow:  { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  datePill:  { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  dateText:  { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  todayBadge:{ backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 2, marginTop: 4 },
  todayText: { fontSize: Typography.xs, color: '#fff', fontWeight: '600' },

  // Stats
  statsRow:  { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 6, marginBottom: Spacing.md },
  statCard:  { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: '700' },
  statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, textAlign: 'center' },

  // Banner
  myWorkBanner: { marginHorizontal: Spacing.base, marginBottom: Spacing.sm, backgroundColor: Colors.infoLight, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  myWorkText:   { fontSize: Typography.sm, color: Colors.info, fontWeight: '600' },

  // List
  listContent: { padding: Spacing.base, paddingTop: 0, paddingBottom: 100 },

  // Appointment card
  card:        { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  cardRow:     { flexDirection: 'row', gap: 12 },
  timeBlock:   { width: 60, alignItems: 'center', backgroundColor: Colors.primaryAlpha, borderRadius: BorderRadius.md, padding: 8, justifyContent: 'center' },
  timeText:    { fontSize: Typography.base, fontWeight: '800', color: Colors.primary },
  timeSub:     { fontSize: 10, color: Colors.primary, marginTop: 2 },
  cardInfo:    { flex: 1 },
  nameRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  personName:  { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  detail:      { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  actionsRow:  { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  actionBtn:   { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 9, alignItems: 'center' },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },

  // Schedule card
  schedTopRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.sm },
  schedTitle:    { fontSize: Typography.md, fontWeight: '800', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  badges:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText:     { fontSize: 10, fontWeight: '700' },
  assignedRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  assignedAvatar:{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  assignedAvatarText: { color: '#fff', fontWeight: '800', fontSize: Typography.base },
  assignedName:  { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  assignedRole:  { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize' },
  schedDivider:  { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },
  schedDetailRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  schedDetailIcon: { fontSize: 14, marginTop: 1 },
  schedDetailText: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

  // Empty
  emptyBox:   { alignItems: 'center', padding: Spacing['3xl'] },
  emptyIcon:  { fontSize: 56, marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
});
