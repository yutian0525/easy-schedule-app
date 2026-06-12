# BottomPicker 组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用统一紫色主题的自定义底部 Picker 替换三处 `@ant-design/react-native` Picker/DatePicker，实现视觉一致性。

**Architecture:** 统一底层 `BottomPickerBase`（遮罩 + 卡片 + Header + 动画）+ 单列滚轮 `PickerColumn`（ScrollView snapToInterval）；三个业务封装 `WeekPicker` / `TimePicker` / `DatePickerSheet` 组合上述基础件后暴露简洁 API，调用方改动最小。

**Tech Stack:** React Native 0.81, TypeScript, `Animated` (react-native), `ScrollView` (snapToInterval + momentumScrollEnd), Expo SDK 54

---

## 文件清单

| 操作 | 路径 | 职责 |
|------|------|------|
| 新建 | `components/BottomPicker/BottomPickerBase.tsx` | 遮罩、底部卡片、拖拽把手、Header、滑入/滑出动画 |
| 新建 | `components/BottomPicker/PickerColumn.tsx` | 单列滚轮，高亮背景条，snapToInterval |
| 新建 | `components/BottomPicker/WeekPicker.tsx` | 周数选择封装（1-40） |
| 新建 | `components/BottomPicker/TimePicker.tsx` | 时间选择封装（HH:MM 双列） |
| 新建 | `components/BottomPicker/DatePickerSheet.tsx` | 日期选择封装（年/月/日 三列，月联动） |
| 修改 | `components/settingPage/scheduleSetting.tsx` | 替换 Picker / DatePicker |
| 修改 | `app/timeLabelSetting.tsx` | 替换 Picker，onPickerOk 接收 string |

---

## Task 1：BottomPickerBase

**Files:**
- Create: `components/BottomPicker/BottomPickerBase.tsx`

- [ ] **Step 1：创建文件，写入完整实现**

```tsx
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E0E0E0',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelText: {
    fontSize: 15,
    color: '#A5A5A5',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6454ab',
  },
  hint: {
    fontSize: 11,
    color: '#A5A5A5',
    textAlign: 'center',
    paddingVertical: 8,
  },
  bottomSafe: {
    height: 20,
  },
});
```

- [ ] **Step 2：启动 Expo 开发服务器并目视确认文件无编译错误**

```bash
cd scheduleAPP && npm run start
```

预期：终端无 TypeScript 报错，Metro bundler 正常启动。

- [ ] **Step 3：提交**

```bash
git add components/BottomPicker/BottomPickerBase.tsx
git commit -m "feat: 添加 BottomPickerBase 底层容器组件"
```

---

## Task 2：PickerColumn

**Files:**
- Create: `components/BottomPicker/PickerColumn.tsx`

- [ ] **Step 1：创建文件**

```tsx
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PADDING = ((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT; // 88

interface PickerColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export default function PickerColumn({
  items,
  selectedIndex,
  onIndexChange,
}: PickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  // 初始定位，无动画
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    });
  }, []);

  // 外部 selectedIndex 变化时同步（例如月联动时日列更新）
  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: true,
    });
  }, [selectedIndex]);

  function handleMomentumScrollEnd(e: any) {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onIndexChange(clamped);
  }

  return (
    <View style={styles.container}>
      {/* 高亮背景条 */}
      <View
        style={[styles.highlight, { top: PADDING }]}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isSelected ? styles.selectedText : styles.unselectedText,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: VISIBLE_COUNT * ITEM_HEIGHT,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: '#EDE9F7',
    borderRadius: 8,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
  selectedText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  unselectedText: {
    fontSize: 15,
    fontWeight: 'normal',
    color: '#A5A5A5',
  },
});
```

- [ ] **Step 2：检查编译**

保存后观察 Metro 终端，确认无红色错误。

- [ ] **Step 3：提交**

```bash
git add components/BottomPicker/PickerColumn.tsx
git commit -m "feat: 添加 PickerColumn 滚轮列组件"
```

---

## Task 3：WeekPicker

**Files:**
- Create: `components/BottomPicker/WeekPicker.tsx`

- [ ] **Step 1：创建文件**

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';

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
  React.useEffect(() => {
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
    color: '#A5A5A5',
  },
});
```

- [ ] **Step 2：在 scheduleSetting.tsx 临时引入 WeekPicker 并目视验证**

打开 `components/settingPage/scheduleSetting.tsx`，在文件顶部 import 列表末尾临时添加（不删除旧 Picker）：

```tsx
import WeekPicker from '@/components/BottomPicker/WeekPicker';
```

在 return 内任意位置添加：

```tsx
<WeekPicker
  visible={circleVisible}
  value={parseInt(currectWeek[0])}
  onConfirm={(week) => {
    setCircleVisible(false);
    dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: [0, week] });
  }}
  onCancel={() => setCircleVisible(false)}
/>
```

在手机/模拟器上点击「本学期总周数」，确认：
- 底部弹起白色卡片，有拖拽把手
- Header：取消（灰）/ 本学期总周数（黑加粗）/ 确认（紫）
- 滚轮显示周数，选中项有紫色背景高亮
- 点「确认」关闭并更新值；点「取消」关闭不更新；点遮罩关闭

- [ ] **Step 3：提交（含临时集成）**

```bash
git add components/BottomPicker/WeekPicker.tsx components/settingPage/scheduleSetting.tsx
git commit -m "feat: 添加 WeekPicker，临时集成验证"
```

---

## Task 4：TimePicker

**Files:**
- Create: `components/BottomPicker/TimePicker.tsx`

- [ ] **Step 1：创建文件**

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';

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

  React.useEffect(() => {
    if (visible) {
      const [hh, mm] = value.split(':').map(Number);
      setHourIndex(hh ?? 8);
      setMinuteIndex(mm ?? 0);
    }
  }, [visible]);

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
    color: '#1A1A2E',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#A5A5A5',
  },
});
```

- [ ] **Step 2：在 timeLabelSetting.tsx 临时引入并目视验证**

打开 `app/timeLabelSetting.tsx`，在文件顶部 import 末尾添加：

```tsx
import TimePicker from '@/components/BottomPicker/TimePicker';
```

找到 `<Picker ... />` 组件（约第 353 行），在其下方临时添加：

```tsx
<TimePicker
  visible={pickerVisible}
  value={
    editTarget
      ? sections[editTarget.section][editTarget.index][editTarget.field]
      : '08:00'
  }
  onConfirm={(time) => {
    if (!editTarget) return;
    const [hStr, mStr] = time.split(':');
    onPickerOk([hStr, mStr]);
    setPickerVisible(false);
  }}
  onCancel={() => setPickerVisible(false)}
/>
```

在模拟器上进入「课程时间设置」，点击任意时间芯片，确认：
- 双列滚轮弹出，冒号居中
- 初始定位到当前时间值
- 确认后时间更新正确

- [ ] **Step 3：提交（含临时集成）**

```bash
git add components/BottomPicker/TimePicker.tsx app/timeLabelSetting.tsx
git commit -m "feat: 添加 TimePicker，临时集成验证"
```

---

## Task 5：DatePickerSheet

**Files:**
- Create: `components/BottomPicker/DatePickerSheet.tsx`

- [ ] **Step 1：创建文件**

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomPickerBase from './BottomPickerBase';
import PickerColumn from './PickerColumn';

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

  // 月份变化时 clamp 日期
  useEffect(() => {
    if (dayIndex >= daysCount) {
      setDayIndex(daysCount - 1);
    }
  }, [monthIndex, yearIndex]);

  // visible 变化时重置
  useEffect(() => {
    if (visible) {
      setYearIndex(Math.max(0, value.getFullYear() - minYear));
      setMonthIndex(value.getMonth());
      setDayIndex(value.getDate() - 1);
    }
  }, [visible]);

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
    color: '#A5A5A5',
  },
});
```

- [ ] **Step 2：在 scheduleSetting.tsx 临时引入并目视验证**

打开 `components/settingPage/scheduleSetting.tsx`，在 import 列表末尾添加：

```tsx
import DatePickerSheet from '@/components/BottomPicker/DatePickerSheet';
```

在 return 内 `<WeekPicker ... />` 下方添加：

```tsx
<DatePickerSheet
  visible={timeSelectVisible}
  value={
    new Date(
      activeSchedule.startDate[0],
      activeSchedule.startDate[1],
      activeSchedule.startDate[2]
    )
  }
  minDate={new Date(new Date().getFullYear() - 1, 0, 1)}
  maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
  onConfirm={(date) => {
    setTimeSelectVisible(false);
    dispatch({
      type: 'SET_START_DATE',
      payload: [date.getFullYear(), date.getMonth(), date.getDate()],
    });
  }}
  onCancel={() => setTimeSelectVisible(false)}
/>
```

在模拟器上点击「开始上课时间」，确认：
- 三列滚轮弹出，初始定位正确
- 年份列滚动后月份列保持，日期列 clamp 处理正确（如 1月→2月时31日变成28/29日）
- 确认后日期更新正确

- [ ] **Step 3：提交（含临时集成）**

```bash
git add components/BottomPicker/DatePickerSheet.tsx components/settingPage/scheduleSetting.tsx
git commit -m "feat: 添加 DatePickerSheet，临时集成验证"
```

---

## Task 6：完整替换 scheduleSetting.tsx

**Files:**
- Modify: `components/settingPage/scheduleSetting.tsx`

- [ ] **Step 1：移除旧 Picker / DatePicker，清理 import**

打开 `components/settingPage/scheduleSetting.tsx`，做以下改动：

**删除这两行 import：**
```tsx
import { Picker } from '@ant-design/react-native';
import { DatePicker } from '@ant-design/react-native';
```

**保留并确认这两行 import 存在：**
```tsx
import WeekPicker from '@/components/BottomPicker/WeekPicker';
import DatePickerSheet from '@/components/BottomPicker/DatePickerSheet';
```

**删除旧的 `<Picker .../>` 和 `<DatePicker .../>` 两个组件（约在 return 末尾 95-120 行）：**

找到并删除：
```tsx
<Picker
  data={circleSelectList}
  cols={1}
  onChange={() => {}}
  onVisibleChange={(v: boolean) => { setCircleVisible(v); }}
  visible={circleVisible}
  value={currectWeek}
  onOk={(v: any) => {
    setCircleVisible(false);
    dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: [0, parseInt(v[0])] });
  }}
/>
<DatePicker
  visible={timeSelectVisible}
  value={new Date((activeSchedule as any).startDate[0], (activeSchedule as any).startDate[1], (activeSchedule as any).startDate[2])}
  precision="day"
  minDate={new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())}
  maxDate={new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())}
  onChange={() => {}}
  onVisibleChange={(visible: boolean) => { setTimeSelectVisible(visible); }}
  onOk={(date: Date) => {
    setTimeSelectVisible(false);
    dispatch({ type: 'SET_START_DATE', payload: [date.getFullYear(), date.getMonth(), date.getDate()] });
  }}
  format="YYYY-MM-DD"
/>
```

**同时删除现在未使用的辅助代码（`dataInit` 函数和 `circleSelectList` / `currectWeek` 变量）：**

删除以下代码块：
```tsx
const currectWeek = [(activeSchedule as any).schedulePeriod[1].toString()];

function dataInit() {
  const temp = [];
  for (let i = 1; i < 41; i++) {
    temp.push({ label: i.toString(), value: i });
  }
  return temp;
}
const circleSelectList = dataInit();
```

- [ ] **Step 2：运行 lint 确认无错误**

```bash
cd scheduleAPP && npm run lint
```

预期：0 errors，0 warnings（或仅有已知的非 Picker 相关警告）。

- [ ] **Step 3：在模拟器上做回归测试**

进入「设置」页，测试：
1. 点「本学期总周数」→ WeekPicker 弹出，确认更新值，取消不更新 ✓
2. 点「开始上课时间」→ DatePickerSheet 弹出，确认更新日期 ✓
3. 两个 Picker 均无旧 ant-design 样式残留 ✓

- [ ] **Step 4：提交**

```bash
git add components/settingPage/scheduleSetting.tsx
git commit -m "refactor: scheduleSetting 完整替换为自定义 BottomPicker"
```

---

## Task 7：完整替换 timeLabelSetting.tsx

**Files:**
- Modify: `app/timeLabelSetting.tsx`

- [ ] **Step 1：移除旧 Picker，更新 onPickerOk 签名**

打开 `app/timeLabelSetting.tsx`，做以下改动：

**删除旧 import：**
```tsx
import { Picker, PickerValue } from '@ant-design/react-native';
```

**确认新 import 存在（Task 4 已添加）：**
```tsx
import TimePicker from '@/components/BottomPicker/TimePicker';
```

**修改 `onPickerOk` 函数签名**，从接收 `PickerValue[]` 改为接收 `string`：

旧代码（约第 183 行）：
```tsx
function onPickerOk(v: PickerValue[]) {
  if (!editTarget) return;
  const { section, index, field } = editTarget;
  const next = {
    ...sections,
    [section]: sections[section].map((item, i) =>
      i === index ? { ...item, [field]: `${v[0]}:${v[1]}` } : item
    ),
  };
  setSections(next);
  saveWithRelabeling(next);
  setPickerVisible(false);
}
```

改为：
```tsx
function onPickerOk(time: string) {
  if (!editTarget) return;
  const { section, index, field } = editTarget;
  const next = {
    ...sections,
    [section]: sections[section].map((item, i) =>
      i === index ? { ...item, [field]: time } : item
    ),
  };
  setSections(next);
  saveWithRelabeling(next);
  setPickerVisible(false);
}
```

**删除旧的 `<Picker ... />` 组件**（约第 353 行）：

删除：
```tsx
<Picker
  data={TIME_PICKER_DATA}
  cols={2}
  cascade={false}
  visible={pickerVisible}
  value={pickerValue}
  onOk={(v: PickerValue[]) => onPickerOk(v)}
  onVisibleChange={(v) => setPickerVisible(v)}
/>
```

**更新 Task 4 添加的临时 TimePicker 调用**，让它直接调用 `onPickerOk`：

将 TimePicker 的 `onConfirm` 回调改为：
```tsx
onConfirm={(time) => {
  onPickerOk(time);
}}
```

**删除现在未使用的变量和常量：**

删除以下代码：
```tsx
const [pickerValue, setPickerValue] = useState<PickerValue[]>(["08", "00"]);
```

以及文件顶部的常量（约第 49-59 行）：
```tsx
const TIME_PICKER_DATA = [
  Array.from({ length: 24 }, (_, i) => ({
    key: `h${i}`,
    label: String(i).padStart(2, "0"),
    value: String(i).padStart(2, "0"),
  })),
  Array.from({ length: 60 }, (_, i) => ({
    key: `m${i}`,
    label: String(i).padStart(2, "0"),
    value: String(i).padStart(2, "0"),
  })),
];
```

- [ ] **Step 2：运行 lint**

```bash
npm run lint
```

预期：0 errors。

- [ ] **Step 3：在模拟器上做回归测试**

进入「课程时间设置」页，测试：
1. 点击任意节次的开始时间芯片 → TimePicker 弹出，定位到当前时间 ✓
2. 滚动调整时间，点「确认」→ 时间芯片更新 ✓
3. 点「取消」→ 时间不变 ✓
4. 跨时段（上午/下午/晚上）各测一次 ✓
5. 无旧 ant-design Picker 弹出 ✓

- [ ] **Step 4：提交**

```bash
git add app/timeLabelSetting.tsx
git commit -m "refactor: timeLabelSetting 完整替换为自定义 TimePicker"
```

---

## Task 8：清理与最终验证

**Files:**
- 无新文件，最终整体回归

- [ ] **Step 1：确认 @ant-design/react-native Picker 相关 import 已全部移除**

```bash
grep -r "ant-design/react-native" scheduleAPP/components/settingPage/scheduleSetting.tsx scheduleAPP/app/timeLabelSetting.tsx
```

预期：无输出。

- [ ] **Step 2：确认无 TypeScript 类型错误**

```bash
cd scheduleAPP && npx tsc --noEmit
```

预期：无错误（或仅有已知的项目级别警告）。

- [ ] **Step 3：全流程手动回归**

在模拟器/真机上完整测试以下路径：

| 路径 | 验证点 |
|------|--------|
| 设置 → 本学期总周数 | WeekPicker 弹出，高亮背景条可见，滑入/滑出有动画，值正确更新 |
| 设置 → 开始上课时间 | DatePickerSheet 弹出，三列，月末日期 clamp 正确 |
| 课程时间设置 → 任意时间芯片 | TimePicker 弹出，双列 + 冒号，值正确更新 |
| 以上所有场景 → 点遮罩 | 关闭，值不变 |
| 以上所有场景 → 点取消 | 关闭，值不变 |

- [ ] **Step 4：最终提交**

```bash
git add -A
git commit -m "feat: 完成 BottomPicker 自定义组件全部替换"
```

---

## 已知注意事项

- `DatePickerSheet` 的 `title` 硬编码为「开始上课时间」；若未来其他场景复用需改为 prop（超出本次范围）。
- 本次不移除 `@ant-design/react-native` 依赖，因为项目其他地方（如根布局 `Provider`）仍在使用。
- `PickerColumn` 的 `selectedIndex` 外部变化联动（`useEffect`）仅对日期列 clamp 有意义；时间/周数场景不触发该效果。
