import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';
import { BottomPickerColors } from '@/constants/theme';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface DatePickerSheetProps {
  visible: boolean;
  value: Date;
  minDate?: Date;
  maxDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export default function DatePickerSheet({
  visible,
  value,
  minDate,
  maxDate,
  onConfirm,
  onCancel,
}: DatePickerSheetProps) {
  const minYear = minDate?.getFullYear() ?? new Date().getFullYear() - 1;
  const maxYear = maxDate?.getFullYear() ?? new Date().getFullYear() + 1;
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => String(minYear + i)
  );
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

  const [yearIndex, setYearIndex] = useState(
    Math.max(0, value.getFullYear() - minYear)
  );
  const [monthIndex, setMonthIndex] = useState(value.getMonth());
  const [dayIndex, setDayIndex] = useState(value.getDate() - 1);

  // 计算当前年月的天数列表
  const currentYear = minYear + yearIndex;
  const daysCount = getDaysInMonth(currentYear, monthIndex);
  const days = Array.from({ length: daysCount }, (_, i) => `${i + 1}日`);

  // 月份/年份变化时 clamp 日期
  useEffect(() => {
    setDayIndex(prev => (prev >= daysCount ? daysCount - 1 : prev));
  }, [monthIndex, yearIndex, daysCount]);

  // visible 变化时重置
  useEffect(() => {
    if (visible) {
      setYearIndex(Math.max(0, value.getFullYear() - minYear));
      setMonthIndex(value.getMonth());
      setDayIndex(value.getDate() - 1);
    }
  }, [visible, value, minYear]);

  function handleConfirm() {
    const year = minYear + yearIndex;
    const month = monthIndex;
    const day = Math.min(dayIndex + 1, getDaysInMonth(year, month));
    onConfirm(new Date(year, month, day));
  }

  return (
    <BottomPickerBase
      visible={visible}
      title="开始上课时间"
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <View style={styles.body}>
        <PickerColumn
          items={years}
          selectedIndex={yearIndex}
          onIndexChange={setYearIndex}
        />
        <PickerColumn
          items={months}
          selectedIndex={monthIndex}
          onIndexChange={setMonthIndex}
        />
        <PickerColumn
          items={days}
          selectedIndex={dayIndex}
          onIndexChange={setDayIndex}
        />
      </View>
      <View style={styles.labelRow}>
        {['年', '月', '日'].map((lbl) => (
          <Text key={lbl} style={styles.label}>{lbl}</Text>
        ))}
      </View>
    </BottomPickerBase>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    color: BottomPickerColors.textSecondary,
  },
});
