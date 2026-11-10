import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
export const C = {
  bg: '#07110F',
  card: '#14231F',
  border: '#2B4139',
  green: '#22C55E',
  muted: '#9BAFA7',
  white: '#F8FAFC',
  gold: '#D4AF37',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 28, fontWeight: '800', color: C.white },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 5, marginBottom: 16 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  text: { color: C.white, fontSize: 16 },
  muted: { color: C.muted, fontSize: 13 },
  label: { color: C.muted, fontSize: 13, marginBottom: 7, marginTop: 12 },
  input: {
    color: C.white,
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  button: {
    backgroundColor: '#168B45',
    borderRadius: 13,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondary: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1 },
  pill: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginRight: 7,
    marginBottom: 7,
  },
  pillOn: { borderColor: C.green, backgroundColor: '#0D3C25' },
  pillText: { color: C.white, fontWeight: '600' },
});
export function Page({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : <View style={{ height: 18 }} />}
      {children}
    </ScrollView>
  );
}
export function Btn({
  title,
  onPress,
  secondary,
  disabled,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}
export function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {options.map((o) => (
        <TouchableOpacity
          accessibilityRole="radio"
          accessibilityLabel={o.label}
          accessibilityState={{ checked: value === o.value }}
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.pill, value === o.value && styles.pillOn]}
        >
          <Text style={styles.pillText}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function errorAlert(e: unknown) {
  const { Alert } = require('react-native');
  Alert.alert('CueBracket', e instanceof Error ? e.message : String(e));
}
