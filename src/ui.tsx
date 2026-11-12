import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  findNodeHandle,
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  type TextInputProps,
  useWindowDimensions,
} from 'react-native';
import { theme } from './theme';
import AppIcon, { type IconName } from './components/AppIcon';
import { MotionPressable, Reveal, useFeedback, useReducedMotion } from './motion';
export {
  MotionProvider,
  MotionPressable,
  Reveal,
  useFeedback,
  useListMotion,
  useReducedMotion,
} from './motion';
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
  title: { fontSize: theme.type.title, fontWeight: '700', letterSpacing: -0.5, color: C.white },
  heading: { fontSize: theme.type.heading, fontWeight: '600', letterSpacing: -0.4, color: C.white },
  subtitle: { fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    marginBottom: 12,
  },
  text: { color: C.white, fontSize: theme.type.body, lineHeight: 24 },
  muted: { color: C.muted, fontSize: theme.type.small, lineHeight: 21 },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    color: C.white,
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    minHeight: 52,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: {
    minHeight: 50,
    maxWidth: '100%',
    backgroundColor: C.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: C.bg, fontWeight: '600', fontSize: 16, textAlign: 'center', flexShrink: 1 },
  secondary: { backgroundColor: C.raised, borderColor: C.border, borderWidth: 1 },
  pill: {
    minHeight: theme.touch,
    minWidth: theme.touch,
    maxWidth: '100%',
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: theme.radius.sm,
    backgroundColor: C.card,
    marginRight: 8,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    justifyContent: 'center',
  },
  pillOn: { borderBottomColor: C.green, backgroundColor: C.raised },
  pillText: { color: C.white, fontWeight: '600', fontSize: 14 },
});
export function AppHeader({
  title,
  subtitle,
  onBack,
  brand,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  brand?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={[styles.row, { minHeight: 48 }]}>
        {onBack ? (
          <MotionPressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
          >
            <AppIcon name="arrow-left" />
          </MotionPressable>
        ) : null}
        {brand ? (
          <Image
            source={require('../assets/brand/cuebracket-logo.png')}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
            accessible={false}
          />
        ) : null}
        <Text accessibilityRole="header" style={[styles.title, { flex: 1 }]}>
          {title}
        </Text>
      </View>
      {subtitle ? <Text style={[styles.muted, { marginTop: 4 }]}>{subtitle}</Text> : null}
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
  brand,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  scrollToTopKey?: string | number | null;
  footer?: React.ReactNode;
  brand?: boolean;
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
        <AppHeader title={title} subtitle={subtitle} onBack={onBack} brand={brand} />
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
  icon,
  iconOnly,
  haptic,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  danger?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
  haptic?: 'selection' | 'confirm';
}) {
  return (
    <MotionPressable
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { flexDirection: 'row', gap: 10 },
        secondary && styles.secondary,
        disabled && { backgroundColor: C.raised },
      ]}
    >
      {icon ? (
        <AppIcon
          name={icon}
          size={20}
          color={disabled ? C.muted : secondary ? (danger ? C.danger : C.white) : C.bg}
        />
      ) : null}
      {!iconOnly ? (
        <Text
          style={[
            styles.buttonText,
            secondary && { color: danger ? C.danger : C.white },
            disabled && { color: C.muted },
          ]}
        >
          {title}
        </Text>
      ) : null}
    </MotionPressable>
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
  const feedback = useFeedback();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {options.map((option) => (
        <MotionPressable
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ checked: value === option.value }}
          key={option.value}
          onPress={() => {
            if (value !== option.value) {
              feedback('selection');
              onChange(option.value);
            }
          }}
          style={[styles.pill, value === option.value && styles.pillOn]}
        >
          <Text style={[styles.pillText, value === option.value && { color: C.green }]}>
            {option.label}
          </Text>
        </MotionPressable>
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
    <View style={[styles.card, highlight && { borderLeftWidth: 3, borderLeftColor: C.green }]}>
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
    <Text
      style={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        color: tone === 'gold' ? C.gold : tone === 'muted' ? C.muted : C.green,
        fontSize: 13,
        fontWeight: '600',
      }}
    >
      {label}
    </Text>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap', marginTop: 24, marginBottom: 12 }]}>
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
        <Text style={styles.heading}>{title}</Text>
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
    <View style={{ marginBottom: 16 }}>
      <StatusBadge label={`Step ${step} of 6 · ${labels[step - 1]}`} />
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 14 }}>
        {labels.map((label, index) => (
          <View
            key={label}
            style={{
              flex: 1,
              height: 2,
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
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [present, setPresent] = useState(visible);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const previousVisible = useRef(visible);
  const heading = useRef<Text>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const animate = useCallback(
    (open: boolean, notify = false) => {
      progress.stopAnimation();
      closingRef.current = !open;
      setClosing(!open);
      if (!open) Keyboard.dismiss();
      const finish = ({ finished }: { finished: boolean }) => {
        if (!finished) return;
        if (open) {
          const handle = findNodeHandle(heading.current);
          if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
        } else {
          setPresent(false);
          if (notify) closeCallback.current();
        }
      };
      if (reduced) {
        progress.setValue(open ? 1 : 0);
        finish({ finished: true });
      } else
        Animated.timing(progress, {
          toValue: open ? 1 : 0,
          duration: theme.motion.sheet,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(finish);
    },
    [progress, reduced],
  );
  useEffect(() => {
    const reopening = visible && !previousVisible.current;
    previousVisible.current = visible;
    if (visible) {
      setPresent(true);
      if (present) {
        // A motion-setting change must finish an in-flight dismissal, not reopen it.
        if (closingRef.current && !reopening) animate(false, true);
        else animate(true);
      }
    } else if (present) animate(false);
  }, [visible, present, animate]);
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const dismiss = () => {
    if (!closingRef.current) animate(false, true);
  };
  if (!present) return null;
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
      onShow={() => {
        if (!closingRef.current) animate(true);
      }}
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={dismiss}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents={closing ? 'none' : 'auto'}
          accessibilityViewIsModal
          style={[
            {
              backgroundColor: C.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              maxHeight: '85%',
            },
            {
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) },
              ],
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text ref={heading} accessible accessibilityRole="header" style={styles.heading}>
              {title}
            </Text>
            {children}
            <Btn title="Close" secondary onPress={dismiss} />
          </ScrollView>
        </Animated.View>
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
  nameHeight = 0,
  onNameLayout,
}: {
  name: string;
  score: number;
  winner: boolean;
  nameHeight?: number;
  onNameLayout?: (height: number) => void;
}) {
  return (
    <Reveal change={score} kind="score">
      <View style={{ alignItems: 'center' }}>
        <View style={{ minHeight: nameHeight, width: '100%', justifyContent: 'center' }}>
          <Text
            onLayout={(event) => onNameLayout?.(Math.ceil(event.nativeEvent.layout.height))}
            style={[styles.heading, { textAlign: 'center' }]}
          >
            {name}
          </Text>
        </View>
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
        <Text
          style={{ color: winner ? C.green : C.muted, fontSize: 13, lineHeight: 20, minHeight: 20 }}
        >
          {winner ? 'Winning score' : 'Racks / frames'}
        </Text>
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
