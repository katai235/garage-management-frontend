import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, TextInput, TextInputProps
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadow, getStatusColor } from '../utils/theme';

interface StatCardProps {
  label: string; value: string | number; icon: string; color?: string; bgColor?: string;
}
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = Colors.primary, bgColor }) => (
  <View style={[styles.statCard, Shadow.sm]}>
    <View style={[styles.statIcon, { backgroundColor: bgColor || Colors.primaryAlpha }]}>
      <Text style={styles.statIconText}>{icon}</Text>
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

interface BadgeProps { status: string; label?: string; }
export const StatusBadge: React.FC<BadgeProps> = ({ status, label }) => {
  const c = getStatusColor(status);
  const lbl = label || status.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{lbl}</Text>
    </View>
  );
};

interface ButtonProps {
  title: string; onPress: () => void;
  variant?: 'primary'|'secondary'|'outline'|'ghost'|'danger'|'success';
  size?: 'sm'|'md'|'lg'; loading?: boolean; disabled?: boolean; icon?: string; style?: ViewStyle;
}
export const Button: React.FC<ButtonProps> = ({ title, onPress, variant='primary', size='md', loading=false, disabled=false, icon, style }) => {
  const isDisabled = disabled || loading;
  const vMap: Record<string,{container:ViewStyle;text:TextStyle}> = {
    primary:   { container: { backgroundColor: Colors.primary }, text: { color: '#fff' } },
    secondary: { container: { backgroundColor: Colors.surfaceTertiary }, text: { color: Colors.textPrimary } },
    outline:   { container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary }, text: { color: Colors.primary } },
    ghost:     { container: { backgroundColor: 'transparent' }, text: { color: Colors.primary } },
    danger:    { container: { backgroundColor: Colors.danger }, text: { color: '#fff' } },
    success:   { container: { backgroundColor: Colors.success }, text: { color: '#fff' } },
  };
  const sMap: Record<string,{container:ViewStyle;text:TextStyle}> = {
    sm: { container: { paddingHorizontal:14, paddingVertical:8, borderRadius:BorderRadius.md }, text: { fontSize:Typography.sm } },
    md: { container: { paddingHorizontal:20, paddingVertical:13, borderRadius:BorderRadius.md }, text: { fontSize:Typography.base } },
    lg: { container: { paddingHorizontal:24, paddingVertical:16, borderRadius:BorderRadius.lg }, text: { fontSize:Typography.md } },
  };
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.8}
      style={[styles.btn, vMap[variant].container, sMap[size].container, isDisabled&&{opacity:0.5}, style]}>
      {loading ? <ActivityIndicator size="small" color={['primary','danger','success'].includes(variant)?'#fff':Colors.primary} />
        : <View style={styles.btnContent}>{!!icon && <Text style={[styles.btnIcon,vMap[variant].text]}>{icon}</Text>}<Text style={[styles.btnText,vMap[variant].text,sMap[size].text,{fontWeight:'700'}]}>{title}</Text></View>}
    </TouchableOpacity>
  );
};

interface InputProps extends TextInputProps { label?: string; error?: string; icon?: string; containerStyle?: ViewStyle; }
export const Input: React.FC<InputProps> = ({ label, error, icon, containerStyle, ...props }) => (
  <View style={[styles.inputContainer, containerStyle]}>
    {!!label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[styles.inputWrapper, error?styles.inputError:null]}>
      {!!icon && <Text style={styles.inputIcon}>{icon}</Text>}
      <TextInput style={[styles.input, icon?{paddingLeft:4}:null]} placeholderTextColor={Colors.textTertiary} {...props} />
    </View>
    {!!error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

interface CardProps { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; }
export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) return <TouchableOpacity style={[styles.card, Shadow.sm, style]} onPress={onPress} activeOpacity={0.95}>{children}</TouchableOpacity>;
  return <View style={[styles.card, Shadow.sm, style]}>{children}</View>;
};

interface SectionHeaderProps { title: string; subtitle?: string; action?: { label: string; onPress: () => void }; }
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <View style={styles.sectionHeader}>
    <View><Text style={styles.sectionTitle}>{title}</Text>{!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}</View>
    {!!action && <TouchableOpacity onPress={action.onPress} style={styles.sectionActionBtn}><Text style={styles.sectionAction}>{action.label}</Text></TouchableOpacity>}
  </View>
);

interface EmptyStateProps { icon: string; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; }
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconBox}><Text style={styles.emptyIcon}>{icon}</Text></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {!!(actionLabel && onAction) && <Button title={actionLabel} onPress={onAction} style={{marginTop:Spacing.base}} />}
  </View>
);

export const LoadingState: React.FC = () => (
  <View style={styles.loading}>
    <View style={styles.loadingSpinner}><ActivityIndicator size="large" color={Colors.primary} /></View>
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string,{bg:string;text:string}> = {
    admin:      { bg:'rgba(220,38,38,0.12)',  text:Colors.danger },
    manager:    { bg:'rgba(8,145,178,0.12)',  text:Colors.info },
    staff:      { bg:'rgba(5,150,105,0.12)',  text:Colors.success },
    technician: { bg:'rgba(217,119,6,0.12)', text:Colors.warning },
  };
  const c = map[role] || map.staff;
  return <View style={[styles.roleBadge,{backgroundColor:c.bg}]}><Text style={[styles.roleBadgeText,{color:c.text}]}>{role.toUpperCase()}</Text></View>;
};

const styles = StyleSheet.create({
  statCard: { flex:1, backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.md, alignItems:'flex-start', margin:4 },
  statIcon: { width:44, height:44, borderRadius:BorderRadius.md, alignItems:'center', justifyContent:'center', marginBottom:10 },
  statIconText: { fontSize:22 },
  statValue: { fontSize:Typography['2xl'], fontWeight:'800', color:Colors.textPrimary, marginBottom:2 },
  statLabel: { fontSize:Typography.xs, color:Colors.textSecondary },
  badge: { flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:5, borderRadius:BorderRadius.full },
  badgeDot: { width:6, height:6, borderRadius:3, marginRight:5 },
  badgeText: { fontSize:Typography.xs, fontWeight:'700' },
  btn: { alignItems:'center', justifyContent:'center' },
  btnContent: { flexDirection:'row', alignItems:'center', gap:6 },
  btnIcon: { fontSize:16 },
  btnText: {},
  inputContainer: { marginBottom:Spacing.md },
  inputLabel: { fontSize:Typography.sm, fontWeight:'700', color:Colors.textSecondary, marginBottom:6 },
  inputWrapper: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceSecondary, borderRadius:BorderRadius.md, borderWidth:1.5, borderColor:Colors.border, paddingHorizontal:Spacing.md },
  inputError: { borderColor:Colors.danger, backgroundColor:Colors.dangerLight },
  inputIcon: { fontSize:16, marginRight:8 },
  input: { flex:1, paddingVertical:13, fontSize:Typography.base, color:Colors.textPrimary },
  errorText: { fontSize:Typography.xs, color:Colors.danger, marginTop:4 },
  card: { backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, padding:Spacing.base, marginBottom:Spacing.md },
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.md },
  sectionTitle: { fontSize:Typography.lg, fontWeight:'800', color:Colors.textPrimary },
  sectionSubtitle: { fontSize:Typography.sm, color:Colors.textSecondary, marginTop:2 },
  sectionActionBtn: { backgroundColor:Colors.primaryAlpha, paddingHorizontal:10, paddingVertical:5, borderRadius:BorderRadius.full },
  sectionAction: { fontSize:Typography.sm, fontWeight:'700', color:Colors.primary },
  emptyState: { alignItems:'center', padding:Spacing['3xl'] },
  emptyIconBox: { width:80, height:80, borderRadius:40, backgroundColor:Colors.primaryAlpha, alignItems:'center', justifyContent:'center', marginBottom:Spacing.base },
  emptyIcon: { fontSize:36 },
  emptyTitle: { fontSize:Typography.lg, fontWeight:'800', color:Colors.textPrimary, marginBottom:6, textAlign:'center' },
  emptySubtitle: { fontSize:Typography.base, color:Colors.textSecondary, textAlign:'center', lineHeight:22 },
  loading: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:Colors.background },
  loadingSpinner: { width:72, height:72, borderRadius:36, backgroundColor:Colors.surface, alignItems:'center', justifyContent:'center', marginBottom:Spacing.base },
  loadingText: { fontSize:Typography.base, color:Colors.textSecondary, fontWeight:'600' },
  roleBadge: { paddingHorizontal:10, paddingVertical:4, borderRadius:BorderRadius.sm },
  roleBadgeText: { fontSize:10, fontWeight:'800', letterSpacing:0.8 },
});
