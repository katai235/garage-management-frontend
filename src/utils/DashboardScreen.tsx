import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { dashboardApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { StatusBadge, Card, LoadingState } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const safeDate = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    const h = d.getHours()%12||12, m = d.getMinutes().toString().padStart(2,'0');
    return `${MONTHS_S[d.getMonth()]} ${d.getDate()}, ${h}:${m} ${d.getHours()>=12?'PM':'AM'}`;
  } catch { return '—'; }
};
const safeTime = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch { return '—'; }
};
const fmtKip = (v: any) => { const n=parseFloat(v); if(!n||isNaN(n)) return '₭0'; return '₭'+Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); };
const getToday = () => { const d=new Date(); return `${DAYS[d.getDay()]}, ${MONTHS_L[d.getMonth()]} ${d.getDate()}`; };
const getGreeting = () => { const h=new Date().getHours(); if(h<12) return {text:'Good Morning',icon:'🌅'}; if(h<17) return {text:'Good Afternoon',icon:'☀️'}; return {text:'Good Evening',icon:'🌙'}; };

export default function DashboardScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const fetchData = async () => {
    try { const r = await dashboardApi.getStats(); setData(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  if (loading) return <LoadingState />;

  const greeting = getGreeting();
  const stats = data?.stats || {};
  const STAT_CARDS = [
    { label: 'Active Services', value: stats.activeServices||0, icon: '🚗', color: Colors.primary, bg: Colors.primaryAlpha },
    { label: "Today's Appts",  value: stats.todayAppointments||0, icon: '📅', color: Colors.info, bg: Colors.infoLight },
    { label: 'Customers',      value: stats.activeCustomers||0, icon: '👥', color: Colors.success, bg: Colors.successLight },
    { label: 'Revenue',        value: fmtKip(stats.monthlyRevenue||0), icon: '₭', color: Colors.accent, bg: Colors.accentLight },
  ];
  const QUICK_ACTIONS = [
    { icon: '🚗', label: 'New\nService',    screen: 'AddService',    color: Colors.primary },
    { icon: '👤', label: 'Add\nCustomer',   screen: 'AddCustomer',   color: Colors.success },
    { icon: '📅', label: 'Book\nAppt',      screen: 'AddAppointment',color: Colors.info },
    { icon: '🧾', label: 'New\nInvoice',    screen: 'AddInvoice',    color: Colors.accent },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchData();}} tintColor={Colors.primary} />}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerDecor1}/><View style={styles.headerDecor2}/>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greet}>{greeting.icon} {greeting.text}</Text>
              <Text style={styles.name}>{user?.fullName?.split(' ')[0]||'User'} 👋</Text>
              <Text style={styles.date}>{getToday()}</Text>
            </View>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase()||'U'}</Text>
              <View style={styles.onlineDot}/>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((s,i) => (
            <View key={i} style={[styles.statCard, Shadow.md]}>
              <View style={[styles.statIconBox,{backgroundColor:s.bg}]}><Text style={styles.statEmoji}>{s.icon}</Text></View>
              <Text style={[styles.statVal,{color:s.color}]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity key={a.screen} style={[styles.quickCard,Shadow.sm]} onPress={()=>navigation.navigate(a.screen)} activeOpacity={0.85}>
                <View style={[styles.quickIcon,{backgroundColor:a.color+'18'}]}><Text style={{fontSize:26}}>{a.icon}</Text></View>
                <Text style={styles.quickLbl}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Services */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Services</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={()=>navigation.navigate('Vehicles')}><Text style={styles.seeAll}>See All →</Text></TouchableOpacity>
          </View>
          {!data?.recentServices?.length ? (
            <View style={[styles.emptyBox,Shadow.sm]}><Text style={styles.emptyTxt}>No recent services</Text></View>
          ) : data.recentServices.map((s:any) => (
            <View key={s.id} style={[styles.svcCard,Shadow.sm]}>
              <View style={styles.svcIconBox}><Text style={{fontSize:20}}>🚗</Text></View>
              <View style={{flex:1}}>
                <Text style={styles.svcCar}>{s.make} {s.model}</Text>
                <Text style={styles.svcPlate}>{s.license_plate}</Text>
                <Text style={styles.svcName}>{s.service_name}</Text>
                <Text style={styles.svcMeta}>👤 {s.customer_name} · {safeDate(s.checked_in_at)}</Text>
              </View>
              <StatusBadge status={s.status} />
            </View>
          ))}
        </View>

        {/* Upcoming */}
        <View style={[styles.section,{paddingBottom:100}]}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={()=>navigation.navigate('Appointments')}><Text style={styles.seeAll}>See All →</Text></TouchableOpacity>
          </View>
          {!data?.upcomingAppointments?.length ? (
            <View style={[styles.emptyBox,Shadow.sm]}><Text style={styles.emptyTxt}>No upcoming appointments</Text></View>
          ) : data.upcomingAppointments.map((a:any) => (
            <View key={a.id} style={[styles.apptCard,Shadow.sm]}>
              <View style={styles.apptTime}>
                <Text style={styles.apptTimeText}>{safeTime(a.scheduled_at)}</Text>
                <Text style={styles.apptDateText}>{a.scheduled_at?new Date(a.scheduled_at).toLocaleDateString('en',{month:'short',day:'numeric'}):'—'}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={styles.apptName}>{a.customer_name}</Text>
                {a.make?<Text style={styles.apptDetail}>🚗 {a.make} {a.model}</Text>:null}
                <Text style={styles.apptDetail}>{a.service_description||'General Service'}</Text>
              </View>
              <StatusBadge status={a.status}/>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.background },
  header: { backgroundColor:Colors.primary, paddingHorizontal:Spacing.base, paddingTop:Spacing.lg, paddingBottom:Spacing.xl+10, overflow:'hidden', position:'relative' },
  headerDecor1: { position:'absolute', width:180, height:180, borderRadius:90, backgroundColor:'rgba(255,255,255,0.07)', top:-60, right:-30 },
  headerDecor2: { position:'absolute', width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.05)', bottom:-20, left:40 },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  greet: { fontSize:Typography.sm, color:'rgba(255,255,255,0.75)', marginBottom:4 },
  name: { fontSize:Typography['2xl'], fontWeight:'800', color:'#FFF', marginBottom:4 },
  date: { fontSize:Typography.sm, color:'rgba(255,255,255,0.6)' },
  avatar: { width:48, height:48, borderRadius:24, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'rgba(255,255,255,0.4)', position:'relative' },
  avatarText: { color:'#fff', fontSize:Typography.lg, fontWeight:'800' },
  onlineDot: { position:'absolute', bottom:2, right:2, width:10, height:10, borderRadius:5, backgroundColor:Colors.success, borderWidth:1.5, borderColor:Colors.primary },
  statsGrid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:Spacing.sm, marginTop:-20 },
  statCard: { width:'48%', margin:'1%', backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.md },
  statIconBox: { width:44, height:44, borderRadius:BorderRadius.md, alignItems:'center', justifyContent:'center', marginBottom:10 },
  statEmoji: { fontSize:22 },
  statVal: { fontSize:Typography['2xl'], fontWeight:'800', marginBottom:2 },
  statLbl: { fontSize:Typography.xs, color:Colors.textSecondary },
  section: { paddingHorizontal:Spacing.base, marginTop:Spacing.lg },
  sectionRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.md },
  sectionTitle: { fontSize:Typography.lg, fontWeight:'800', color:Colors.textPrimary },
  seeAllBtn: { backgroundColor:Colors.primaryAlpha, paddingHorizontal:10, paddingVertical:5, borderRadius:BorderRadius.full },
  seeAll: { fontSize:Typography.sm, fontWeight:'700', color:Colors.primary },
  quickGrid: { flexDirection:'row', gap:10 },
  quickCard: { flex:1, backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.md, alignItems:'center' },
  quickIcon: { width:52, height:52, borderRadius:BorderRadius.md, alignItems:'center', justifyContent:'center', marginBottom:8 },
  quickLbl: { fontSize:Typography.xs, fontWeight:'600', color:Colors.textSecondary, textAlign:'center' },
  svcCard: { backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.md, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 },
  svcIconBox: { width:48, height:48, borderRadius:BorderRadius.md, backgroundColor:Colors.primaryAlpha, alignItems:'center', justifyContent:'center' },
  svcCar: { fontSize:Typography.md, fontWeight:'700', color:Colors.textPrimary },
  svcPlate: { fontSize:Typography.xs, color:Colors.textSecondary, backgroundColor:Colors.surfaceSecondary, paddingHorizontal:6, paddingVertical:1, borderRadius:4, alignSelf:'flex-start', marginTop:2, marginBottom:4 },
  svcName: { fontSize:Typography.sm, color:Colors.textSecondary, marginBottom:2 },
  svcMeta: { fontSize:Typography.xs, color:Colors.textTertiary },
  apptCard: { backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.md, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 },
  apptTime: { width:58, height:58, backgroundColor:Colors.primaryAlpha, borderRadius:BorderRadius.md, alignItems:'center', justifyContent:'center' },
  apptTimeText: { fontSize:Typography.md, fontWeight:'800', color:Colors.primary },
  apptDateText: { fontSize:9, color:Colors.primary, marginTop:1 },
  apptName: { fontSize:Typography.base, fontWeight:'700', color:Colors.textPrimary, marginBottom:2 },
  apptDetail: { fontSize:Typography.xs, color:Colors.textSecondary },
  emptyBox: { backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.xl, alignItems:'center' },
  emptyTxt: { color:Colors.textTertiary, fontSize:Typography.base },
});
