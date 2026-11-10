import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  type TextInputProps,
  useWindowDimensions,
} from 'react-native';
import { theme } from './theme';
export { theme };
export const C = theme.colors;
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: {
    padding: theme.space.lg + theme.space.xs,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  title: { fontSize: theme.type.title, fontWeight: '700', letterSpacing: -1, color: C.white },
  heading: { fontSize: theme.type.heading, fontWeight: '600', letterSpacing: -0.4, color: C.white },
  subtitle: { fontSize: 15, lineHeight: 23, color: C.muted, marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: '#22382E',
    borderRadius: theme.radius.lg,
    padding: theme.space.lg + theme.space.xs,
    marginBottom: 14,
  },
  text: { color: C.white, fontSize: theme.type.body, lineHeight: 24 },
  muted: { color: C.muted, fontSize: theme.type.small, lineHeight: 21 },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    color: C.white,
    backgroundColor: '#0C1914',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: {
    minHeight: 54,
    maxWidth: '100%',
    backgroundColor: C.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: C.bg, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  secondary: { backgroundColor: C.raised, borderColor: C.border, borderWidth: 1 },
  pill: {
    minHeight: theme.touch,
    minWidth: theme.touch,
    maxWidth: '100%',
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: theme.radius.pill,
    backgroundColor: C.card,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  pillOn: { borderColor: C.green, backgroundColor: C.glow },
  pillText: { color: C.white, fontWeight: '600', fontSize: 14 },
});
const MotionContext = createContext(true);
export const useReducedMotion = () => useContext(MotionContext);
export function MotionProvider({ children }: React.PropsWithChildren) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>;
}
export function Reveal({
  children,
  change,
}: React.PropsWithChildren<{ change?: string | number }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.65);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: theme.motion.reveal,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [change, opacity, reduced]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}
export function AppHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View>
      <View style={[styles.row, { marginBottom: 24 }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: C.white, fontSize: 26 }}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.row, { gap: 8 }]}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: C.green,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: C.bg, fontWeight: '900' }}>8</Text>
            </View>
            <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>CueBracket</Text>
          </View>
        )}
        <StatusBadge label="On device" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : <View style={{ height: 24 }} />}
    </View>
  );
}
export function Page({
  title,
  subtitle,
  children,
  onBack,
  scrollToTopKey,
  footer,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  scrollToTopKey?: string | number | null;
  footer?: React.ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: !reduced });
  }, [scrollToTopKey, reduced]);
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="height">
      <ScrollView
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + 16, paddingBottom: footer ? 24 : insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <AppHeader title={title} subtitle={subtitle} onBack={onBack} />
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: C.border,
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: insets.bottom + 12,
            backgroundColor: C.bg,
          }}
        >
          <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
export function Btn({
  title,
  onPress,
  secondary,
  disabled,
  accessibilityLabel,
  danger,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  danger?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <TouchableOpacity
      activeOpacity={reduced ? 1 : 0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.4 }]}
    >
      <Text style={[styles.buttonText, secondary && { color: danger ? C.danger : C.white }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
export const PrimaryButton = (props: React.ComponentProps<typeof Btn>) => <Btn {...props} />;
export const SecondaryButton = (props: React.ComponentProps<typeof Btn>) => (
  <Btn {...props} secondary />
);
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {options.map((option) => (
        <TouchableOpacity
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ checked: value === option.value }}
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.pill, value === option.value && styles.pillOn]}
        >
          <Text style={[styles.pillText, value === option.value && { color: C.green }]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        selectionColor={C.green}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && { borderColor: C.green }, props.style]}
      />
    </>
  );
}
export function Card({
  children,
  highlight = false,
}: React.PropsWithChildren<{ highlight?: boolean }>) {
  return (
    <View
      style={[
        styles.card,
        highlight && { backgroundColor: C.glow, borderColor: '#32674A', overflow: 'hidden' },
      ]}
    >
      {highlight ? (
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                width: 240 + index * 90,
                height: 240 + index * 90,
                borderRadius: 300,
                right: -100 - index * 40,
                top: -120 - index * 30,
                backgroundColor: '#69E6AC',
                opacity: 0.025,
              }}
            />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}
export function StatusBadge({
  label,
  tone = 'green',
}: {
  label: string;
  tone?: 'green' | 'gold' | 'muted';
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: tone === 'gold' ? '#342F1B' : '#1B3529',
        maxWidth: '100%',
      }}
    >
      <Text
        style={{
          color: tone === 'gold' ? C.gold : tone === 'muted' ? C.muted : C.green,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap', marginTop: 26, marginBottom: 16 }]}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </View>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card>
      <View style={{ gap: 10, paddingVertical: 12 }}>
        <Text style={[styles.heading, { color: C.green }]}>{title}</Text>
        <Text style={styles.muted}>{description}</Text>
        {action && onAction ? <Btn title={action} onPress={onAction} /> : null}
      </View>
    </Card>
  );
}
export function LoadingState({ label = 'Loading your tournaments…' }: { label?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.card, { gap: 16, alignItems: 'center', padding: 32 }]}
    >
      <ActivityIndicator color={C.green} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}
export function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  const progress = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.max(0, total), now: value }}
      style={{ gap: 10, marginVertical: 14 }}
    >
      <Text style={styles.muted}>{label}</Text>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }}>
        <View
          style={{
            width: `${progress * 100}%`,
            height: 5,
            backgroundColor: C.green,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
export function SetupProgress({ step }: { step: number }) {
  const labels = ['Information', 'Game & format', 'Scoring', 'Players', 'Draw preview', 'Confirm'];
  return (
    <View style={{ marginBottom: 20 }}>
      <StatusBadge label={`Step ${step} of 6 · ${labels[step - 1]}`} />
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 14 }}>
        {labels.map((label, index) => (
          <View
            key={label}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: index < step ? C.green : C.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: React.PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={() => AccessibilityInfo.announceForAccessibility(title)}
    >
      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss actions"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: C.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: insets.bottom + 24,
            maxHeight: '85%',
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text accessibilityRole="header" style={styles.heading}>
              {title}
            </Text>
            {children}
            <Btn title="Close" secondary onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Avatar({ name, ball = false }: { name: string; ball?: boolean }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.raised,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text allowFontScaling={false} style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>
        {ball ? '8' : name.trim().slice(0, 2).toLocaleUpperCase()}
      </Text>
    </View>
  );
}
export function ScoreDisplay({
  name,
  score,
  winner,
}: {
  name: string;
  score: number;
  winner: boolean;
}) {
  return (
    <Reveal change={score}>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.heading, { textAlign: 'center' }]}>{name}</Text>
        <Text
          accessibilityLabel={`${name}, ${score}`}
          accessibilityLiveRegion="polite"
          style={{
            fontSize: theme.type.score,
            color: winner ? C.green : C.white,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            marginVertical: 10,
          }}
        >
          {score}
        </Text>
        {winner ? <StatusBadge label="Winning score" /> : null}
      </View>
    </Reveal>
  );
}
export function ResponsiveRow({ children }: React.PropsWithChildren) {
  const { width, fontScale } = useWindowDimensions();
  return (
    <View style={{ flexDirection: width / fontScale < 360 ? 'column' : 'row', gap: 12 }}>
      {children}
    </View>
  );
}
export function errorAlert(error: unknown) {
  const { Alert } = require('react-native');
  Alert.alert('CueBracket', error instanceof Error ? error.message : String(error));
}
