# 课程时间设置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页新增「课程时间设置」入口，实现按上午/下午/晚上分区管理节次时间标签的页面，支持添加、删除节次，通过时间选择器修改起止时间。

**Architecture:** 新建 `app/timeLabelSetting.tsx` 独立页面（Expo Router 自动注册路由，同时在 `_layout.tsx` 中显式注册 Stack.Screen）。页面内部用本地 React state 管理三组节次数据，每次变更立即通过 `dispatch(SET_TIME_LABEL_LIST)` 写入 GlobalState（自动持久化到 AsyncStorage）。

**Tech Stack:** React Native 0.83, Expo Router 55, @ant-design/react-native (DatePicker), @expo/vector-icons (AntDesign), React Navigation (useNavigation)

---

## 文件清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `constants/theme.ts` | 新增 `TimeLabelColors` 导出 |
| 修改 | `app/_layout.tsx` | 注册 `timeLabelSetting` Stack.Screen |
| 修改 | `components/settingPage/scheduleSetting.tsx` | 更新最后一行 SettingBar |
| 新建 | `app/timeLabelSetting.tsx` | 课程时间设置页完整实现 |

---

## Task 1: 添加主题色 + 注册路由

**Files:**
- Modify: `constants/theme.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: 在 theme.ts 末尾新增 TimeLabelColors**

在 `constants/theme.ts` 文件末尾（`Fonts` 导出之后）追加：

```typescript
export const TimeLabelColors = {
  chipBg:        '#c9ebca',
  chipText:      '#2d6a4f',
  dotMorning:    '#FF9800',
  dotAfternoon:  '#6454ab',
  dotNight:      '#5856D6',
};
```

- [ ] **Step 2: 在 _layout.tsx 中注册新路由**

在 `app/_layout.tsx` 的 `Stack` 内，`jsonImport` 那行下方追加一行：

```tsx
<Stack.Screen name="timeLabelSetting" options={{ headerShown: false }} />
```

修改后 Stack 部分如下：

```tsx
<Stack style={{ paddingTop: insets.top }}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="jsonImport" options={{ presentation: 'modal', title: '导入JSON课表数据' }} />
  <Stack.Screen name="timeLabelSetting" options={{ headerShown: false }} />
</Stack>
```

- [ ] **Step 3: 提交**

```bash
git add constants/theme.ts app/_layout.tsx
git commit -m "feat: add TimeLabelColors and register timeLabelSetting route"
```

---

## Task 2: 更新设置页入口

**Files:**
- Modify: `components/settingPage/scheduleSetting.tsx`

- [ ] **Step 1: 添加导航函数，更新 SettingBar**

在 `scheduleSetting.tsx` 中，找到现有的 `goToJsonImport` 函数，在其下方添加：

```tsx
function goToTimeLabelSetting() {
    navigation.navigate('timeLabelSetting')
}
```

将最后一个 `SettingBar`（当前 title 为 `'上课时间'`）替换为：

```tsx
<SettingBar
    title={'课程时间设置'}
    detail={'设置每节课的上下课时间'}
    value={''}
    borderon={false}
    onPress={() => { goToTimeLabelSetting() }}
/>
```

- [ ] **Step 2: 手动验证**

启动 `npm run start`，进入设置页，确认：
- 最后一行显示标题「课程时间设置」，副文字「设置每节课的上下课时间」
- 点击后跳转（此时会报错因为页面未创建，属正常）

- [ ] **Step 3: 提交**

```bash
git add components/settingPage/scheduleSetting.tsx
git commit -m "feat: add timeLabelSetting navigation entry in settings"
```

---

## Task 3: 创建课程时间设置页

**Files:**
- Create: `app/timeLabelSetting.tsx`

- [ ] **Step 1: 创建文件，写入完整实现**

创建 `app/timeLabelSetting.tsx`，内容如下：

```tsx
import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DatePicker } from '@ant-design/react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useGlobalState } from '@/state/GlobalState';
import { TimeLabelColors } from '@/constants/theme';

type SectionKey = 'morning' | 'afternoon' | 'night';

type TimeLabelItem = {
  label: string;
  from: string;
  to: string;
  time: SectionKey;
};

type EditTarget = { section: SectionKey; index: number; field: 'from' | 'to' };

const SECTION_CONFIG: Record<SectionKey, { name: string; dot: string; defaultFrom: string }> = {
  morning:   { name: '上午', dot: TimeLabelColors.dotMorning,   defaultFrom: '08:00' },
  afternoon: { name: '下午', dot: TimeLabelColors.dotAfternoon, defaultFrom: '13:00' },
  night:     { name: '晚上', dot: TimeLabelColors.dotNight,     defaultFrom: '18:00' },
};

function parseTimeToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export default function TimeLabelSetting() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { state, dispatch } = useGlobalState();

  const [sections, setSections] = useState<Record<SectionKey, TimeLabelItem[]>>(() => ({
    morning:   state.timeLabelList.filter((t: TimeLabelItem) => t.time === 'morning'),
    afternoon: state.timeLabelList.filter((t: TimeLabelItem) => t.time === 'afternoon'),
    night:     state.timeLabelList.filter((t: TimeLabelItem) => t.time === 'night'),
  }));

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  function saveWithRelabeling(next: Record<SectionKey, TimeLabelItem[]>) {
    const merged = [
      ...next.morning,
      ...next.afternoon,
      ...next.night,
    ].map((item, i) => ({ ...item, label: String(i + 1) }));
    dispatch({ type: 'SET_TIME_LABEL_LIST', payload: merged });
  }

  function openPicker(section: SectionKey, index: number, field: 'from' | 'to') {
    setPickerValue(parseTimeToDate(sections[section][index][field]));
    setEditTarget({ section, index, field });
    setPickerVisible(true);
  }

  function onPickerOk(date: Date) {
    if (!editTarget) return;
    const { section, index, field } = editTarget;
    const next = {
      ...sections,
      [section]: sections[section].map((item, i) =>
        i === index ? { ...item, [field]: formatDateToTime(date) } : item
      ),
    };
    setSections(next);
    saveWithRelabeling(next);
    setPickerVisible(false);
  }

  function deleteRow(section: SectionKey, index: number) {
    const next = {
      ...sections,
      [section]: sections[section].filter((_, i) => i !== index),
    };
    setSections(next);
    saveWithRelabeling(next);
  }

  function addRow(section: SectionKey) {
    const list = sections[section];
    const lastTo = list.length > 0 ? list[list.length - 1].to : SECTION_CONFIG[section].defaultFrom;
    const newItem: TimeLabelItem = {
      label: '',
      from: addMinutes(lastTo, 5),
      to: addMinutes(addMinutes(lastTo, 5), 45),
      time: section,
    };
    const next = { ...sections, [section]: [...list, newItem] };
    setSections(next);
    saveWithRelabeling(next);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={18} color="#6454ab" />
          <Text style={styles.backText}>设置</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>课程时间设置</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {(['morning', 'afternoon', 'night'] as SectionKey[]).map(sectionKey => {
          const config = SECTION_CONFIG[sectionKey];
          const items = sections[sectionKey];
          return (
            <View key={sectionKey} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.dot, { backgroundColor: config.dot }]} />
                  <Text style={styles.sectionName}>{config.name}</Text>
                  <Text style={styles.sectionCount}>{items.length}节</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => addRow(sectionKey)}>
                  <AntDesign name="plus" size={12} color="#6454ab" />
                  <Text style={styles.addBtnText}>添加</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, index) => (
                <View
                  key={index}
                  style={[styles.row, index < items.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.labelPill}>
                    <Text style={styles.labelText}>第{item.label}节</Text>
                  </View>
                  <View style={styles.timePair}>
                    <TouchableOpacity
                      style={styles.timeChip}
                      onPress={() => openPicker(sectionKey, index, 'from')}
                    >
                      <Text style={styles.timeText}>{item.from}</Text>
                    </TouchableOpacity>
                    <Text style={styles.separator}>—</Text>
                    <TouchableOpacity
                      style={styles.timeChip}
                      onPress={() => openPicker(sectionKey, index, 'to')}
                    >
                      <Text style={styles.timeText}>{item.to}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => deleteRow(sectionKey, index)}>
                    <AntDesign name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <DatePicker
        visible={pickerVisible}
        value={pickerValue}
        precision="minute"
        onOk={onPickerOk}
        onVisibleChange={(v) => setPickerVisible(v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F4F4F8' },
  navHeader:   {
    height: 56, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2, width: 80, paddingLeft: 8 },
  backText:    { fontSize: 16, color: '#6454ab' },
  navTitle:    { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  navSpacer:   { width: 80 },
  scrollView:  { flex: 1 },
  content:     { padding: 16, gap: 16 },
  card:        {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardHeader:  {
    height: 50, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:         { width: 9, height: 9, borderRadius: 5 },
  sectionName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  sectionCount:{ fontSize: 12, color: '#A5A5A5' },
  addBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDE9F7', borderRadius: 16,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  addBtnText:  { fontSize: 12, fontWeight: '500', color: '#6454ab' },
  row:         {
    height: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
  },
  rowBorder:   { borderBottomWidth: 1, borderBottomColor: '#F7F7F7' },
  labelPill:   { backgroundColor: '#F4F4F8', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  labelText:   { fontSize: 12, fontWeight: '500', color: '#575757' },
  timePair:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeChip:    { backgroundColor: TimeLabelColors.chipBg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  timeText:    { fontSize: 14, fontWeight: '600', color: TimeLabelColors.chipText },
  separator:   { fontSize: 13, color: '#CCCCCC' },
});
```

- [ ] **Step 2: 手动验证完整流程**

启动 `npm run start`，用手机打开 App，按以下步骤逐一检查：

| 场景 | 预期结果 |
|---|---|
| 进入设置页 | 最后一行显示「课程时间设置」 |
| 点击「课程时间设置」 | 跳转到新页面，显示上午/下午/晚上三个卡片，共 12 节 |
| 点击任意时间 chip | 弹出时间选择器（时:分），默认值为该 chip 当前时间 |
| 选择新时间确认 | chip 显示更新后的时间，关闭选择器 |
| 点击取消/关闭选择器 | chip 时间不变 |
| 点击删除图标 | 该节次行消失，剩余节次 label 重新编号（连续） |
| 点击「添加」 | 在对应节区末尾追加新行，from = 上一节 to + 5min，to = from + 45min |
| 返回设置页后重进 | 课程时间设置页仍显示最新状态（数据已持久化） |
| 重启 App | 修改过的时间标签依然生效（AsyncStorage 持久化验证） |

- [ ] **Step 3: 提交**

```bash
git add app/timeLabelSetting.tsx
git commit -m "feat: implement 课程时间设置 page with add/delete/time-picker"
```

---

## 完成

所有任务完成后，共 3 次提交，功能完整可用。
