import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';
import { BottomPickerColors } from '@/constants/theme';

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

interface TimePickerProps {
  visible: boolean;
  value: string;           // "HH:MM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export default function TimePicker({
  visible,
  value,
  onConfirm,
  onCancel,
}: TimePickerProps) {
  const [h, m] = value.split(':').map(Number);
  const [hourIndex, setHourIndex] = useState(h ?? 8);
  const [minuteIndex, setMinuteIndex] = useState(m ?? 0);

  useEffect(() => {
    if (visible) {
      const [hh, mm] = value.split(':').map(Number);
      setHourIndex(hh ?? 8);
      setMinuteIndex(mm ?? 0);
    }
  }, [visible, value]);

  function handleConfirm() {
    const time = `${String(hourIndex).padStart(2, '0')}:${String(minuteIndex).padStart(2, '0')}`;
    onConfirm(time);
  }

  return (
    <BottomPickerBase
      visible={visible}
      title="上课时间"
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <View style={styles.body}>
        <PickerColumn
          items={HOURS}
          selectedIndex={hourIndex}
          onIndexChange={setHourIndex}
        />
        <View style={styles.separator}>
          <Text style={styles.colon}>:</Text>
        </View>
        <PickerColumn
          items={MINUTES}
          selectedIndex={minuteIndex}
          onIndexChange={setMinuteIndex}
        />
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>时</Text>
        <Text style={styles.label}>分</Text>
      </View>
    </BottomPickerBase>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  separator: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colon: {
    fontSize: 20,
    fontWeight: '700',
    color: BottomPickerColors.textPrimary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    color: BottomPickerColors.textSecondary,
  },
});
