import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from './theme';

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

let lastFeedback = 0;
export function useFeedback() {
  const reduced = useReducedMotion();
  return (kind: 'selection' | 'confirm' = 'selection') => {
    if (reduced || Platform.OS !== 'android' || Date.now() - lastFeedback < 80) return;
    lastFeedback = Date.now();
    void Haptics.performAndroidHapticsAsync(
      kind === 'confirm' ? Haptics.AndroidHaptics.Confirm : Haptics.AndroidHaptics.Segment_Tick,
    ).catch(() => {});
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function MotionPressable({
  style,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  haptic,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  haptic?: 'selection' | 'confirm';
}) {
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || disabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [reduced, disabled, scale]);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const animate = (value: number) => {
    scale.stopAnimation();
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, {
      toValue: value,
      duration: theme.motion.press,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        animate(0.985);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) feedback(haptic);
        onPress?.(event);
      }}
      style={[
        style,
        {
          transform: [{ scale }],
          opacity: scale.interpolate({
            inputRange: [0.985, 1],
            outputRange: [0.88, 1],
            extrapolate: 'clamp',
          }),
        },
      ]}
    />
  );
}

export function Reveal({
  children,
  change,
  kind = 'content',
}: React.PropsWithChildren<{ change?: string | number; kind?: 'content' | 'score' | 'champion' }>) {
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: kind === 'champion' ? theme.motion.success : theme.motion.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [change, kind, progress, reduced]);
  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
        transform:
          kind === 'score'
            ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }]
            : [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [kind === 'champion' ? 8 : 4, 0],
                  }),
                },
              ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function useListMotion() {
  const reduced = useReducedMotion();
  return () => {
    if (reduced) return;
    LayoutAnimation.configureNext({
      duration: theme.motion.reveal,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
  };
}
