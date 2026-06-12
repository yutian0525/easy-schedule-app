import { useGlobalState } from '@/state/GlobalState';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as Clipboard from 'expo-clipboard';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Dimensions,
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
  mounth: [],
  colorIndex: 0,
};

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const AI_PROMPT = `我会提供我学校的课程安排（截图或文字），请根据以下要求生成课程 JSON 数组。

格式要求：
- 直接输出 JSON 数组（不需要外层包裹对象）
- 每条课程包含：uid（随机字符串）、className（课程名）、classId（课程编号，可为空字符串）、teacher（教师，可为空字符串）、week（1=周一...7=周日）、mounth（上课周次数组，如 [1,2,3,4,5]）、mounthLabel（如"第1-5周"）、time（[起始节次,结束节次]，1-based，如[1,2]）、classRoom（教室字符串，可为空字符串）
- 同一门课在不同星期上课时，每个星期单独一条记录（week 不同）

格式示例：
[{"uid":"abc1","className":"高等数学","classId":"MATH101","teacher":"张老师","week":1,"mounth":[1,2,3,4,5,6,7,8],"mounthLabel":"第1-8周","time":[1,2],"classRoom":"A101"},{"uid":"abc2","className":"高等数学","classId":"MATH101","teacher":"张老师","week":3,"mounth":[1,2,3,4,5,6,7,8],"mounthLabel":"第1-8周","time":[1,2],"classRoom":"A101"}]

请直接输出 JSON 数组，不要包含说明文字。`;

/** 检测两门课是否冲突：同星期 + 同周次（mounth 有交集）+ 时间重叠 */
function coursesConflict(a: ClassItem, b: ClassItem): boolean {
  if (a.week !== b.week) return false;
  if (a.time[0] > b.time[1] || b.time[0] > a.time[1]) return false;
  return a.mounth.some((w) => b.mounth.includes(w));
}

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
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];

  const maxWeek = (activeSchedule as any).schedulePeriod[1] as number;
  const maxNode = ((activeSchedule as any).timeLabelList?.length as number) || 12;

  const [classList, setClassList] = useState<ClassItem[]>(() => (activeSchedule as any).myClassList);

  // 编辑弹窗
  const [editVisible, setEditVisible] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // 节次 tooltip picker
  const [nodePickerVisible, setNodePickerVisible] = useState(false);
  const [nodePickerTarget, setNodePickerTarget] = useState<'from' | 'to'>('from');
  const [nodePickerPos, setNodePickerPos] = useState({ x: 0, y: 0 });
  const fromChipRef = React.useRef<TouchableOpacity>(null);
  const toChipRef = React.useRef<TouchableOpacity>(null);

  // AI JSON 导入弹窗
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setClassList((activeSchedule as any).myClassList);
  }, [(activeSchedule as any).myClassList]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  function saveToState(list: ClassItem[]) {
    setClassList(list);
    dispatch({ type: 'SET_MY_CLASS_LIST', payload: list });
  }

  function openAdd() {
    setForm({ ...DEFAULT_FORM, mounth: Array.from({ length: maxWeek }, (_, i) => i + 1) });
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
    // 冲突检测（排除自身）
    const others = classList.filter((c) => c.uid !== item.uid);
    const conflict = others.find((c) => coursesConflict(item, c));
    if (conflict) {
      Alert.alert(
        '时间冲突',
        `与「${conflict.className}」（${WEEKDAYS[conflict.week - 1]} 第${conflict.time[0]}-${conflict.time[1]}节）存在时间冲突，请检查星期、节次或上课周次`
      );
      return;
    }
    const next = form.uid
      ? classList.map((c) => (c.uid === form.uid ? item : c))
      : [...classList, item];
    saveToState(next);
    setEditVisible(false);
  }

  async function copyPrompt() {
    await Clipboard.setStringAsync(AI_PROMPT);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  async function pasteJson() {
    const text = await Clipboard.getStringAsync();
    setJsonText(text);
  }

  function importJson() {
    try {
      const match = jsonText.match(/\[[\s\S]*\]/);
      if (!match) throw new Error();
      const raw: any[] = JSON.parse(match[0]);
      if (!Array.isArray(raw) || raw.length === 0) throw new Error();

      // 标准化每条课程并分配随机 colorSheet
      const incoming: ClassItem[] = raw.map((item: any, idx: number) => {
        const colorSheet = item.colorSheet && item.colorSheet.highlight
          ? item.colorSheet
          : COLOR_LIST[idx % COLOR_LIST.length];
        return {
          uid: Math.random().toString(36).slice(2) + Date.now().toString(36),
          className: String(item.className ?? ''),
          classId: String(item.classId ?? ''),
          teacher: String(item.teacher ?? ''),
          week: Number(item.week) || 1,
          mounth: Array.isArray(item.mounth) ? item.mounth : [],
          mounthLabel: String(item.mounthLabel ?? ''),
          time: Array.isArray(item.time) ? [Number(item.time[0]), Number(item.time[1])] as [number, number] : [1, 1],
          classRoom: String(item.classRoom ?? ''),  // int → string 兼容
          colorSheet,
        };
      });

      // 计算 AllWeek：取所有 mounth 的最大值作为学期末周
      const allWeekNums = incoming.flatMap((c) => c.mounth);
      if (allWeekNums.length > 0) {
        const maxW = Math.max(...allWeekNums);
        dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: [1, maxW] });
      }

      // 冲突检测：导入课程互相检测 + 与现有课程检测
      const allAfter = [...classList, ...incoming];
      const conflictPairs: string[] = [];
      for (let i = 0; i < incoming.length; i++) {
        for (let j = 0; j < allAfter.length; j++) {
          if (incoming[i].uid === allAfter[j].uid) continue;
          if (coursesConflict(incoming[i], allAfter[j])) {
            conflictPairs.push(
              `「${incoming[i].className}」与「${allAfter[j].className}」（${WEEKDAYS[allAfter[j].week - 1]} 第${allAfter[j].time[0]}-${allAfter[j].time[1]}节）`
            );
          }
        }
      }
      if (conflictPairs.length > 0) {
        Alert.alert(
          '导入存在冲突',
          `以下课程存在时间冲突，请修正后重新导入：\n\n${[...new Set(conflictPairs)].slice(0, 5).join('\n')}`
        );
        return;
      }

      saveToState([...classList, ...incoming]);
      setJsonModalVisible(false);
      setJsonText('');
      Alert.alert('导入成功', `已导入 ${incoming.length} 门课程`);
    } catch {
      Alert.alert('格式错误', '请确认输入的是有效的课程 JSON 数组');
    }
  }

  function openNodePicker(target: 'from' | 'to') {
    const ref = target === 'from' ? fromChipRef : toChipRef;
    ref.current?.measure((_x, _y, _w, height, pageX, pageY) => {
      const TOOLTIP_W = 212;
      const TOOLTIP_H = Math.ceil(maxNode / 4) * 44 + 24;
      const sw = Dimensions.get('window').width;
      const sh = Dimensions.get('window').height;
      let top = pageY + height + 6;
      if (top + TOOLTIP_H > sh) top = pageY - TOOLTIP_H - 6;
      let left = pageX;
      if (left + TOOLTIP_W > sw) left = sw - TOOLTIP_W - 8;
      setNodePickerPos({ x: left, y: top });
      setNodePickerTarget(target);
      setNodePickerVisible(true);
    });
  }

  function toggleWeekNum(w: number) {
    setForm((f) => ({
      ...f,
      mounth: f.mounth.includes(w) ? f.mounth.filter((x) => x !== w) : [...f.mounth, w],
    }));
  }

  function setQuickWeeks(type: 'all' | 'odd' | 'even' | 'clear') {
    const all = Array.from({ length: maxWeek }, (_, i) => i + 1);
    const maps: Record<string, number[]> = {
      all,
      odd: all.filter((w) => w % 2 === 1),
      even: all.filter((w) => w % 2 === 0),
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
                key={`${item.uid}-${index}`}
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

              {/* 节次选择 */}
              <View style={[styles.sectionBlock, styles.sectionRowFlex]}>
                <Text style={styles.sectionLabel}>节次</Text>
                <View style={styles.nodePair}>
                  <TouchableOpacity ref={fromChipRef} style={styles.nodeChip} onPress={() => openNodePicker('from')}>
                    <Text style={styles.nodeText}>第{form.timeFrom}节</Text>
                    <AntDesign name="down" size={12} color="#A5A5A5" />
                  </TouchableOpacity>
                  <Text style={styles.nodeSep}>至</Text>
                  <TouchableOpacity ref={toChipRef} style={styles.nodeChip} onPress={() => openNodePicker('to')}>
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
                  {Array.from({ length: Math.ceil(maxWeek / 5) }, (_, row) => (
                    <View key={row} style={styles.weekGridRow}>
                      {Array.from({ length: 5 }, (_, col) => {
                        const w = row * 5 + col + 1;
                        if (w > maxWeek) return <View key={`ph${col}`} style={{ flex: 1 }} />;
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
            <Text style={styles.jsonHint}>将 AI 返回的 JSON 数组粘贴到下方，或点击从剪贴板读取</Text>
            <TextInput
              style={styles.jsonInput}
              multiline
              value={jsonText}
              onChangeText={setJsonText}
              placeholder={'[{"uid":"...","className":"高等数学","week":1,"time":[1,2],"mounth":[1,2,3],...}]'}
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

      {/* ===== 节次 Tooltip Picker ===== */}
      <Modal
        visible={nodePickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNodePickerVisible(false)}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNodePickerVisible(false)} />
        <View style={[styles.nodeTooltip, { top: nodePickerPos.y, left: nodePickerPos.x }]}>
          {Array.from({ length: maxNode }, (_, i) => {
            const n = i + 1;
            const isSelected = nodePickerTarget === 'from' ? form.timeFrom === n : form.timeTo === n;
            const isDisabled = nodePickerTarget === 'to' && n < form.timeFrom;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.nodeTooltipBtn,
                  isSelected && styles.nodeTooltipBtnActive,
                  isDisabled && styles.nodeTooltipBtnDisabled,
                ]}
                activeOpacity={isDisabled ? 1 : 0.7}
                onPress={() => {
                  if (isDisabled) return;
                  if (nodePickerTarget === 'from') {
                    setForm((f) => ({ ...f, timeFrom: n, timeTo: Math.max(f.timeTo, n) }));
                  } else {
                    setForm((f) => ({ ...f, timeTo: n }));
                  }
                  setNodePickerVisible(false);
                }}
              >
                <Text style={[styles.nodeTooltipBtnText, isSelected && styles.nodeTooltipBtnTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
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
    minHeight: 64, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
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

  // 节次 tooltip picker
  nodeTooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 212,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  nodeTooltipBtn: {
    width: 44,
    height: 38,
    margin: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F8',
  },
  nodeTooltipBtnActive: { backgroundColor: '#6454ab' },
  nodeTooltipBtnDisabled: { opacity: 0.35 },
  nodeTooltipBtnText: { fontSize: 13, color: '#575757', fontWeight: '500' },
  nodeTooltipBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
