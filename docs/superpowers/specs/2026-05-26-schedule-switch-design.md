# 课表切换 Design Spec

## 目标

支持用户管理多个课表（每个课表独立存储周数、开始日期、课程时间标签、课程列表），并在首页/周课表提供快速预览第二课表的交互。

---

## 架构选型

**方案二：完全嵌套 State**

GlobalState 从四个平铺字段迁移为 `schedules[]` 数组，所有页面通过 `activeScheduleId` 指向的课表读取数据。选择此方案的原因是数据隔离最干净，各课表状态互不干扰。

---

## 数据结构

### 新 GlobalState

```javascript
state = {
  schedules: [
    {
      id: string,                           // Date.now().toString()，创建时生成
      name: string,                         // 用户命名，如"大三下学期"
      schedulePeriod: [number, number],     // [起始周, 结束周]，如 [1, 20]
      startDate: [number, number, number],  // [年, 月(0-based), 日]
      timeLabelList: TimeLabelItem[],       // 节次时间配置
      myClassList: ClassItem[],             // 课程列表
    }
  ],
  activeScheduleId: string,         // 当前"默认"课表 ID，持久化
  secondScheduleId: string | null,  // 快速切换目标 ID，持久化；null 表示未设置
  needUpdate: [],                   // 运行时刷新标志，不持久化
}
```

### 默认新建课表的初始值

```javascript
{
  id: Date.now().toString(),
  name: "新课表",
  schedulePeriod: [1, 20],
  startDate: [today.year, today.month, today.day],  // 创建当天
  timeLabelList: timeList,   // 来自 utils/timeLabel.ts 的默认12节配置
  myClassList: [],
}
```

### 首次安装默认课表

应用初始化时若 `schedules` 不存在，自动创建一个 id 为 `"default"` 的课表：

```javascript
{
  id: "default",
  name: "我默认课程表",
  schedulePeriod: [1, 20],
  startDate: [2025, 8, 17],
  timeLabelList: timeList,
  myClassList: [],
}
```

### AsyncStorage 持久化字段

```javascript
{
  schedules,
  activeScheduleId,
  secondScheduleId,
  // needUpdate 不保存
}
```

---

## 数据迁移

`LOAD_STATE_FROM_STORAGE` 时检测旧数据结构：若 `savedState.schedules` 不存在但存在旧平铺字段，自动创建迁移：

```javascript
if (!savedState.schedules) {
  const migratedSchedule = {
    id: "default",
    name: "我默认课程表",
    schedulePeriod: savedState.schedulePeriod ?? [1, 20],
    startDate: savedState.startDate ?? [2025, 8, 17],
    timeLabelList: savedState.timeLabelList ?? timeList,
    myClassList: savedState.myClassList ?? [],
  };
  return {
    schedules: [migratedSchedule],
    activeScheduleId: "default",
    secondScheduleId: null,
    needUpdate: [],
  };
}
```

---

## Reducer Actions

### 保留的现有 Action（行为变更：操作 active schedule 的字段）

| Action | 新行为 |
|--------|--------|
| `SET_SCHEDULE_PERIOD` | 更新 `schedules[activeId].schedulePeriod` |
| `SET_START_DATE` | 更新 `schedules[activeId].startDate` |
| `SET_TIME_LABEL_LIST` | 更新 `schedules[activeId].timeLabelList` |
| `SET_MY_CLASS_LIST` | 更新 `schedules[activeId].myClassList` |
| `SET_NEED_UPDATE` | 同旧行为（全局 flag） |
| `LOAD_STATE_FROM_STORAGE` | 合并时带迁移逻辑 |
| `RESET_ALL_DATA` | 重置为含单个默认课表的 initialState |

### 新增 Action

| Action | Payload | 说明 |
|--------|---------|------|
| `CREATE_SCHEDULE` | `{ name: string }` | 新建课表，默认值见上文，push 到 schedules |
| `DELETE_SCHEDULE` | `{ id: string }` | 删除指定课表；若被删除的是 activeScheduleId，切换到第一个课表；若是 secondScheduleId，清空 secondScheduleId；至少保留一个课表 |
| `RENAME_SCHEDULE` | `{ id, name }` | 重命名指定课表 |
| `SWITCH_ACTIVE_SCHEDULE` | `{ id: string }` | 切换默认课表（来自 scheduleSwitch 页） |
| `SET_SECOND_SCHEDULE` | `{ id: string \| null }` | 设置/清空第二课表 |

---

## 页面与组件

### 入口：`components/settingPage/scheduleSetting.tsx`

在"课表编辑"SettingBar 下方新增一行：

```
课表切换    管理多个课表    >
```

点击跳转 `scheduleSwitch` 页。

### 路由：`app/_layout.tsx`

注册 `<Stack.Screen name="scheduleSwitch" options={{ title: '课表切换' }} />`

---

### 新页面：`app/scheduleSwitch.tsx`

```
├── React Navigation 内置 header（title: "课表切换"）
├── ScrollView
│   ├── 分区标题"我的课表"
│   └── 课表卡片列表
└── 固定底部"+ 新建课表"按钮
```

#### 课表卡片

每张卡片高度 70px，内容：
- 左侧 4px 彩色竖条（激活课表为 `#6454ab`，其余为 `#E0E0E0`）
- 课表名（15px bold）
- 副标题：`第X-Y周 · 开始于 YYYY/M/D · N节课`
- 徽标（仅有时显示）：「当前」紫色 / 「第二」粉色
- 右侧三点图标

#### 长按 / 三点菜单

弹出操作菜单（底部 ActionSheet 风格，或 absoluteFill 浮层），三个选项：
1. **重命名** → Alert.prompt 输入新名称 → `dispatch(RENAME_SCHEDULE)`
2. **设为第二课表** / **取消第二课表**（根据当前状态切换文案）→ `dispatch(SET_SECOND_SCHEDULE)`
3. **删除课表**（红色）→ Alert 二次确认 → `dispatch(DELETE_SCHEDULE)`；若只剩一个课表，禁用此项

#### 点击卡片体

`dispatch(SWITCH_ACTIVE_SCHEDULE, { id })` → 更新 `activeScheduleId` → 弹出 Toast "已切换到「课表名」"

#### 新建课表

点击底部按钮 → Alert.prompt 输入名称 → `dispatch(CREATE_SCHEDULE, { name })`；名称为空时使用"新课表"

---

### 快速切换：首页 `app/(tabs)/index.tsx` + 周课表 `app/(tabs)/weekschedule.tsx`

仅当 `state.secondScheduleId !== null` 时，在顶部导航栏右侧显示 chip 按钮。

#### Chip 按钮样式

- **默认态**：浅紫底 `#EDE9F7`，紫色文字 `#6454ab`，显示当前激活课表名（截断为 4 字）+ swap 图标
- **切换中**：深紫实心 `#6454ab`，白色文字，显示第二课表名

#### 交互实现（本地 state，不写入 GlobalState，不持久化）

```tsx
const [isViewingSecond, setIsViewingSecond] = useState(false);
const [peekSchedule, setPeekSchedule] = useState<Schedule | null>(null);

// 当前渲染用的课表数据（find 找不到时 fallback 到第一个，防止 id 失效崩溃）
const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId) ?? state.schedules[0];
const secondSchedule = state.schedules.find(s => s.id === state.secondScheduleId);
// secondSchedule 不存在时（如被删除）isViewingSecond 无效，fallback 到 activeSchedule
const displaySchedule = peekSchedule ?? (isViewingSecond && secondSchedule ? secondSchedule : activeSchedule);
```

`displaySchedule` 替代原本直接读 `state.*` 的所有引用。

#### 点按（onPress）

```tsx
setIsViewingSecond(prev => !prev);
```

#### 长按预览（onLongPress + onPressOut）

```tsx
onLongPress={() => { setPeekSchedule(secondSchedule); }}
onPressOut={() => { setPeekSchedule(null); }}
```

长按时页面顶部显示深色横幅：「正在预览「课表名」· 松手返回」（absoluteFill 定位，不影响布局）

#### 页面切换重置

因为 `isViewingSecond` 是本地 useState，Tab 切换或 app 重启时自动重置为 `false`。

---

## 各页面读取路径变更

所有现有页面从直接读 `state.xxx` 改为读 `activeSchedule.xxx`：

| 旧路径 | 新路径 |
|--------|--------|
| `state.schedulePeriod` | `activeSchedule.schedulePeriod` |
| `state.startDate` | `activeSchedule.startDate` |
| `state.timeLabelList` | `activeSchedule.timeLabelList` |
| `state.myClassList` | `activeSchedule.myClassList` |

首页/周课表额外使用 `displaySchedule` 替代 `activeSchedule`（支持预览态）。

---

## 数据流

```
scheduleSwitch 页
  ├─ 点击卡片        → dispatch SWITCH_ACTIVE_SCHEDULE → 更新 activeScheduleId → 持久化
  ├─ 设为第二课表    → dispatch SET_SECOND_SCHEDULE   → 更新 secondScheduleId → 持久化
  ├─ 新建课表        → dispatch CREATE_SCHEDULE       → push to schedules     → 持久化
  ├─ 重命名          → dispatch RENAME_SCHEDULE       → 更新 schedule.name    → 持久化
  └─ 删除            → dispatch DELETE_SCHEDULE       → 移除 + 保护逻辑       → 持久化

首页/周课表 chip
  ├─ 点按            → setIsViewingSecond(toggle)    [本地 state，不持久化]
  └─ 长按/松手       → setPeekSchedule(second/null)  [本地 state，不持久化]
```

---

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `app/scheduleSwitch.tsx` |
| 修改 | `state/GlobalState.js` |
| 修改 | `app/_layout.tsx` |
| 修改 | `components/settingPage/scheduleSetting.tsx` |
| 修改 | `app/(tabs)/index.tsx` |
| 修改 | `app/(tabs)/weekschedule.tsx` |
| 修改 | `app/timeLabelSetting.tsx` |
| 修改 | `app/courseEdit.tsx` |
| 修改 | `app/jsonImport.tsx` |

---

## 颜色规范

复用 `constants/theme.ts` 现有常量。徽标颜色：
- 「当前」：`#6454ab` 文字 / `#EDE9F7` 背景
- 「第二」：`#D48D95` 文字 / `#FFF0F1` 背景
