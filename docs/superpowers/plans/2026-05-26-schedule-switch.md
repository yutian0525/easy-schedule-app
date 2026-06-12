# 课表切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持多课表管理，每个课表独立存储数据，并在首页/周课表提供快速切换第二课表的交互。

**Architecture:** GlobalState 从四个平铺字段完全迁移为 `schedules[]` 数组（完全嵌套 State 方案），现有 SET_* actions 改为更新 active schedule 的字段，新增 5 个 schedule 管理 actions，旧数据自动迁移为"我默认课程表"。首页/周课表用本地 state 实现点按切换和长按预览，不写入 GlobalState。

**Tech Stack:** React Native 0.83 + Expo SDK 55 + Expo Router + React Context + useReducer + AsyncStorage + @expo/vector-icons/AntDesign

---

## 文件清单

| 操作 | 文件 |
|------|------|
| 修改 | `state/GlobalState.js` |
| 修改 | `app/(tabs)/index.tsx` |
| 修改 | `app/(tabs)/weekschedule.tsx` |
| 修改 | `app/timeLabelSetting.tsx` |
| 修改 | `app/courseEdit.tsx` |
| 修改 | `app/jsonImport.tsx` |
| 修改 | `components/settingPage/scheduleSetting.tsx` |
| 修改 | `app/_layout.tsx` |
| 新建 | `app/scheduleSwitch.tsx` |

---

### Task 1: 重构 GlobalState.js

**注意：此 Task 完成后 app 暂时无法运行，直到 Task 2 完成所有页面读取路径更新。**

**Files:**
- Modify: `state/GlobalState.js`

- [ ] **Step 1: 完整替换 GlobalState.js**

将 `state/GlobalState.js` 全部内容替换为：

```javascript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { timeList } from '@/utils/timeLabel';

const DEFAULT_ID = 'default';

function makeDefaultSchedule() {
  const today = new Date();
  return {
    id: DEFAULT_ID,
    name: '我默认课程表',
    schedulePeriod: [1, 20],
    startDate: [today.getFullYear(), today.getMonth(), today.getDate()],
    timeLabelList: timeList,
    myClassList: [],
  };
}

const initialState = {
  schedules: [makeDefaultSchedule()],
  activeScheduleId: DEFAULT_ID,
  secondScheduleId: null,
  needUpdate: [],
};

function updateActive(state, fields) {
  return {
    ...state,
    needUpdate: [],
    schedules: state.schedules.map(s =>
      s.id === state.activeScheduleId ? { ...s, ...fields } : s
    ),
  };
}

function globalReducer(state, action) {
  switch (action.type) {
    case 'SET_SCHEDULE_PERIOD':
      return updateActive(state, { schedulePeriod: action.payload });
    case 'SET_START_DATE':
      return updateActive(state, { startDate: action.payload });
    case 'SET_TIME_LABEL_LIST':
      return updateActive(state, { timeLabelList: action.payload });
    case 'SET_MY_CLASS_LIST':
      return updateActive(state, { myClassList: action.payload });
    case 'SET_NEED_UPDATE':
      return { ...state, needUpdate: action.payload };

    case 'CREATE_SCHEDULE': {
      const today = new Date();
      const s = {
        id: Date.now().toString(),
        name: action.payload.name || '新课表',
        schedulePeriod: [1, 20],
        startDate: [today.getFullYear(), today.getMonth(), today.getDate()],
        timeLabelList: timeList,
        myClassList: [],
      };
      return { ...state, schedules: [...state.schedules, s] };
    }

    case 'DELETE_SCHEDULE': {
      if (state.schedules.length <= 1) return state;
      const next = state.schedules.filter(s => s.id !== action.payload.id);
      return {
        ...state,
        schedules: next,
        activeScheduleId: state.activeScheduleId === action.payload.id ? next[0].id : state.activeScheduleId,
        secondScheduleId: state.secondScheduleId === action.payload.id ? null : state.secondScheduleId,
      };
    }

    case 'RENAME_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(s =>
          s.id === action.payload.id ? { ...s, name: action.payload.name } : s
        ),
      };

    case 'SWITCH_ACTIVE_SCHEDULE':
      return { ...state, activeScheduleId: action.payload.id };

    case 'SET_SECOND_SCHEDULE':
      return { ...state, secondScheduleId: action.payload.id };

    case 'LOAD_STATE_FROM_STORAGE': {
      const saved = action.payload;
      if (!saved.schedules) {
        // 迁移旧平铺结构
        const migrated = {
          id: DEFAULT_ID,
          name: '我默认课程表',
          schedulePeriod: saved.schedulePeriod ?? [1, 20],
          startDate: saved.startDate ?? [2025, 8, 17],
          timeLabelList: saved.timeLabelList ?? timeList,
          myClassList: saved.myClassList ?? [],
        };
        return {
          ...state,
          schedules: [migrated],
          activeScheduleId: DEFAULT_ID,
          secondScheduleId: null,
          needUpdate: [],
        };
      }
      return { ...state, ...saved, needUpdate: [] };
    }

    case 'RESET_ALL_DATA':
      return { schedules: [makeDefaultSchedule()], activeScheduleId: DEFAULT_ID, secondScheduleId: null, needUpdate: [] };

    default:
      return state;
  }
}

const GlobalStateContext = createContext({ state: initialState, dispatch: () => {} });

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  useEffect(() => { loadStateFromStorage(dispatch); }, []);
  useEffect(() => { saveStateToStorage(state); }, [state]);

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error('useGlobalState must be used within GlobalStateProvider');
  return context;
};

const saveStateToStorage = async (state) => {
  try {
    await AsyncStorage.setItem('appState', JSON.stringify({
      schedules: state.schedules,
      activeScheduleId: state.activeScheduleId,
      secondScheduleId: state.secondScheduleId,
    }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

const loadStateFromStorage = async (dispatch) => {
  try {
    const saved = await AsyncStorage.getItem('appState');
    if (saved) dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: JSON.parse(saved) });
  } catch (e) {
    console.error('Failed to load state:', e);
  }
};

export const resetAllData = (dispatch) => {
  dispatch({ type: 'RESET_ALL_DATA' });
  AsyncStorage.removeItem('appState').catch(e => console.error('Failed to clear storage:', e));
};
```

- [ ] **Step 2: 验证文件语法无误**

```bash
cd d:\workspace\easyLesson\scheduleAPP && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

---

### Task 2: 更新所有现有页面读取路径

**此 Task 完成后 app 恢复正常运行。核心模式：在每个用到 `state.*` 课表数据的组件顶部加一行 `const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId) ?? state.schedules[0];`，然后将所有 `state.myClassList / state.timeLabelList / state.schedulePeriod / state.startDate` 替换为 `activeSchedule.*`。dispatch 调用不变。**

**Files:**
- Modify: `app/timeLabelSetting.tsx`
- Modify: `app/courseEdit.tsx`
- Modify: `app/jsonImport.tsx`
- Modify: `components/settingPage/scheduleSetting.tsx`

#### 2a: timeLabelSetting.tsx

- [ ] **Step 1: 在 useGlobalState 后插入 activeSchedule**

在 `timeLabelSetting.tsx` 第 89 行 `const { state, dispatch } = useGlobalState()` 之后插入：

```typescript
  const activeSchedule = (state.schedules as any[]).find((s: any) => s.id === state.activeScheduleId) ?? state.schedules[0];
```

- [ ] **Step 2: 将 state.timeLabelList 替换为 activeSchedule.timeLabelList**

第 94-106 行的 `useState` 初始化：

```typescript
  const [sections, setSections] = useState<Record<SectionKey, TimeLabelItem[]>>(
    () => ({
      morning: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "morning"
      ),
      afternoon: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "afternoon"
      ),
      night: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "night"
      ),
    })
  );
```

#### 2b: courseEdit.tsx

- [ ] **Step 1: 在 useGlobalState 后插入 activeSchedule**

在 `app/courseEdit.tsx` 的 `const { state, dispatch } = useGlobalState()` 之后插入：

```typescript
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
```

- [ ] **Step 2: 替换 state 读取为 activeSchedule**

将 `const maxWeek = state.schedulePeriod[1] as number;` 改为：

```typescript
  const maxWeek = (activeSchedule as any).schedulePeriod[1] as number;
```

将 `useState<ClassItem[]>(() => state.myClassList)` 改为：

```typescript
  const [classList, setClassList] = useState<ClassItem[]>(() => (activeSchedule as any).myClassList);
```

将 `useEffect(() => { setClassList(state.myClassList); }, [state.myClassList]);` 改为：

```typescript
  useEffect(() => { setClassList((activeSchedule as any).myClassList); }, [(activeSchedule as any).myClassList]);
```

将 `const maxNode = (state.timeLabelList?.length as number) || 12;` 改为：

```typescript
  const maxNode = ((activeSchedule as any).timeLabelList?.length as number) || 12;
```

#### 2c: jsonImport.tsx

- [ ] **Step 1: 在 useGlobalState 后插入 activeSchedule**

在 `app/jsonImport.tsx` 的 `const { state, dispatch } = useGlobalState();` 之后插入：

```typescript
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
```

- [ ] **Step 2: 替换 state 读取**

将 `<Text>timeLabelList: {JSON.stringify(state.timeLabelList)}</Text>` 改为：

```typescript
<Text>timeLabelList: {JSON.stringify((activeSchedule as any).timeLabelList)}</Text>
```

将 `<Text>myClassList: {JSON.stringify(state.myClassList)}</Text>` 改为：

```typescript
<Text>myClassList: {JSON.stringify((activeSchedule as any).myClassList)}</Text>
```

#### 2d: scheduleSetting.tsx

- [ ] **Step 1: 在 useGlobalState 后插入 activeSchedule**

在 `components/settingPage/scheduleSetting.tsx` 的 `const { state, dispatch } = useGlobalState();` 之后插入：

```typescript
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
```

- [ ] **Step 2: 替换 state.schedulePeriod 和 state.startDate**

将 `const currectWeek = [state.schedulePeriod[1].toString()];` 改为：

```typescript
  const currectWeek = [(activeSchedule as any).schedulePeriod[1].toString()];
```

将 SettingBar 中 `value={state.schedulePeriod[1].toString()}` 改为：

```typescript
value={(activeSchedule as any).schedulePeriod[1].toString()}
```

将 SettingBar 中的 startDate value（包含 `state.startDate[0]...`）改为：

```typescript
value={`${(activeSchedule as any).startDate[0]}-${(activeSchedule as any).startDate[1] + 1}-${(activeSchedule as any).startDate[2]}`}
```

将 DatePicker 的 `value={new Date(state.startDate[0], state.startDate[1], state.startDate[2])}` 改为：

```typescript
value={new Date((activeSchedule as any).startDate[0], (activeSchedule as any).startDate[1], (activeSchedule as any).startDate[2])}
```

- [ ] **Step 3: 启动 app 验证正常运行**

```bash
cd d:\workspace\easyLesson\scheduleAPP && npm run web
```

期望：设置页显示正确的周数和开始日期，课程编辑正常工作。

- [ ] **Step 4: Commit**

```bash
git add state/GlobalState.js app/timeLabelSetting.tsx app/courseEdit.tsx app/jsonImport.tsx components/settingPage/scheduleSetting.tsx
git commit -m "refactor: migrate GlobalState to nested schedules structure"
```

---

### Task 3: 注册路由 + 添加 scheduleSwitch 入口

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `components/settingPage/scheduleSetting.tsx`

- [ ] **Step 1: _layout.tsx 注册路由**

在 `app/_layout.tsx` 现有 `<Stack.Screen name="courseEdit" .../>` 之后添加：

```tsx
<Stack.Screen name="scheduleSwitch" options={{ title: '课表切换' }} />
```

- [ ] **Step 2: scheduleSetting.tsx 添加导航函数**

在 `components/settingPage/scheduleSetting.tsx` 的 `goToCourseEdit` 函数之后添加：

```typescript
  function goToScheduleSwitch() {
    navigation.navigate('scheduleSwitch');
  }
```

- [ ] **Step 3: scheduleSetting.tsx 添加 SettingBar**

在 `<SettingBar title={'课表编辑'} .../>` 之后添加（注意把课表编辑的 `borderon={false}` 去掉）：

```tsx
<SettingBar title={'课表切换'} detail={'管理多个课表'} value={''} borderon={false} onPress={() => { goToScheduleSwitch() }} />
```

同时将课表编辑那行的 `borderon={false}` 改为默认（删除该 prop）：

```tsx
<SettingBar title={'课表编辑'} detail={'添加、编辑、删除课程'} value={''} onPress={() => { goToCourseEdit() }} />
```

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx components/settingPage/scheduleSetting.tsx
git commit -m "feat: register scheduleSwitch route and add settings entry"
```

---

### Task 4: 新建 scheduleSwitch.tsx

**Files:**
- Create: `app/scheduleSwitch.tsx`

- [ ] **Step 1: 创建文件**

新建 `app/scheduleSwitch.tsx`，完整内容如下：

```tsx
import { useGlobalState } from '@/state/GlobalState';
import AntDesign from '@expo/vector-icons/AntDesign';
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

type Schedule = {
  id: string;
  name: string;
  schedulePeriod: [number, number];
  startDate: [number, number, number];
  timeLabelList: any[];
  myClassList: any[];
};

export default function ScheduleSwitch() {
  const { state, dispatch } = useGlobalState() as {
    state: any;
    dispatch: (action: { type: string; payload?: any }) => void;
  };

  const [menuSchedule, setMenuSchedule] = useState<Schedule | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameMode, setNameMode] = useState<'create' | 'rename'>('create');
  const [nameText, setNameText] = useState('');
  const [renameTarget, setRenameTarget] = useState<Schedule | null>(null);

  function formatSubtitle(s: Schedule) {
    const [y, m, d] = s.startDate;
    return `第${s.schedulePeriod[0]}-${s.schedulePeriod[1]}周 · ${y}/${m + 1}/${d} · ${s.myClassList.length}节课`;
  }

  function openCreate() {
    setNameMode('create');
    setNameText('');
    setNameModalVisible(true);
  }

  function openRename(s: Schedule) {
    setMenuSchedule(null);
    setNameMode('rename');
    setNameText(s.name);
    setRenameTarget(s);
    setNameModalVisible(true);
  }

  function confirmName() {
    const name = nameText.trim() || (nameMode === 'create' ? '新课表' : renameTarget?.name ?? '');
    if (nameMode === 'create') {
      dispatch({ type: 'CREATE_SCHEDULE', payload: { name } });
    } else if (renameTarget) {
      dispatch({ type: 'RENAME_SCHEDULE', payload: { id: renameTarget.id, name } });
    }
    setNameModalVisible(false);
    setNameText('');
    setRenameTarget(null);
  }

  function handleSwitchActive(id: string) {
    dispatch({ type: 'SWITCH_ACTIVE_SCHEDULE', payload: { id } });
  }

  function handleSetSecond(s: Schedule) {
    setMenuSchedule(null);
    dispatch({
      type: 'SET_SECOND_SCHEDULE',
      payload: { id: state.secondScheduleId === s.id ? null : s.id },
    });
  }

  function handleDelete(s: Schedule) {
    setMenuSchedule(null);
    Alert.alert('删除课表', `确认删除「${s.name}」？此操作不可恢复`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => dispatch({ type: 'DELETE_SCHEDULE', payload: { id: s.id } }),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>我的课表</Text>

        {state.schedules.map((s: Schedule) => {
          const isActive = s.id === state.activeScheduleId;
          const isSecond = s.id === state.secondScheduleId;
          return (
            <TouchableOpacity
              key={s.id}
              style={styles.card}
              onPress={() => handleSwitchActive(s.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorBar, { backgroundColor: isActive ? '#6454ab' : '#E0E0E0' }]} />
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  {isActive && (
                    <View style={styles.badgeActive}>
                      <Text style={styles.badgeActiveText}>当前</Text>
                    </View>
                  )}
                  {isSecond && (
                    <View style={styles.badgeSecond}>
                      <Text style={styles.badgeSecondText}>第二</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub}>{formatSubtitle(s)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuSchedule(s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="ellipsis1" size={20} color="#A5A5A5" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.hint}>点击卡片切换课表，点 ··· 可重命名、设为第二课表或删除</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <AntDesign name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>新建课表</Text>
        </TouchableOpacity>
      </View>

      {/* 操作菜单 */}
      <Modal
        visible={menuSchedule !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuSchedule(null)}
      >
        <View style={styles.modalBackdrop} />
        <Pressable style={styles.menuOverlay} onPress={() => setMenuSchedule(null)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && openRename(menuSchedule)}>
              <AntDesign name="edit" size={16} color="#575757" />
              <Text style={styles.menuItemText}>重命名</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleSetSecond(menuSchedule)}>
              <AntDesign name="swap" size={16} color="#575757" />
              <Text style={styles.menuItemText}>
                {menuSchedule && state.secondScheduleId === menuSchedule.id ? '取消第二课表' : '设为第二课表'}
              </Text>
            </TouchableOpacity>
            {state.schedules.length > 1 && menuSchedule && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(menuSchedule)}>
                  <AntDesign name="delete" size={16} color="#FF3B30" />
                  <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>删除课表</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 命名弹窗（新建/重命名复用） */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay2}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setNameModalVisible(false)} />
          <View style={styles.nameCard}>
            <View style={styles.nameCardHeader}>
              <Text style={styles.nameCardTitle}>{nameMode === 'create' ? '新建课表' : '重命名'}</Text>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <AntDesign name="close" size={20} color="#575757" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.nameInput}
              value={nameText}
              onChangeText={setNameText}
              placeholder={nameMode === 'create' ? '如：大三下学期' : '输入新名称'}
              placeholderTextColor="#C5C5C5"
              autoFocus
              maxLength={20}
            />
            <View style={styles.nameCardActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNameModalVisible(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmName}>
                <Text style={styles.confirmText}>{nameMode === 'create' ? '创建' : '确认'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F8' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 12, color: '#A5A5A5', fontWeight: '500' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  colorBar: { width: 4, height: 40, borderRadius: 2 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  badgeActive: { backgroundColor: '#EDE9F7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeActiveText: { fontSize: 11, fontWeight: '600', color: '#6454ab' },
  badgeSecond: { backgroundColor: '#FFF0F1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeSecondText: { fontSize: 11, fontWeight: '600', color: '#D48D95' },
  cardSub: { fontSize: 12, color: '#A5A5A5' },
  hint: { fontSize: 11, color: '#C5C5C5', textAlign: 'center', marginTop: 8 },
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
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, minWidth: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuItemText: { fontSize: 14, color: '#1A1A2E' },
  menuDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
  modalOverlay2: { flex: 1, justifyContent: 'flex-end' },
  nameCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 16,
  },
  nameCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  nameInput: {
    height: 44, backgroundColor: '#F8F8FA', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1A2E',
    borderWidth: 1, borderColor: '#E0D9F5',
  },
  nameCardActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0D9F5', alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#7A7A9A', fontWeight: '500' },
  confirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#6454ab', alignItems: 'center' },
  confirmText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
});
```

- [ ] **Step 2: 验证页面可访问**

从设置页点击"课表切换"，能看到课表列表、「新建课表」按钮、点三点弹出菜单（重命名/设为第二课表/删除）。新建课表后列表新增一行。

- [ ] **Step 3: Commit**

```bash
git add app/scheduleSwitch.tsx
git commit -m "feat: add schedule switch management page"
```

---

### Task 5: 首页 index.tsx — activeSchedule 读取 + 快速切换 chip

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: 更新 import 行**

将 `import React, { useState, useEffect } from 'react';` 改为：

```typescript
import React, { useState, useEffect, useRef } from 'react';
```

将 `import { Platform, StyleSheet, ScrollView, Text, View, Button } from 'react-native';` 改为：

```typescript
import { StyleSheet, ScrollView, Text, View, Pressable } from 'react-native';
```

在 `import AntDesign` 缺失时添加（文件顶部）：

```typescript
import AntDesign from '@expo/vector-icons/AntDesign';
```

- [ ] **Step 2: 替换 useGlobalState 后的所有 state 读取**

在 `const { state, dispatch } = useGlobalState();` 之后添加（替换原有的直接 `state.*` 读取方式）：

```typescript
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
  const secondSchedule = (state as any).secondScheduleId
    ? (state as any).schedules.find((s: any) => s.id === (state as any).secondScheduleId) ?? null
    : null;

  const [isViewingSecond, setIsViewingSecond] = useState(false);
  const [peekSchedule, setPeekSchedule] = useState<any>(null);
  const longPressRef = useRef(false);

  const displaySchedule = peekSchedule ?? (isViewingSecond && secondSchedule ? secondSchedule : activeSchedule);
```

- [ ] **Step 3: 更新 date 初始化和 get 函数**

将 `const [date, setDate] = useState(getCurrentWeekInfo(new Date(state.startDate[0], state.startDate[1], state.startDate[2])));` 改为：

```typescript
  const [date, setDate] = useState(() => getCurrentWeekInfo(new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2])));
```

将 `function get()` 完整函数替换为（使用 displaySchedule）：

```typescript
  function get() {
    const r = getCurrentWeekInfo(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2]));
    const result = getClassSchedule(displaySchedule.myClassList, r.day, r.week, displaySchedule.timeLabelList);
    setDate(r);
    setDailyClassList(result);
  }
```

- [ ] **Step 4: 更新 useEffect 依赖**

将 `}, [state.myClassList, state.timeLabelList]);` 改为：

```typescript
  }, [displaySchedule.myClassList, displaySchedule.timeLabelList, displaySchedule.startDate]);
```

- [ ] **Step 5: 替换 header 区域，添加 chip**

将：

```tsx
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.weekText}>{date.month}月{date.date}日 第{date.week}周 {weekday[date.day]} </Text>
      </View>
```

替换为：

```tsx
      <View style={styles.header}>
        <Text style={styles.weekText}>{date.month}月{date.date}日 第{date.week}周 {weekday[date.day]}</Text>
        {secondSchedule && (
          <Pressable
            style={[styles.switchChip, isViewingSecond && styles.switchChipActive]}
            onPress={() => setIsViewingSecond(prev => !prev)}
            onLongPress={() => { longPressRef.current = true; setPeekSchedule(secondSchedule); }}
            onPressOut={() => { if (longPressRef.current) { longPressRef.current = false; setPeekSchedule(null); } }}
            delayLongPress={400}
          >
            <AntDesign name="swap" size={13} color={isViewingSecond ? '#FFFFFF' : '#6454ab'} />
            <Text style={[styles.switchChipText, isViewingSecond && styles.switchChipTextActive]}>
              {(isViewingSecond ? secondSchedule : activeSchedule).name.slice(0, 5)}
            </Text>
          </Pressable>
        )}
      </View>
      {peekSchedule && (
        <View style={styles.peekBanner}>
          <Text style={styles.peekBannerText}>正在预览「{peekSchedule.name}」· 松手返回</Text>
        </View>
      )}
```

- [ ] **Step 6: 添加新样式**

在 `styles` 的 `StyleSheet.create({...})` 中添加：

```typescript
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, marginTop: 10, gap: 8,
  },
  switchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EDE9F7', borderRadius: 16,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  switchChipActive: { backgroundColor: '#6454ab' },
  switchChipText: { fontSize: 12, fontWeight: '600', color: '#6454ab' },
  switchChipTextActive: { color: '#FFFFFF' },
  peekBanner: {
    backgroundColor: '#3D2D8A', marginHorizontal: 16, marginTop: 4,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  peekBannerText: { fontSize: 12, color: '#EDE9F7', fontWeight: '500' },
```

并将原有 `weekText` 样式的 `marginTop: 10` 去掉（marginTop 已由 header 控制）：

```typescript
  weekText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#575757',
  },
```

- [ ] **Step 7: 验证**

在设置页 → 课表切换 → 新建第二课表 → 设为第二课表。返回首页应看到顶部出现 chip。点按 chip 切换，课程列表更新。长按 chip 出现深色横幅，松手恢复。

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: add quick-switch chip to home screen"
```

---

### Task 6: 周课表 weekschedule.tsx — activeSchedule 读取 + 快速切换 chip

**Files:**
- Modify: `app/(tabs)/weekschedule.tsx`

- [ ] **Step 1: 更新 import 行**

将 `import React, { useState, useEffect } from 'react';` 改为：

```typescript
import React, { useState, useEffect, useRef } from 'react';
```

将 `import { Platform, StyleSheet, ScrollView, Text, View, Button } from 'react-native';` 改为：

```typescript
import { StyleSheet, ScrollView, Text, View, Button, Pressable } from 'react-native';
```

在文件顶部添加（与其他 import 同级）：

```typescript
import AntDesign from '@expo/vector-icons/AntDesign';
```

- [ ] **Step 2: 替换 state 读取，添加 activeSchedule / displaySchedule**

在 `const { state, dispatch } = useGlobalState();` 之后插入：

```typescript
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
  const secondSchedule = (state as any).secondScheduleId
    ? (state as any).schedules.find((s: any) => s.id === (state as any).secondScheduleId) ?? null
    : null;

  const [isViewingSecond, setIsViewingSecond] = useState(false);
  const [peekSchedule, setPeekSchedule] = useState<any>(null);
  const longPressRef = useRef(false);

  const displaySchedule = peekSchedule ?? (isViewingSecond && secondSchedule ? secondSchedule : activeSchedule);
```

- [ ] **Step 3: 更新 useState 初始化**

将 `const [weekNumber, setWeekNumber] = useState(getCurrentWeekInfo(new Date(state.startDate[0], state.startDate[1], state.startDate[2])).week);` 改为：

```typescript
  const [weekNumber, setWeekNumber] = useState(() =>
    getCurrentWeekInfo(new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2])).week
  );
```

将 `const [weekDates, setWeekDates] = useState(getWeekDates(new Date(state.startDate[0], state.startDate[1], state.startDate[2]), weekNumber - 1, false));` 改为：

```typescript
  const [weekDates, setWeekDates] = useState(() =>
    getWeekDates(new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2]), weekNumber - 1, false)
  );
```

将 `const [classes, setClasses] = useState(getWeeklySchedule(state.myClassList, weekNumber, state.timeLabelList));` 改为：

```typescript
  const [classes, setClasses] = useState(() =>
    getWeeklySchedule(activeSchedule.myClassList, weekNumber, activeSchedule.timeLabelList)
  );
```

- [ ] **Step 4: 更新 upWeek / downWeek / fresh 函数**

将三个函数中所有 `state.schedulePeriod / state.startDate / state.myClassList / state.timeLabelList` 替换为对应的 `displaySchedule.*`：

```typescript
  function upWeek() {
    if (weekNumber <= displaySchedule.schedulePeriod[0]) return;
    const n = weekNumber - 1;
    setWeekNumber(n);
    setWeekDates(getWeekDates(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2]), n - 1, false));
    setClasses(getWeeklySchedule(displaySchedule.myClassList, n, displaySchedule.timeLabelList));
  }

  function downWeek() {
    if (weekNumber >= displaySchedule.schedulePeriod[1]) return;
    const n = weekNumber + 1;
    setWeekNumber(n);
    setWeekDates(getWeekDates(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2]), n - 1, false));
    setClasses(getWeeklySchedule(displaySchedule.myClassList, n, displaySchedule.timeLabelList));
  }

  function fresh() {
    const n = getCurrentWeekInfo(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2])).week;
    setWeekNumber(n);
    setWeekDates(getWeekDates(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2]), n - 1, false));
    setClasses(getWeeklySchedule(displaySchedule.myClassList, n, displaySchedule.timeLabelList));
  }
```

- [ ] **Step 5: 添加 displaySchedule 切换时重置的 useEffect**

在现有 `useEffect` 之后添加（切换课表时重置到当前周）：

```typescript
  useEffect(() => {
    fresh();
  }, [displaySchedule.myClassList, displaySchedule.timeLabelList, displaySchedule.startDate, displaySchedule.schedulePeriod]);
```

- [ ] **Step 6: 替换 `state.timeLabelList` 读取（grid 渲染）**

将 JSX 中所有 `state.timeLabelList` 替换为 `displaySchedule.timeLabelList`（共 3 处 `getTimeList(state.timeLabelList, ...)` 调用）：

```tsx
{getTimeList(displaySchedule.timeLabelList, 'morning').map(...)}
{getTimeList(displaySchedule.timeLabelList, 'afternoon').map(...)}
{getTimeList(displaySchedule.timeLabelList, 'night').map(...)}
```

- [ ] **Step 7: 添加快速切换 chip**

在周课表 header 的 `<View style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>` 内，`下一周 Button` 之后添加：

```tsx
          {secondSchedule && (
            <Pressable
              style={[styles.switchChip, isViewingSecond && styles.switchChipActive]}
              onPress={() => setIsViewingSecond(prev => !prev)}
              onLongPress={() => { longPressRef.current = true; setPeekSchedule(secondSchedule); }}
              onPressOut={() => { if (longPressRef.current) { longPressRef.current = false; setPeekSchedule(null); } }}
              delayLongPress={400}
            >
              <AntDesign name="swap" size={13} color={isViewingSecond ? '#FFFFFF' : '#6454ab'} />
              <Text style={[styles.switchChipText, isViewingSecond && styles.switchChipTextActive]}>
                {(isViewingSecond ? secondSchedule : activeSchedule).name.slice(0, 5)}
              </Text>
            </Pressable>
          )}
```

在 `</View>` 后（header 之后）添加 peekBanner：

```tsx
      {peekSchedule && (
        <View style={styles.peekBanner}>
          <Text style={styles.peekBannerText}>正在预览「{peekSchedule.name}」· 松手返回</Text>
        </View>
      )}
```

- [ ] **Step 8: 添加新样式**

在 `weekschedule.tsx` 的 StyleSheet 中添加：

```typescript
  switchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EDE9F7', borderRadius: 16,
    paddingVertical: 5, paddingHorizontal: 12, marginLeft: 8,
  },
  switchChipActive: { backgroundColor: '#6454ab' },
  switchChipText: { fontSize: 12, fontWeight: '600', color: '#6454ab' },
  switchChipTextActive: { color: '#FFFFFF' },
  peekBanner: {
    backgroundColor: '#3D2D8A', marginHorizontal: 16, marginTop: 4,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  peekBannerText: { fontSize: 12, color: '#EDE9F7', fontWeight: '500' },
```

- [ ] **Step 9: 验证**

新建第二课表并设为第二课表。打开周课表，顶部出现 chip。点按切换到第二课表，课程网格更新。长按出现横幅，松手恢复。

- [ ] **Step 10: Commit**

```bash
git add app/(tabs)/weekschedule.tsx
git commit -m "feat: add quick-switch chip to week schedule screen"
```

---

## 验证清单（所有 Task 完成后）

- [ ] 设置页 → 「课表切换」入口可点击，进入课表管理页
- [ ] 课表管理页：可新建课表（输入名称创建），列表新增一行
- [ ] 课表管理页：点击卡片切换当前课表，「当前」徽标跟随更新
- [ ] 课表管理页：点三点 → 重命名课表，名称更新
- [ ] 课表管理页：点三点 → 设为第二课表，「第二」徽标出现
- [ ] 课表管理页：点三点 → 取消第二课表，徽标消失
- [ ] 课表管理页：点三点 → 删除课表，列表移除（仅剩一个时删除选项不出现）
- [ ] 首页/周课表：设置第二课表后顶部出现 chip
- [ ] 首页/周课表：无第二课表时 chip 不显示
- [ ] 首页 chip：点按切换到第二课表课程，再点切回
- [ ] 首页 chip：长按出现深色横幅，松手恢复
- [ ] app 重启后默认显示 activeSchedule 课表（isViewingSecond 重置为 false）
- [ ] 旧数据（无 schedules 字段）自动迁移为「我默认课程表」
