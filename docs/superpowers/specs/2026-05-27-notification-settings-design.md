# 通知设置功能设计文档

**Goal:** 为课表 App 添加本地推送通知功能，包含上课前提醒和每日明日课程摘要，通过设置页面的开关控制。

**Architecture:** 使用 `expo-notifications` 实现本地定时通知，采用滚动7天窗口策略调度通知（每次 app 启动或数据变更时重新调度接下来7天的通知），通知配置持久化至 GlobalState / AsyncStorage。

**Tech Stack:** expo-notifications, React Native Switch, GlobalState (Context + useReducer + AsyncStorage)

---

## 1. 需求说明

### 1.1 上课通知
- 开启后，在当前激活课表（activeSchedule）每节课开始前 **10 分钟**推送本地通知
- 通知内容：`title = "即将上课"`，`body = "《{className}》10分钟后开始 · {classRoom}"`
- 点击通知打开首页（今日课程 Tab）

### 1.2 明日课程通知
- 开启后，每晚 **21:00** 推送次日课程摘要
- 有课时：`title = "明日课程"`，`body = "明天有{N}节课，点击查看"`
- 无课时：`title = "明日课程"`，`body = "明天没有课，好好休息！"`
- 点击通知打开周课表页（weekschedule Tab）

### 1.3 通用规则
- 通知基于 **activeSchedule**，切换激活课表后自动重新调度
- 两个开关独立控制，互不影响
- 首次开启任一开关时弹出系统权限申请；权限被拒则 Toggle 回退并 Alert 提示

---

## 2. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `utils/notificationService.ts` | 新建 | 全部通知调度逻辑 |
| `state/GlobalState.js` | 修改 | 新增 notificationSettings 字段与 action |
| `components/settingBar.tsx` | 修改 | 新增可选 rightElement prop |
| `components/settingPage/scheduleSetting.tsx` | 修改 | 追加通知设置卡片 |
| `app/_layout.tsx` | 修改 | 重调度触发 + 通知点击跳页监听 |

---

## 3. 状态层设计（GlobalState.js）

### 3.1 新增字段

```js
// initialState 顶层新增（与 schedules 并列，不属于单个课表）
notificationSettings: {
  classReminder: false,   // 上课通知开关
  dailyDigest: false,     // 明日课程通知开关
}
```

### 3.2 新增 Reducer Action

```js
case 'SET_NOTIFICATION_SETTINGS':
  return { ...state, notificationSettings: action.payload };
```

### 3.3 持久化

- `saveStateToStorage`：新增 `notificationSettings: state.notificationSettings`
- `LOAD_STATE_FROM_STORAGE`：旧数据无此字段时使用默认值 `{ classReminder: false, dailyDigest: false }`

---

## 4. 通知服务（utils/notificationService.ts）

### 4.1 导出函数

```ts
// 请求通知权限，返回是否获得授权
export async function requestPermissions(): Promise<boolean>

// 取消全部待推送的本地通知
export async function cancelAllNotifications(): Promise<void>

// 核心入口：取消旧通知，根据当前 state 重新调度
export async function rescheduleAll(state: AppState): Promise<void>
```

### 4.2 rescheduleAll 逻辑

```
1. 若 classReminder 和 dailyDigest 均为 false → cancelAllNotifications() 并返回
2. 取 activeSchedule（通过 activeScheduleId 查找 schedules）
3. 调用 cancelAllNotifications()
4. 枚举今天起后 7 天（index = 0..6）：
   a. 计算该日的 Date 对象、weekday（1-7）、weekNum（第几周）
   b. 若 weekNum 超出 schedulePeriod 范围则跳过
   c. 过滤出当天有课的 ClassItem：
      item.week === weekday && item.mounth.includes(weekNum)
   d. 若 classReminder = true：
      对每节课按 timeLabelList 查找 startTime（HH:MM），
      构造触发时间 = 课程当日该时刻 - 10分钟，
      若触发时间 > 当前时间则 scheduleNotificationAsync（one-shot）
      data: { target: 'index' }
   e. 若 dailyDigest = true：
      取 index+1 天（明日）的课程列表（同上过滤），
      在当天 21:00 调度摘要通知（one-shot）
      body 根据课程数量选择有课/无课文案
      data: { target: 'weekschedule' }
```

### 4.3 通知 iOS/Android 配置

所有通知设置 `channelId: 'schedule'`（Android 需提前创建 channel）。Android channel 在 `_layout.tsx` 中 app 启动时创建一次。

---

## 5. UI 组件

### 5.1 SettingBar 改造（components/settingBar.tsx）

新增可选 prop `rightElement?: React.ReactNode`。右侧区域逻辑：

```tsx
<View style={styles.rightArea}>
  {rightElement
    ? rightElement
    : (
      <>
        <Text style={styles.right}>{value}</Text>
        <AntDesign name="right" size={15} color="#464646ff" />
      </>
    )
  }
</View>
```

无其他改动，完全向后兼容。

### 5.2 通知设置卡片（scheduleSetting.tsx 追加）

在现有"课表切换"条目后，追加：

```tsx
<SettingCard title="通知设置">
  <SettingBar
    title="上课通知"
    detail="上课前10分钟提醒"
    rightElement={
      <Switch
        value={notificationSettings.classReminder}
        onValueChange={(v) => handleToggle('classReminder', v)}
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
        onValueChange={(v) => handleToggle('dailyDigest', v)}
        trackColor={{ false: '#E0E0E0', true: '#b5a9d9' }}
        thumbColor={notificationSettings.dailyDigest ? '#6454ab' : '#f4f3f4'}
      />
    }
    borderon={false}
  />
</SettingCard>
```

`handleToggle` 逻辑：
1. 若新值为 true 且当前无任何通知权限 → 调用 `requestPermissions()`，权限被拒则不更新 state，Alert 提示用户去系统设置开启
2. dispatch `SET_NOTIFICATION_SETTINGS` 更新对应字段
3. 调用 `rescheduleAll(newState)`

---

## 6. 根布局集成（app/_layout.tsx）

### 6.1 Android Notification Channel

```ts
useEffect(() => {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('schedule', {
      name: '课表提醒',
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
    });
  }
}, []);
```

### 6.2 重调度触发

```ts
const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId);

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
```

### 6.3 通知点击跳页

```ts
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const target = response.notification.request.content.data?.target;
    if (target === 'index') router.replace('/(tabs)/');
    if (target === 'weekschedule') router.replace('/(tabs)/weekschedule');
  });
  return () => sub.remove();
}, []);
```

---

## 7. 边界情况

| 情况 | 处理方式 |
|------|----------|
| 课程开始时间 - 10min < 当前时间 | 跳过该条通知，不调度 |
| weekNum 超出 schedulePeriod | 跳过该天 |
| 当天为周六/周日（weekday 6/7）且无课 | 正常跳过（过滤后为空数组） |
| 调度总数超 iOS 64 条上限 | 实际不会超：7天 × 最多8节/天 = 56条上课提醒 + 7条摘要 = 63条 |
| app 超过7天未启动 | 通知自然停止，下次打开时重新续期 |
| 切换激活课表 | _layout useEffect 监听 activeScheduleId 变化，自动重调度 |
