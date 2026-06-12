# 通知设置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在课表 App 的设置页添加"通知设置"卡片，实现上课前10分钟本地推送提醒和每晚21:00明日课程摘要推送。

**Architecture:** 使用 expo-notifications 调度本地通知，采用滚动7天窗口策略（每次 app 启动或数据变更时取消全部旧通知并重新调度接下来7天）；通知开关状态存入 GlobalState / AsyncStorage；根布局中的内部组件 NotificationInitializer 负责监听状态变化触发重调度及处理通知点击跳页。

**Tech Stack:** expo-notifications ~0.28.x, React Native Switch, GlobalState (Context + useReducer + AsyncStorage), expo-router imperative router

---

## 文件结构

| 文件 | 变更 | 职责 |
|------|------|------|
| `utils/notificationService.ts` | 新建 | 权限申请、取消通知、7天窗口重调度逻辑 |
| `state/GlobalState.js` | 修改 | 新增 notificationSettings 字段、action、持久化 |
| `components/settingBar.tsx` | 修改 | 新增可选 rightElement prop |
| `components/settingPage/scheduleSetting.tsx` | 修改 | 追加通知设置卡片 UI |
| `app/_layout.tsx` | 修改 | 新增 NotificationInitializer 组件：channel 创建 + 重调度触发 + 点击跳页 |
| `app.json` | 修改 | 注册 expo-notifications 插件，补充 iOS 权限说明文字 |

---

## Task 1: 安装依赖并配置 app.json

**Files:**
- Modify: `app.json`

- [ ] **Step 1: 安装 expo-notifications**

```bash
cd scheduleAPP
npx expo install expo-notifications
```

Expected: `package.json` 中出现 `"expo-notifications": "~0.28.x"`

- [ ] **Step 2: 在 app.json 中注册插件并补充 iOS 权限描述**

将 `app.json` 中 `"plugins"` 数组末尾追加，并在 `"ios"` 节点添加 `infoPlist`：

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSUserNotificationsUsageDescription": "需要通知权限以在上课前及每晚推送课程提醒"
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": { "backgroundColor": "#000000" }
        }
      ],
      "expo-secure-store",
      "expo-notifications"
    ]
  }
}
```

- [ ] **Step 3: 验证安装**

```bash
npx expo start
```

Expected: 开发服务器正常启动，无 "Cannot resolve module 'expo-notifications'" 报错。

- [ ] **Step 4: Commit**

```bash
git add package.json app.json
git commit -m "chore: 安装 expo-notifications 并配置 app.json"
```

---

## Task 2: GlobalState 新增 notificationSettings

**Files:**
- Modify: `state/GlobalState.js`

> **背景**：GlobalState 使用 React Context + useReducer，状态通过 AsyncStorage key `'appState'` 持久化。顶层 state 结构为 `{ schedules, activeScheduleId, secondScheduleId, needUpdate }`。本 task 在顶层新增 `notificationSettings`。

- [ ] **Step 1: 在 initialState 中新增字段**

找到 `state/GlobalState.js` 第 19 行 `const initialState = {`，将其改为：

```js
const initialState = {
  schedules: [makeDefaultSchedule()],
  activeScheduleId: DEFAULT_ID,
  secondScheduleId: null,
  needUpdate: [],
  notificationSettings: {
    classReminder: false,
    dailyDigest: false,
  },
};
```

- [ ] **Step 2: 在 globalReducer 中添加 SET_NOTIFICATION_SETTINGS action**

在 `case 'RESET_ALL_DATA':` 之前插入：

```js
case 'SET_NOTIFICATION_SETTINGS':
  return { ...state, notificationSettings: action.payload };
```

- [ ] **Step 3: 更新 LOAD_STATE_FROM_STORAGE 迁移逻辑（兼容旧数据）**

在 `case 'LOAD_STATE_FROM_STORAGE':` 的最后一行 `return { ...state, ...saved, needUpdate: [] };` 改为：

```js
return {
  ...state,
  ...saved,
  needUpdate: [],
  notificationSettings: saved.notificationSettings ?? { classReminder: false, dailyDigest: false },
};
```

- [ ] **Step 4: 更新 saveStateToStorage 持久化字段**

找到 `saveStateToStorage` 函数，将 `AsyncStorage.setItem` 的 JSON 改为：

```js
await AsyncStorage.setItem('appState', JSON.stringify({
  schedules: state.schedules,
  activeScheduleId: state.activeScheduleId,
  secondScheduleId: state.secondScheduleId,
  notificationSettings: state.notificationSettings,
}));
```

- [ ] **Step 5: 在 RESET_ALL_DATA 中还原默认值**

将 `case 'RESET_ALL_DATA':` 改为：

```js
case 'RESET_ALL_DATA':
  return {
    schedules: [makeDefaultSchedule()],
    activeScheduleId: DEFAULT_ID,
    secondScheduleId: null,
    needUpdate: [],
    notificationSettings: { classReminder: false, dailyDigest: false },
  };
```

- [ ] **Step 6: 运行 app 验证状态正常**

```bash
npx expo start
```

打开 Settings 页，确认 app 无崩溃，开发者面板的 state 中有 `notificationSettings` 字段。

- [ ] **Step 7: Commit**

```bash
git add state/GlobalState.js
git commit -m "feat: GlobalState 新增 notificationSettings 字段与 action"
```

---

## Task 3: 新建 utils/notificationService.ts

**Files:**
- Create: `utils/notificationService.ts`

> **背景**：此文件封装全部本地通知逻辑。核心算法：枚举今天起后7天，对每天用与 `getCurrentWeekInfo` 相同的公式计算 weekday（1=周一…7=周日）和 weekNum（第几教学周），过滤课程后调度通知。

- [ ] **Step 1: 创建文件并编写完整实现**

新建 `utils/notificationService.ts`，内容如下：

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ---- 类型定义（与 GlobalState / utils 保持一致）----

interface TimeLabelItem {
  label: string;
  from: string;   // "HH:MM"
  to: string;     // "HH:MM"
  time: 'morning' | 'afternoon' | 'night';
}

interface ClassItem {
  uid: string;
  className: string;
  week: number;      // 星期几 1-7（1=周一）
  mounth: number[];  // 上课教学周列表（历史拼写保留）
  time: number[];    // [开始节次, 结束节次] 1-based
  classRoom: string;
  [key: string]: any;
}

interface Schedule {
  id: string;
  schedulePeriod: [number, number]; // [minWeek, maxWeek]
  startDate: [number, number, number]; // [year, month, day]，month 0-based
  timeLabelList: TimeLabelItem[];
  myClassList: ClassItem[];
}

interface NotificationSettings {
  classReminder: boolean;
  dailyDigest: boolean;
}

interface AppState {
  schedules: Schedule[];
  activeScheduleId: string;
  notificationSettings: NotificationSettings;
}

// ---- 工具函数 ----

/**
 * 与 getCurrentWeekInfo 逻辑一致，但接受任意目标日期而非 new Date()。
 * 返回 targetDate 相对于学期开始日期的 { weekNum, weekday }。
 */
function getDateWeekInfo(
  semesterStart: Date,
  targetDate: Date
): { weekNum: number; weekday: number } {
  const start = new Date(semesterStart);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const startDayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
  const adjustedDayDiff = dayDiff + (startDayOfWeek - 1);
  const weekNum = Math.ceil((adjustedDayDiff + 1) / 7);
  const weekday = target.getDay() === 0 ? 7 : target.getDay();

  return { weekNum, weekday };
}

/** 解析 "HH:MM" 字符串，返回 { h, m } */
function parseTime(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, m };
}

/** 获取 targetDate 当天指定时刻的 Date 对象 */
function dateAtTime(targetDate: Date, h: number, m: number, s = 0): Date {
  const d = new Date(targetDate);
  d.setHours(h, m, s, 0);
  return d;
}

// ---- 公开 API ----

/** 向用户申请通知权限，返回是否已授权 */
export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

/** 取消全部待推送的本地通知 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 核心入口：取消所有旧通知，根据当前 state 重新调度接下来7天的通知。
 * 当两个开关均关闭时直接 cancel 并返回。
 */
export async function rescheduleAll(state: AppState): Promise<void> {
  const { notificationSettings, schedules, activeScheduleId } = state;

  // 两开关均关闭，直接清理
  if (!notificationSettings.classReminder && !notificationSettings.dailyDigest) {
    await cancelAllNotifications();
    return;
  }

  const schedule = schedules.find(s => s.id === activeScheduleId) ?? schedules[0];
  if (!schedule) return;

  const { myClassList, timeLabelList, startDate, schedulePeriod } = schedule;
  const semesterStart = new Date(startDate[0], startDate[1], startDate[2]);
  const [minWeek, maxWeek] = schedulePeriod;

  await cancelAllNotifications();

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(todayMidnight.getTime() + i * msPerDay);
    const { weekNum, weekday } = getDateWeekInfo(semesterStart, targetDate);

    // 该日在学期范围内才处理上课提醒
    if (weekNum >= minWeek && weekNum <= maxWeek) {
      const dayClasses = myClassList.filter(
        c => c.week === weekday && c.mounth.includes(weekNum)
      );

      if (notificationSettings.classReminder) {
        for (const cls of dayClasses) {
          const slotIndex = cls.time[0] - 1;
          if (slotIndex < 0 || slotIndex >= timeLabelList.length) continue;

          const { h, m } = parseTime(timeLabelList[slotIndex].from);
          // setHours 支持负分钟数，会自动借位（如 setHours(8, -5) = 07:55）
          const notifTime = dateAtTime(targetDate, h, m - 10);

          if (notifTime > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '即将上课',
                body: `《${cls.className}》10分钟后开始 · ${cls.classRoom}`,
                data: { target: 'index' },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notifTime,
                ...(Platform.OS === 'android' ? { channelId: 'schedule' } : {}),
              } as any,
            });
          }
        }
      }
    }

    // 明日课程摘要：在当天21:00推送，内容为明日课程
    if (notificationSettings.dailyDigest) {
      const digestTime = dateAtTime(targetDate, 21, 0);
      if (digestTime > now) {
        const tomorrowDate = new Date(targetDate.getTime() + msPerDay);
        const { weekNum: tmrWeekNum, weekday: tmrWeekday } = getDateWeekInfo(semesterStart, tomorrowDate);

        let tomorrowCount = 0;
        if (tmrWeekNum >= minWeek && tmrWeekNum <= maxWeek) {
          tomorrowCount = myClassList.filter(
            c => c.week === tmrWeekday && c.mounth.includes(tmrWeekNum)
          ).length;
        }

        const body =
          tomorrowCount > 0
            ? `明天有 ${tomorrowCount} 节课，点击查看`
            : '明天没有课，好好休息！';

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '明日课程',
            body,
            data: { target: 'weekschedule' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: digestTime,
            ...(Platform.OS === 'android' ? { channelId: 'schedule' } : {}),
          } as any,
        });
      }
    }
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译无报错**

```bash
npx tsc --noEmit
```

Expected: 无错误输出（可能有 `as any` 相关 hint，可忽略）。

- [ ] **Step 3: Commit**

```bash
git add utils/notificationService.ts
git commit -m "feat: 新增 notificationService，实现7天滚动窗口通知调度"
```

---

## Task 4: SettingBar 新增 rightElement prop

**Files:**
- Modify: `components/settingBar.tsx`

> **背景**：当前 SettingBar 右侧固定展示 `value文字 + 右箭头`。需新增可选 `rightElement` prop；有传入时用它替换右侧全部内容，无传入时行为与现在完全一致（向后兼容）。

- [ ] **Step 1: 修改 settingBar.tsx**

将 `components/settingBar.tsx` 全文替换为：

```tsx
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import React from 'react';

// @ts-ignore
const SettingBar = ({ title, detail, value = '', borderon = true, onPress, rightElement }) => {
    const content = (
        <View style={[styles.container, borderon ? { borderBottomWidth: 1, borderColor: '#f1f1f1ff' } : {}]}>
            <View style={styles.leftArea}>
                <Text style={[styles.title]}>{title}</Text>
                <Text style={[styles.detail]}>{detail}</Text>
            </View>
            <View style={styles.rightArea}>
                {rightElement
                    ? rightElement
                    : (
                        <>
                            <Text style={[styles.right]}>{value}</Text>
                            <AntDesign name="right" size={15} color="#464646ff" />
                        </>
                    )
                }
            </View>
        </View>
    );

    return onPress ? (
        <TouchableOpacity style={styles.touchableStyle} onPress={onPress}>
            {content}
        </TouchableOpacity>
    ) : (
        content
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
    },
    touchableStyle: {
        width: '100%'
    },
    leftArea: {
        width: '65%',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        padding: 18,
        paddingRight: 5,
    },
    rightArea: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'row',
        padding: 16,
        paddingLeft: 5,
        height: 50,
    },
    title: {
        width: '100%',
        textAlign: 'left',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 3,
        color: '#353535ff',
    },
    detail: {
        fontSize: 14,
        color: '#818181',
    },
    right: {
        fontSize: 14,
        color: '#818181',
        marginRight: 5,
    },
});

export default SettingBar;
```

- [ ] **Step 2: 运行 app 验证现有 SettingBar 无变化**

```bash
npx expo start
```

打开设置页，确认"导入JSON"、"本学期总周数"、"开始上课时间"等已有条目样式和行为正常。

- [ ] **Step 3: Commit**

```bash
git add components/settingBar.tsx
git commit -m "feat: SettingBar 新增可选 rightElement prop"
```

---

## Task 5: scheduleSetting.tsx 添加通知设置卡片

**Files:**
- Modify: `components/settingPage/scheduleSetting.tsx`

> **背景**：scheduleSetting.tsx 已有"课表设置"卡片，包含导入JSON、总周数等条目。在其下方新增"通知设置"卡片，含两个带 Switch 的条目。Switch 使用 React Native 内置组件，颜色与主色 #6454ab 保持一致。

- [ ] **Step 1: 修改 scheduleSetting.tsx，添加通知设置卡片**

将 `components/settingPage/scheduleSetting.tsx` 全文替换为：

```tsx
import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import SettingCard from '@/components/settingCard';
import SettingBar from '@/components/settingBar';
import { useNavigation } from '@react-navigation/native';
import { useGlobalState } from '@/state/GlobalState.js';
import { Picker } from '@ant-design/react-native';
import { DatePicker } from '@ant-design/react-native';
import { requestPermissions, rescheduleAll } from '@/utils/notificationService';

export default function ScheduleSetting() {
    const navigation = useNavigation();
    const { state, dispatch } = useGlobalState();
    const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
    const notificationSettings = (state as any).notificationSettings ?? { classReminder: false, dailyDigest: false };

    const [circleVisible, setCircleVisible] = useState(false);
    const [timeSelectVisible, setTimeSelectVisible] = useState(false);

    const currectWeek = [(activeSchedule as any).schedulePeriod[1].toString()];

    function dataInit() {
        const temp = [];
        for (let i = 1; i < 41; i++) {
            temp.push({ label: i.toString(), value: i });
        }
        return temp;
    }
    const circleSelectList = dataInit();

    function goToJsonImport() { navigation.navigate('jsonImport' as never); }
    function goToTimeLabelSetting() { navigation.navigate('timeLabelSetting' as never); }
    function goToCourseEdit() { navigation.navigate('courseEdit' as never); }
    function goToScheduleSwitch() { navigation.navigate('scheduleSwitch' as never); }

    async function handleNotificationToggle(key: 'classReminder' | 'dailyDigest', value: boolean) {
        // 开启时检查权限
        if (value) {
            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert(
                    '通知权限未开启',
                    '请前往系统设置 > 通知，为本 App 开启通知权限后再试。',
                    [{ text: '知道了', style: 'cancel' }]
                );
                return; // 不更新 state，Toggle 保持关闭
            }
        }

        const newSettings = { ...notificationSettings, [key]: value };
        dispatch({ type: 'SET_NOTIFICATION_SETTINGS', payload: newSettings });
        // 调用 rescheduleAll 时传入最新 state（dispatch 尚未同步更新 state，手动构造）
        rescheduleAll({ ...(state as any), notificationSettings: newSettings });
    }

    return (
        <>
            <SettingCard title="课表设置">
                <SettingBar title={'导入JSON'} detail={'粘贴格式化课程JSON数据'} value={''} onPress={() => { goToJsonImport(); }} />
                <SettingBar title={'本学期总周数'} detail={'设置本学期总周数'} value={(activeSchedule as any).schedulePeriod[1].toString()} onPress={() => setCircleVisible(true)} />
                <SettingBar title={'开始上课时间'} detail={'设置开始上课时间'} value={`${(activeSchedule as any).startDate[0]}-${(activeSchedule as any).startDate[1] + 1}-${(activeSchedule as any).startDate[2]}`} onPress={() => { setTimeSelectVisible(true); }} />
                <SettingBar title={'课程时间设置'} detail={'设置每节课的上下课时间'} value={''} onPress={() => { goToTimeLabelSetting(); }} />
                <SettingBar title={'课表编辑'} detail={'添加、编辑、删除课程'} value={''} onPress={() => { goToCourseEdit(); }} />
                <SettingBar title={'课表切换'} detail={'管理多个课表'} value={''} borderon={false} onPress={() => { goToScheduleSwitch(); }} />
            </SettingCard>

            <SettingCard title="通知设置">
                <SettingBar
                    title="上课通知"
                    detail="上课前10分钟提醒"
                    rightElement={
                        <Switch
                            value={notificationSettings.classReminder}
                            onValueChange={(v: boolean) => handleNotificationToggle('classReminder', v)}
                            trackColor={{ false: '#E0E0E0', true: '#b5a9d9' }}
                            thumbColor={notificationSettings.classReminder ? '#6454ab' : '#f4f3f4'}
                        />
                    }
                    borderon={true}
                />
                <SettingBar
                    title="明日课程通知"
                    detail="每晚9点推送次日课程"
                    rightElement={
                        <Switch
                            value={notificationSettings.dailyDigest}
                            onValueChange={(v: boolean) => handleNotificationToggle('dailyDigest', v)}
                            trackColor={{ false: '#E0E0E0', true: '#b5a9d9' }}
                            thumbColor={notificationSettings.dailyDigest ? '#6454ab' : '#f4f3f4'}
                        />
                    }
                    borderon={false}
                />
            </SettingCard>

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
        </>
    );
}
```

- [ ] **Step 2: 运行 app 验证通知设置卡片显示正常**

```bash
npx expo start
```

进入 Settings 页，确认：
1. "通知设置"卡片出现在"课表设置"下方
2. 两个 Switch 默认为关闭（灰色）状态
3. 已有课表设置条目功能正常

- [ ] **Step 3: 测试权限弹窗**

在真机或模拟器上点击任一 Switch 开启，确认：
- 首次开启弹出系统权限申请弹窗
- 允许权限后 Switch 保持开启
- 若拒绝权限，Switch 回退为关闭并弹出 Alert 提示

- [ ] **Step 4: Commit**

```bash
git add components/settingPage/scheduleSetting.tsx
git commit -m "feat: 设置页新增通知设置卡片，含上课通知和明日课程通知开关"
```

---

## Task 6: _layout.tsx 集成（Notification Channel + 重调度 + 点击跳页）

**Files:**
- Modify: `app/_layout.tsx`

> **背景**：`_layout.tsx` 的 `RootLayout` 是 `GlobalStateProvider` 的父组件，因此无法直接在 `RootLayout` 里调用 `useGlobalState()`。解决方案：新增内部组件 `NotificationInitializer`（渲染 null），放置在 `GlobalStateProvider` 内部，由它负责：① Android 通知渠道创建、② 监听 state 变化触发 rescheduleAll、③ 监听通知点击事件跳页。`setNotificationHandler` 在模块顶层调用，控制前台通知的展示行为。

- [ ] **Step 1: 修改 app/_layout.tsx 全文如下**

```tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GlobalStateProvider, useGlobalState } from '@/state/GlobalState.js';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider } from '@ant-design/react-native';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { rescheduleAll } from '@/utils/notificationService';

// 控制通知在前台（App 开着时）的展示行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 内部组件：需在 GlobalStateProvider 内部才能调用 useGlobalState。
 * 职责：① 创建 Android 通知渠道 ② 监听 state 变化触发重调度 ③ 处理通知点击跳页。
 */
function NotificationInitializer() {
  const { state } = useGlobalState() as { state: any; dispatch: any };
  const activeSchedule = state.schedules.find((s: any) => s.id === state.activeScheduleId);

  // Android 通知渠道：只需创建一次（重复调用是幂等的）
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('schedule', {
        name: '课表提醒',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  }, []);

  // 当通知设置或课表关键数据变化时重调度
  useEffect(() => {
    rescheduleAll(state);
  }, [
    state.notificationSettings,
    state.activeScheduleId,
    activeSchedule?.myClassList,
    activeSchedule?.timeLabelList,
    activeSchedule?.startDate,
    activeSchedule?.schedulePeriod,
  ]);

  // 通知点击跳页
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const target = response.notification.request.content.data?.target;
      if (target === 'index') router.replace('/(tabs)/');
      if (target === 'weekschedule') router.replace('/(tabs)/weekschedule');
    });
    return () => sub.remove();
  }, []);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Provider>
      <GlobalStateProvider>
        <NotificationInitializer />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack style={{ paddingTop: insets.top }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="jsonImport" options={{ presentation: 'modal', title: '导入JSON课表数据' }} />
            <Stack.Screen name="timeLabelSetting" options={{ title: '课程时间设置' }} />
            <Stack.Screen name="courseEdit" options={{ title: '课表编辑' }} />
            <Stack.Screen name="scheduleSwitch" options={{ title: '课表切换' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GlobalStateProvider>
    </Provider>
  );
}
```

- [ ] **Step 2: 运行 app 验证无崩溃**

```bash
npx expo start
```

Expected: app 正常启动，Settings 页通知开关可正常操作，控制台无通知相关报错。

- [ ] **Step 3: 验证通知调度（真机）**

1. 打开设置 → 开启"上课通知"
2. 在课表中添加一节课，设置为"今天 + 当前时间后15分钟"的节次
3. 用 `Notifications.getAllScheduledNotificationsAsync()` 在开发者控制台验证（或等待10分钟后收到通知）
4. 点击通知确认跳转到首页（今日课程 Tab）

- [ ] **Step 4: 验证明日课程通知（可跳过，需等到当天21:00）**

开启"明日课程通知"后，下一个21:00会收到通知（body 显示明天课程数或"明天没有课"），点击后跳转到周课表页。

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: _layout 集成通知渠道创建、重调度触发和点击跳页"
```

---

## 自检结果（Spec Coverage）

| 规格需求 | 对应 Task |
|----------|----------|
| 上课前10分钟推送通知 | Task 3（rescheduleAll classReminder 分支） |
| 点击上课通知打开首页 | Task 6（data.target = 'index'） |
| 每晚21:00推送明日课程 | Task 3（rescheduleAll dailyDigest 分支） |
| 点击摘要通知打开周课表 | Task 6（data.target = 'weekschedule'） |
| 通知基于 activeSchedule | Task 3（schedules.find(activeScheduleId)） |
| 通知开关独立控制 | Task 5（handleNotificationToggle 独立 key） |
| 权限被拒回退 Toggle | Task 5（requestPermissions 返回 false 时 return） |
| 设置持久化 | Task 2（saveStateToStorage 新增字段） |
| 旧数据迁移兼容 | Task 2（?? fallback 默认值） |
| Android 通知渠道 | Task 6（setNotificationChannelAsync） |
| 切换激活课表后重调度 | Task 6（useEffect deps 含 activeScheduleId） |
