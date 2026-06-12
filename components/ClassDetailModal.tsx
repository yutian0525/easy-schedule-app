import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomPickerColors } from '@/constants/theme';

type TimeLabelItem = {
  label: string;
  from: string;
  to: string;
  time: 'morning' | 'afternoon' | 'night';
};

type ClassInfo = {
  className?: string;
  teacher?: string;
  location?: string;
  classRoom?: string;
  fromTo?: number[];
  time?: number[];
  colorSheet?: { highlight?: string; background?: string };
};

type Props = {
  visible: boolean;
  classInfo: ClassInfo | null;
  timeLabelList: TimeLabelItem[];
  onClose: () => void;
};

function getRange(info: ClassInfo): [number, number] | null {
  const r = info.fromTo ?? info.time;
  if (!r || r.length < 2) return null;
  return [r[0], r[1]];
}

function getTimeRangeText(
  range: [number, number],
  timeLabelList: TimeLabelItem[]
): string | null {
  const start = timeLabelList.find((t) => t.label === String(range[0]));
  const end = timeLabelList.find((t) => t.label === String(range[1]));
  if (!start || !end) return null;
  return `${start.from} - ${end.to}`;
}

const ClassDetailModal = ({ visible, classInfo, timeLabelList, onClose }: Props) => {
  const range = classInfo ? getRange(classInfo) : null;
  const sectionText = range
    ? range[0] === range[1]
      ? `第 ${range[0]} 节`
      : `第 ${range[0]}-${range[1]} 节`
    : null;
  const timeRangeText = range ? getTimeRangeText(range, timeLabelList) : null;
  const accentColor = classInfo?.colorSheet?.highlight ?? BottomPickerColors.textConfirm;
  const room = classInfo?.location ?? classInfo?.classRoom ?? '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.modalOverlay}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.modalCard}>
          {classInfo && (
            <>
              <View style={styles.titleRow}>
                <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
                <Text style={styles.title} numberOfLines={2}>
                  {classInfo.className ?? '-'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>教师</Text>
                <Text style={styles.fieldValue}>{classInfo.teacher || '-'}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>教室</Text>
                <Text style={styles.fieldValue}>{room || '-'}</Text>
              </View>

              {sectionText && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>节次</Text>
                  <Text style={styles.fieldValue}>{sectionText}</Text>
                </View>
              )}

              {timeRangeText && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>时间</Text>
                  <Text style={styles.fieldValue}>{timeRangeText}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BottomPickerColors.backdrop,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: BottomPickerColors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: BottomPickerColors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BottomPickerColors.headerDivider,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    width: 56,
    fontSize: 14,
    color: BottomPickerColors.textSecondary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: BottomPickerColors.textPrimary,
  },
});

export default ClassDetailModal;
