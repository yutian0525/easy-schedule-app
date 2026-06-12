# 课表编辑页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `app/courseEdit.tsx` 课表编辑页，支持课程增删改及 AI JSON 批量导入，从设置页进入。

**Architecture:** 单页全量管理——课程平铺列表展示，增删改通过标准底部弹窗完成（含文本输入、星期/节次/颜色/上课周次四类控件），AI 导入复用 timeLabelSetting 的提示词复制 + JSON 粘贴流程，数据变更通过 `dispatch(SET_MY_CLASS_LIST)` 写入 GlobalState 并自动持久化。

**Tech Stack:** React Native 0.83, Expo Router 55, @ant-design/react-native Picker, @expo/vector-icons/AntDesign, expo-clipboard

---

## 文件清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `app/_layout.tsx` | 注册 courseEdit Stack.Screen |
| 修改 | `components/settingPage/scheduleSetting.tsx` | 添加「课表编辑」SettingBar 入口 |
| 新建 | `app/courseEdit.tsx` | 课表编辑页完整实现 |

---

## Task 1: 注册路由 + 添加设置页入口

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `components/settingPage/scheduleSetting.tsx`

- [ ] **Step 1: 在 `_layout.tsx` 注册路由**

在 `app/_layout.tsx` 的 `<Stack>` 内，`timeLabelSetting` 那行下方追加一行：

```tsx
<Stack.Screen name="courseEdit" options={{ title: '课表编辑' }} />
```

修改后 Stack 完整内容：

```tsx
<Stack style={{ paddingTop: insets.top }}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="jsonImport" options={{ presentation: 'modal', title: '导入JSON课表数据' }} />
  <Stack.Screen name="timeLabelSetting" options={{ title: '课程时间设置' }} />
  <Stack.Screen name="courseEdit" options={{ title: '课表编辑' }} />
</Stack>
```

- [ ] **Step 2: 在 `scheduleSetting.tsx` 添加导航函数和入口**

在 `goToTimeLabelSetting` 函数下方添加：

```tsx
function goToCourseEdit() {
    navigation.navigate('courseEdit')
}
```

将现有最后一行 SettingBar（timeLabelSetting）的 `borderon={false}` 去掉（让它显示底部分割线），并在其下方追加新的最后一行：

修改后 `<SettingCard title="课表设置">` 内容如下：

```tsx
<SettingCard title="课表设置" >
    <SettingBar title={'导入JSON'} detail={'粘贴格式化课程JSON数据'} value={''} onPress={() => { goToJsonImport() }} />
    <SettingBar title={'本学期总周数'} detail={'设置本学期总周数'} value={state.schedulePeriod[1].toString()} onPress={() => setCircleVisible(true)} />
    <SettingBar title={'开始上课时间'} detail={'设置开始上课时间'} value={`${state.startDate[0].toString()}-${state.startDate[1] + 1}-${state.startDate[2].toString()}`} onPress={() => { setTimeSelectVisible(true) }} />
    <SettingBar title={'课程时间设置'} detail={'设置每节课的上下课时间'} value={''} onPress={() => { goToTimeLabelSetting() }} />
    <SettingBar title={'课表编辑'} detail={'添加、编辑、删除课程'} value={''} borderon={false} onPress={() => { goToCourseEdit() }} />
</SettingCard>
```

- [ ] **Step 3: 提交**

```bash
git add app/_layout.tsx components/settingPage/scheduleSetting.tsx
git commit -m "feat: register courseEdit route and add settings entry"
```

---

## Task 2: 创建课表编辑页 `app/courseEdit.tsx`

**Files:**
- Create: `app/courseEdit.tsx`

- [ ] **Step 1: 创建文件，写入完整实现**

创建 `app/courseEdit.tsx`，内容如下：

```tsx
import { useGlobalState } from '@/state/GlobalState';
import { Picker, PickerValue } from '@ant-design/react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 10 组课程颜色（来自 docs/appColorList.js）
const COLOR_LIST = [
  { highlight: '#A3C0A1', background: '#ebf4eb' },
  { highlight: '#bfb3a4', background: '#f3eeec' },
  { highlight: '#A7BEE0', background: '#ececf3' },
  { highlight: '#D48D95', background: '#f1e5e6' },
  { highlight: '#A09BC3', background: '#ede7f1' },
  { highlight: '#9DBEC3', background: '#e7f2f3' },
  { highlight: '#DFB197', background: '#f8f3ed' },
  { highlight: '#EBC175', background: '#fff2e0' },
  { highlight: '#968073', background: '#f4e5dd' },
  { highlight: '#817d7d', background: '#e3e3e3' },
];

type ClassItem = {
  uid: string;
  className: string;
  classId: string;
  teacher: string;
  week: number;
  mounth: number[];
  mounthLabel: string;
  time: [number, number];
  classRoom: string;
  colorSheet: { highlight: string; background: string };
};

type FormState = {
  uid: string;
  className: string;
  classId: string;
  teacher: string;
  classRoom: string;
  week: number;
  timeFrom: number;
  timeTo: number;
  mounth: number[];
  colorIndex: number;
};

const DEFAULT_FORM: FormState = {
  uid: '',
  className: '',
  classId: '',
  teacher: '',
  classRoom: '',
  week: 1,
  timeFrom: 1,
  timeTo: 2,
  mounth: Array.from({ length: 20 }, (_, i) => i + 1),
  colorIndex: 0,
};

const NODE_DATA = Array.from({ length: 12 }, (_, i) => ({
  key: `n${i + 1}`,
  label: `第${i + 1}节`,
  value: i + 1,
}));

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const AI_PROMPT = `我会提供我学校的课程安排（截图或文字），请根据以下要求生成课程 JSON。

格式要求：
- 顶层对象包含 AllWeek（学期周数范围，如 [1,20]）和 classList（课程数组）
- 每条课程包含：uid（随机字符串）、className（课程名）、classId（课程编号）、teacher（教师）、week（1=周一...7=周日）、mounth（上课周次数组，如 [1,2,3,4,5]）、mounthLabel（如"第1-5周"）、time（[起始节次,结束节次]，1-based，如[1,2]）、classRoom（教室）、colorSheet（从下方选一组）
- colorSheet 可选：{"highlight":"#A3C0A1","background":"#ebf4eb"} | {"highlight":"#bfb3a4","background":"#f3eeec"} | {"highlight":"#A7BEE0","background":"#ececf3"} | {"highlight":"#D48D95","background":"#f1e5e6"} | {"highlight":"#A09BC3","background":"#ede7f1"} | {"highlight":"#9DBEC3","background":"#e7f2f3"} | {"highlight":"#DFB197","background":"#f8f3ed"} | {"highlight":"#EBC175","background":"#fff2e0"} | {"highlight":"#968073","background":"#f4e5dd"} | {"highlight":"#817d7d","background":"#e3e3e3"}

格式示例：
{"AllWeek":[1,20],"classList":[{"uid":"abc1","className":"高等数学","classId":"MATH101","teacher":"张老师","week":1,"mounth":[1,2,3,4,5,6,7,8],"mounthLabel":"第1-8周","time":[1,2],"classRoom":"A101","colorSheet":{"highlight":"#A3C0A1","background":"#ebf4eb"}}]}

请直接输出 JSON，不要包含说明文字。`;

function generateMounthLabel(weeks: number[]): string {
  if (weeks.length === 0) return '';
  const sorted = [...weeks].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return `第${ranges.join(',')}周`;
}

export default function CourseEdit() {
  const { state, dispatch } = useGlobalState() as {
    state: any;
    dispatch: (action: { type: string; payload: any }) => void;
  };

  const [classList, setClassList] = useState<ClassItem[]>(() => state.myClassList);

  // 编辑弹窗
  const [editVisible, setEditVisible] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // 节次 Picker（置于组件根层，不在 Modal 内，避免嵌套 Modal 问题）
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to'>('from');
  const [pickerValue, setPickerValue] = useState<PickerValue[]>([1]);

  // AI JSON 导入弹窗
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);

  function saveToState(list: ClassItem[]) {
    setClassList(list);
    dispatch({ type: 'SET_MY_CLASS_LIST', payload: list });
  }

  function openAdd() {
    setForm(DEFAULT_FORM);
    setEditVisible(true);
  }

  function openEdit(item: ClassItem) {
    const colorIndex = COLOR_LIST.findIndex(
      (c) => c.highlight === item.colorSheet.highlight
    );
    setForm({
      uid: item.uid,
      className: item.className,
      classId: item.classId,
      teacher: item.teacher,
      classRoom: item.classRoom,
      week: item.week,
      timeFrom: item.time[0],
      timeTo: item.time[1],
      mounth: [...item.mounth],
      colorIndex: colorIndex >= 0 ? colorIndex : 0,
    });
    setEditVisible(true);
  }

  function confirmDelete(uid: string) {
    Alert.alert('删除课程', '确认删除此课程？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => saveToState(classList.filter((c) => c.uid !== uid)),
      },
    ]);
  }

  function saveCourse() {
    if (!form.className.trim()) {
      Alert.alert('提示', '课程名称不能为空');
      return;
    }
    if (form.timeFrom > form.timeTo) {
      Alert.alert('提示', '结束节次不能小于起始节次');
      return;
    }
    if (form.mounth.length === 0) {
      Alert.alert('提示', '请至少选择一个上课周次');
      return;
    }
    const color = COLOR_LIST[form.colorIndex];
    const item: ClassItem = {
      uid: form.uid || Math.random().toString(36).slice(2) + Date.now(),
      className: form.className.trim(),
      classId: form.classId.trim(),
      teacher: form.teacher.trim(),
      week: form.week,
      mounth: [...form.mounth].sort((a, b) => a - b),
      mounthLabel: generateMounthLabel(form.mounth),
      time: [form.timeFrom, form.timeTo],
      classRoom: form.classRoom.trim(),
      colorSheet: { highlight: color.highlight, background: color.background },
    };
    const next = form.uid
      ? classList.map((c) => (c.uid === form.uid ? item : c))
      : [...classList, item];
    saveToState(next);
    setEditVisible(false);
  }

  async function copyPrompt() {
    await Clipboard.setStringAsync(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function pasteJson() {
    const text = await Clipboard.getStringAsync();
    setJsonText(text);
  }

  function importJson() {
    try {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error();
      const data = JSON.parse(match[0]);
      if (!Array.isArray(data.classList)) throw new Error();
      if (Array.isArray(data.AllWeek)) {
        dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: data.AllWeek });
      }
      saveToState(data.classList);
      setJsonModalVisible(false);
      setJsonText('');
      Alert.alert('导入成功', `已导入 ${data.classList.length} 门课程`);
    } catch {
      Alert.alert('格式错误', '请确认输入的是有效的课程 JSON');
    }
  }

  function openNodePicker(target: 'from' | 'to') {
    setPickerTarget(target);
    setPickerValue([target === 'from' ? form.timeFrom : form.timeTo]);
    setPickerVisible(true);
  }

  function onNodePickerOk(v: PickerValue[]) {
    const val = v[0] as number;
    if (pickerTarget === 'from') {
      setForm((f) => ({ ...f, timeFrom: val, timeTo: Math.max(f.timeTo, val) }));
    } else {
      setForm((f) => ({ ...f, timeTo: Math.max(val, f.timeFrom) }));
    }
    setPickerVisible(false);
  }

  function toggleWeekNum(w: number) {
    setForm((f) => ({
      ...f,
      mounth: f.mounth.includes(w) ? f.mounth.filter((x) => x !== w) : [...f.mounth, w],
    }));
  }

  function setQuickWeeks(type: 'all' | 'odd' | 'even' | 'clear') {
    const maps: Record<string, number[]> = {
      all: Array.from({ length: 20 }, (_, i) => i + 1),
      odd: Array.from({ length: 10 }, (_, i) => i * 2 + 1),
      even: Array.from({ length: 10 }, (_, i) => (i + 1) * 2),
      clear: [],
    };
    setForm((f) => ({ ...f, mounth: maps[type] }));
  }

  const TEXT_FIELDS = [
    { key: 'className' as const, label: '课程名称', required: true, placeholder: '如：高等数学' },
    { key: 'teacher' as const, label: '教师', required: false, placeholder: '如：张老师' },
    { key: 'classRoom' as const, label: '教室', required: false, placeholder: '如：A101' },
    { key: 'classId' as const, label: '课程编号', required: false, placeholder: '如：MATH101' },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* AI 导入卡片 */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiIconWrap}>
              <AntDesign name="thunderbolt" size={16} color="#6454ab" />
            </View>
            <Text style={styles.aiTitle}>AI 导入</Text>
          </View>
          <Text style={styles.aiDesc}>
            复制提示词，连同课程截图或文字发给 AI，将返回的 JSON 粘贴导入
          </Text>
          <View style={styles.aiSteps}>
            {['复制提示词', '附截图发 AI', '粘贴 JSON'].map((step, i) => (
              <View key={i} style={styles.aiStep}>
                <View style={styles.aiStepDot}>
                  <Text style={styles.aiStepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.aiStepText}>{step}</Text>
                {i < 2 && (
                  <AntDesign name="right" size={10} color="#C5BBE8" style={{ marginHorizontal: 2 }} />
                )}
              </View>
            ))}
          </View>
          <View style={styles.aiActions}>
            <TouchableOpacity style={styles.aiCopyBtn} onPress={copyPrompt} activeOpacity={0.75}>
              <AntDesign name={copied ? 'check' : 'copy'} size={14} color={copied ? '#2d6a4f' : '#6454ab'} />
              <Text style={[styles.aiCopyBtnText, copied && styles.aiCopyBtnTextDone]}>
                {copied ? '已复制' : '复制提示词'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiImportBtn}
              onPress={() => { setJsonText(''); setJsonModalVisible(true); }}
              activeOpacity={0.75}
            >
              <AntDesign name="download" size={14} color="#FFFFFF" />
              <Text style={styles.aiImportBtnText}>粘贴 JSON 导入</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 课程列表 */}
        {classList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>暂无课程，点击下方按钮添加</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {classList.map((item, index) => (
              <TouchableOpacity
                key={item.uid}
                style={[styles.courseRow, index < classList.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorBar, { backgroundColor: item.colorSheet.highlight }]} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{item.className}</Text>
                  <Text style={styles.courseDetail}>
                    {WEEKDAYS[item.week - 1]} · 第{item.time[0]}{item.time[0] !== item.time[1] ? `-${item.time[1]}` : ''}节
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => confirmDelete(item.uid)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AntDesign name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 固定底部添加按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <AntDesign name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>添加课程</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 编辑弹窗 ===== */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.uid ? '编辑课程' : '添加课程'}</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <AntDesign name="close" size={20} color="#575757" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* 文本输入字段 */}
              {TEXT_FIELDS.map((f) => (
                <View key={f.key} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    {f.label}{f.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={form[f.key]}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, [f.key]: t }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#C5C5C5"
                  />
                </View>
              ))}

              {/* 星期选择 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>星期</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.weekdayBtn, form.week === i + 1 && styles.weekdayBtnActive]}
                      onPress={() => setForm((f) => ({ ...f, week: i + 1 }))}
                    >
                      <Text style={[styles.weekdayText, form.week === i + 1 && styles.weekdayTextActive]}>
                        {d.replace('周', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 节次选择（触发根层 Picker） */}
              <View style={[styles.sectionBlock, styles.sectionRowFlex]}>
                <Text style={styles.sectionLabel}>节次</Text>
                <View style={styles.nodePair}>
                  <TouchableOpacity style={styles.nodeChip} onPress={() => openNodePicker('from')}>
                    <Text style={styles.nodeText}>第{form.timeFrom}节</Text>
                    <AntDesign name="down" size={12} color="#A5A5A5" />
                  </TouchableOpacity>
                  <Text style={styles.nodeSep}>至</Text>
                  <TouchableOpacity style={styles.nodeChip} onPress={() => openNodePicker('to')}>
                    <Text style={styles.nodeText}>第{form.timeTo}节</Text>
                    <AntDesign name="down" size={12} color="#A5A5A5" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 颜色选择 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>颜色</Text>
                <View style={styles.colorRow}>
                  {COLOR_LIST.map((c, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.colorDotWrap,
                        form.colorIndex === i && { borderColor: c.highlight },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, colorIndex: i }))}
                    >
                      <View style={[styles.colorDot, { backgroundColor: c.highlight }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 上课周次 */}
              <View style={[styles.sectionBlock, { borderBottomWidth: 0 }]}>
                <Text style={styles.sectionLabel}>上课周次</Text>
                <View style={styles.quickRow}>
                  {(['全部', '单周', '双周', '清空'] as const).map((label, i) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.quickBtn}
                      onPress={() => setQuickWeeks(['all', 'odd', 'even', 'clear'][i] as any)}
                    >
                      <Text style={styles.quickBtnText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.weekGrid}>
                  {Array.from({ length: 4 }, (_, row) => (
                    <View key={row} style={styles.weekGridRow}>
                      {Array.from({ length: 5 }, (_, col) => {
                        const w = row * 5 + col + 1;
                        const active = form.mounth.includes(w);
                        return (
                          <TouchableOpacity
                            key={w}
                            style={[styles.weekToggle, active && styles.weekToggleActive]}
                            onPress={() => toggleWeekNum(w)}
                          >
                            <Text style={[styles.weekToggleText, active && styles.weekToggleTextActive]}>
                              {w}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCourse}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== AI JSON 导入弹窗 ===== */}
      <Modal
        visible={jsonModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setJsonModalVisible(false)}
      >
        <View style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setJsonModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>粘贴 JSON 数据</Text>
              <TouchableOpacity onPress={() => setJsonModalVisible(false)}>
                <AntDesign name="close" size={20} color="#575757" />
              </TouchableOpacity>
            </View>
            <Text style={styles.jsonHint}>将 AI 返回的 JSON 粘贴到下方，或点击从剪贴板读取</Text>
            <TextInput
              style={styles.jsonInput}
              multiline
              value={jsonText}
              onChangeText={setJsonText}
              placeholder={'{"AllWeek":[1,20],"classList":[...]}'}
              placeholderTextColor="#C5C5C5"
              autoFocus
            />
            <TouchableOpacity style={styles.pasteBtn} onPress={pasteJson}>
              <AntDesign name="copy" size={13} color="#6454ab" />
              <Text style={styles.pasteBtnText}>从剪贴板粘贴</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setJsonModalVisible(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={importJson}>
                <Text style={styles.saveText}>导入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 节次 Picker — 置于根层避免 Modal 嵌套问题 */}
      <Picker
        data={[NODE_DATA]}
        cols={1}
        cascade={false}
        visible={pickerVisible}
        value={pickerValue}
        onOk={(v: PickerValue[]) => onNodePickerOk(v)}
        onVisibleChange={(v) => setPickerVisible(v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F8' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },

  // AI 卡片
  aiCard: {
    backgroundColor: '#F0EDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6F5',
    padding: 16,
    gap: 12,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#EDE9F7', alignItems: 'center', justifyContent: 'center',
  },
  aiTitle: { fontSize: 15, fontWeight: '700', color: '#3D2D8A' },
  aiDesc: { fontSize: 13, color: '#5A4A8A', lineHeight: 19 },
  aiSteps: { flexDirection: 'row', alignItems: 'center' },
  aiStep: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiStepDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#6454ab', alignItems: 'center', justifyContent: 'center',
  },
  aiStepNum: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  aiStepText: { fontSize: 11, color: '#5A4A8A' },
  aiActions: { flexDirection: 'row', gap: 10 },
  aiCopyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: '#6454ab', borderRadius: 8, paddingVertical: 9,
  },
  aiCopyBtnText: { fontSize: 13, fontWeight: '600', color: '#6454ab' },
  aiCopyBtnTextDone: { color: '#2d6a4f' },
  aiImportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#6454ab', borderRadius: 8, paddingVertical: 9,
  },
  aiImportBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  // 课程列表
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#A5A5A5' },
  listCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  courseRow: {
    height: 64, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F7F7F7' },
  colorBar: { width: 4, height: 36, borderRadius: 2 },
  courseInfo: { flex: 1, gap: 3 },
  courseName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  courseDetail: { fontSize: 12, color: '#A5A5A5' },

  // 底部添加按钮
  bottomBar: {
    height: 80, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#EFEFEF',
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 12, backgroundColor: '#6454ab',
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // 通用弹窗基础
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },

  // 编辑表单
  formScroll: { flexShrink: 1 },
  formContent: { paddingHorizontal: 20, paddingBottom: 8 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12,
  },
  fieldLabel: { width: 68, fontSize: 14, color: '#575757' },
  required: { color: '#FF3B30' },
  fieldInput: {
    flex: 1, height: 36, backgroundColor: '#F8F8FA',
    borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: '#1A1A2E',
  },
  sectionBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  sectionRowFlex: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: { fontSize: 14, color: '#575757', width: 68 },

  // 星期
  weekdayRow: { flex: 1, flexDirection: 'row', gap: 4 },
  weekdayBtn: {
    flex: 1, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4F4F8', borderWidth: 1, borderColor: '#E8E8EC',
  },
  weekdayBtnActive: { backgroundColor: '#6454ab', borderColor: '#6454ab' },
  weekdayText: { fontSize: 12, color: '#575757' },
  weekdayTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 节次
  nodePair: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nodeChip: {
    flex: 1, height: 34, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', backgroundColor: '#F8F8FA',
    borderRadius: 8, paddingHorizontal: 10,
  },
  nodeText: { fontSize: 14, color: '#1A1A2E' },
  nodeSep: { fontSize: 13, color: '#A5A5A5' },

  // 颜色
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDotWrap: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDot: { width: 24, height: 24, borderRadius: 12 },

  // 上课周次
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, backgroundColor: '#F4F4F8',
    borderWidth: 1, borderColor: '#E8E8EC',
  },
  quickBtnText: { fontSize: 12, color: '#575757' },
  weekGrid: { gap: 6 },
  weekGridRow: { flexDirection: 'row', gap: 6 },
  weekToggle: {
    flex: 1, height: 30, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4F4F8', borderWidth: 1, borderColor: '#E8E8EC',
  },
  weekToggleActive: { backgroundColor: '#6454ab', borderColor: '#6454ab' },
  weekToggleText: { fontSize: 12, color: '#A5A5A5' },
  weekToggleTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 操作按钮
  modalActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0D9F5', alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#7A7A9A', fontWeight: '500' },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#6454ab', alignItems: 'center',
  },
  saveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  // JSON 导入弹窗
  jsonHint: {
    fontSize: 13, color: '#7A7A9A',
    paddingHorizontal: 20, lineHeight: 18,
  },
  jsonInput: {
    marginHorizontal: 20, height: 140,
    borderWidth: 1, borderColor: '#E0D9F5', borderRadius: 10,
    padding: 12, fontSize: 13, color: '#1A1A2E',
    textAlignVertical: 'top', backgroundColor: '#FAFAFA',
  },
  pasteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginHorizontal: 20, marginTop: 8,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#DDD6F5', borderRadius: 8,
  },
  pasteBtnText: { fontSize: 13, color: '#6454ab' },
});
```

- [ ] **Step 2: 手动验证**

启动 `npm run start`，按以下步骤验证：

| 场景 | 预期结果 |
|---|---|
| 进入设置页 | 末尾显示「课表编辑」行 |
| 点击「课表编辑」 | 进入新页面，显示空状态文字 |
| 点击「添加课程」 | 底部弹出编辑弹窗，标题「添加课程」 |
| 填写课程名 + 选择星期/节次/颜色/周次，点保存 | 弹窗关闭，列表出现新课程（彩色左侧竖条 + 名称 + 时间摘要） |
| 点击课程行 | 弹窗以「编辑课程」标题打开，所有字段预填 |
| 修改内容保存 | 列表更新 |
| 点删除图标 | Alert 二次确认，确认后该行消失 |
| 点「粘贴 JSON 导入」 | 底部弹出 JSON 输入弹窗 |
| 粘贴有效 JSON 导入 | 列表更新，显示导入成功 Alert |
| 节次「第X节 至 第X节」触发选择 | Picker 弹出，选择后值更新 |
| 重启 App | 修改的课程数据依然存在 |

- [ ] **Step 3: 提交**

```bash
git add app/courseEdit.tsx
git commit -m "feat: implement course edit page with add/edit/delete and AI JSON import"
```

---

## 完成

共 2 次提交，功能完整可用。设置页新增「课表编辑」入口，课表编辑页支持课程增删改及 AI JSON 批量导入。
