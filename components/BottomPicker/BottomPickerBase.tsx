import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomPickerColors } from '@/constants/theme';

interface BottomPickerBaseProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
  hint?: string;
}

export default function BottomPickerBase({
  visible,
  title,
  onCancel,
  onConfirm,
  children,
  hint,
}: BottomPickerBaseProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  function handleCancel() {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onCancel());
  }

  function handleConfirm() {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onConfirm());
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.overlay}
      >
        <Pressable style={{ flex: 1 }} onPress={handleCancel} />
        <Animated.View
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* 拖拽把手 */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} hitSlop={12}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.titleText}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} hitSlop={12}>
              <Text style={styles.confirmText}>确认</Text>
            </TouchableOpacity>
          </View>

          {/* 内容（列） */}
          {children}

          {/* 提示文字 */}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <View style={styles.bottomSafe} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BottomPickerColors.backdrop,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: BottomPickerColors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleRow: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BottomPickerColors.handle,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BottomPickerColors.headerDivider,
  },
  cancelText: {
    fontSize: 15,
    color: BottomPickerColors.textSecondary,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: BottomPickerColors.textPrimary,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: BottomPickerColors.textConfirm,
  },
  hint: {
    fontSize: 11,
    color: BottomPickerColors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  bottomSafe: {
    height: 20,
  },
});
