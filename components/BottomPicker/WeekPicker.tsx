import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';
import { BottomPickerColors } from '@/constants/theme';

const WEEK_ITEMS = Array.from({ length: 40 }, (_, i) => `${i + 1}周`);

interface WeekPickerProps {
  visible: boolean;
  value: number;           // 1-40
  onConfirm: (week: number) => void;
  onCancel: () => void;
}

export default function WeekPicker({
  visible,
  value,
  onConfirm,
  onCancel,
}: WeekPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, Math.min(value - 1, 39))
  );

  // visible 变化时重置为外部 value（防止上次取消残留）
  useEffect(() => {
    if (visible) {
      setSelectedIndex(Math.max(0, Math.min(value - 1, 39)));
    }
  }, [visible]);

  function handleConfirm() {
    onConfirm(selectedIndex + 1);
  }

  return (
    <BottomPickerBase
      visible={visible}
      title="本学期总周数"
      onCancel={onCancel}
      onConfirm={handleConfirm}
      hint="滚动选择周数（1-40）"
    >
      <View style={styles.body}>
        <PickerColumn
          items={WEEK_ITEMS}
          selectedIndex={selectedIndex}
          onIndexChange={setSelectedIndex}
        />
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>周</Text>
      </View>
    </BottomPickerBase>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    paddingHorizontal: 60,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    color: BottomPickerColors.textSecondary,
  },
});
