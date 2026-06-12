# 课程表数据结构文档

## 目录

- [全局状态 (AppState)](#全局状态-appstate)
- [课程数据 (ClassItem)](#课程数据-classitem)
- [时间段标签 (TimeLabelItem)](#时间段标签-timelabelitem)
- [当前周信息 (WeekInfo)](#当前周信息-weekinfo)
- [今日课程结果 (ResultClassItem)](#今日课程结果-resultclassitem)
- [周课程结果 (CourseResult)](#周课程结果-courseresult)
- [周日期列表 (WeekDate)](#周日期列表-weekdate)
- [JSON 导入格式](#json-导入格式)
- [AsyncStorage 持久化](#asyncstorage-持久化)

---

## 全局状态 (AppState)

**文件**: `state/GlobalState.js`

应用的中央数据存储，通过 React Context + useReducer 管理，用 `useGlobalState()` hook 在组件中访问。

```typescript
interface AppState {
  schedulePeriod: [number, number];   // 学期周数范围，如 [1, 20]
  startDate: [number, number, number]; // 学期开始日期 [年, 月, 日]，如 [2025, 8, 17]
  timeLabelList: TimeLabelItem[];      // 课程时间段配置（12 节）
  myClassList: ClassItem[];            // 全部课程数据
  needUpdate: string[];                // 运行时标志，标记需要刷新的组件（不持久化）
}
```

**默认值**:
```javascript
{
  schedulePeriod: [1, 20],
  startDate: [2025, 8, 17],
  needUpdate: [],
  timeLabelList: /* 见 utils/timeLabel.ts 默认值 */,
  myClassList: []
}
```

**可用 Actions**:

| Action | 参数 | 说明 |
|--------|------|------|
| `SET_SCHEDULE_PERIOD` | `[startWeek, endWeek]` | 更新学期周数范围 |
| `SET_START_DATE` | `[year, month, day]` | 更新学期开始日期 |
| `SET_MY_CLASS_LIST` | `ClassItem[]` | 更新全部课程 |
| `SET_TIME_LABEL_LIST` | `TimeLabelItem[]` | 更新时间段配置 |
| `SET_NEED_UPDATE` | `string[]` | 标记需要刷新的组件 |
| `LOAD_STATE_FROM_STORAGE` | `Partial<AppState>` | 从 AsyncStorage 恢复状态 |
| `RESET_ALL_DATA` | 无 | 重置为初始状态并清空存储 |

---

## 课程数据 (ClassItem)

**文件**: `utils/getClassSchedule.ts`、`utils/weekClassList.ts`

单条课程的完整信息，存储于 `AppState.myClassList`。

```typescript
interface ClassItem {
  uid: string;           // 课程唯一 ID
  className: string;     // 课程名称，如 "高等数学"
  classId: string;       // 课程编号，如 "MATH101"
  teacher: string;       // 授课教师，如 "李老师"
  week: number;          // 上课星期，1=周一 … 7=周日
  mounth: number[];      // 上课的周次列表，如 [1,2,3,4,5,6]（注：字段名拼写有误，实为"周"）
  mounthLabel: string;   // 周次描述文字，如 "第1-6周"
  time: [number, number]; // [起始节次, 结束节次]，1-based，如 [1,2] = 第1-2节
  classRoom: string;     // 教室/上课地点，如 "A101"
  colorSheet: {
    highlight: string;   // 文字强调色，如 "#FF5733"
    background: string;  // 卡片背景色，如 "#FFF5E6"
  };
}
```

> **注意**: `mounth` / `mounthLabel` 字段名为历史拼写错误（应为 `month`），已在代码中广泛使用，修改时需全局替换。

**节次说明**:
- `time[0]`: 起始节次（1-12）
- `time[1]`: 结束节次（1-12）
- 节次与实际时间的对应关系见 `timeLabelList`

---

## 时间段标签 (TimeLabelItem)

**文件**: `utils/timeLabel.ts`

定义每节课的时间范围，共 12 节，分上午/下午/晚上三段。

```typescript
interface TimeLabelItem {
  label: string;                          // 节次编号字符串，"1" - "12"
  from: string;                           // 开始时间，"HH:MM" 格式
  to: string;                             // 结束时间，"HH:MM" 格式
  time: 'morning' | 'afternoon' | 'night'; // 所属时段
}
```

**默认时间表**:

| 节次 | 开始 | 结束 | 时段 |
|------|------|------|------|
| 1 | 08:15 | 09:00 | morning |
| 2 | 09:05 | 09:50 | morning |
| 3 | 10:05 | 10:50 | morning |
| 4 | 10:55 | 11:40 | morning |
| 5 | 13:00 | 13:45 | afternoon |
| 6 | 13:50 | 14:35 | afternoon |
| 7 | 14:45 | 15:30 | afternoon |
| 8 | 15:35 | 16:20 | afternoon |
| 9 | 18:00 | 18:45 | night |
| 10 | 18:50 | 19:35 | night |
| 11 | 19:40 | 20:25 | night |
| 12 | 20:35 | 21:20 | night |

---

## 当前周信息 (WeekInfo)

**文件**: `utils/getCurrentWeekInfo.js`

基于 `AppState.startDate` 计算当前时间点相对于学期的位置。

```typescript
interface WeekInfo {
  week: number;   // 当前学期第几周（从 1 开始）
  day: number;    // 星期几（1=周一 … 7=周日）
  year: number;   // 当前年份
  month: number;  // 当前月份（1-12）
  date: number;   // 当前日（1-31）
}
```

**计算规则**:
- 以学期开始日期的所在周的周一为第 1 周起点
- 周数向上取整（不足一周也算一周）

---

## 今日课程结果 (ResultClassItem)

**文件**: `utils/getClassSchedule.ts`

`ClassItem` 经过过滤和转换后用于今日课程页（`app/(tabs)/index.tsx`）的展示结构。

```typescript
interface ResultClassItem {
  id: string;                             // "{weekNum}-{nodeFrom}-{nodeTo}-{uid}"
  startTime: string;                      // 课程开始时间，"HH:MM"
  endTime: string;                        // 课程结束时间，"HH:MM"
  className: string;                      // 课程名称
  fromTo: [number, number];               // [起始节次, 结束节次]
  week: number;                           // 星期几（1-7）
  month: string;                          // 周次描述，如 "第3周"
  location: string;                       // 教室地点
  teacher: string;                        // 教师名称
  status: 'prepare' | 'ongoing' | 'ended'; // 课程状态
  time: string;                           // 状态文字（见下表）
  colorSheet: {
    highlight: string;
    background: string;
  };
}
```

**课程状态与显示**:

| status | 含义 | time 示例 |
|--------|------|-----------|
| `prepare` | 未开始 | "2h 30m后" |
| `ongoing` | 进行中 | "剩 45分" |
| `ended` | 已结束 | "已结束" |

**过滤条件**: `item.week === weekDay && item.mounth.includes(weekNum)`

---

## 周课程结果 (CourseResult)

**文件**: `utils/weekClassList.ts`

用于周课表网格视图（`app/(tabs)/weekschedule.tsx`）的课程数据。

```typescript
interface CourseResult {
  id: string;             // "{weekNum}-{week}-{time[0]}-{time[1]}-{uid}"
  className: string;      // 课程名称
  fromTo: [number, number]; // [起始节次, 结束节次]
  week: number;           // 星期几（1-7）
  month: string;          // 周次描述
  location: string;       // 教室地点
  teacher: string;        // 教师名称
  colorSheet: {
    highlight: string;
    background: string;
  };
}

// 按时段分组后的周课程
interface WeeklySchedule {
  morning: CourseResult[];    // 上午（节次 1-4）
  afternoon: CourseResult[];  // 下午（节次 5-8）
  night: CourseResult[];      // 晚上（节次 9-12）
}
```

**网格定位计算**（`classGridHeight = 70`）:

| 时段 | 节次范围 | top 计算 |
|------|----------|----------|
| morning | 1-4 | `classGridHeight × (fromTo[0] - 1)` |
| afternoon | 5-8 | `classGridHeight × (fromTo[0] - 5)` |
| night | 9-12 | `classGridHeight × (fromTo[0] - 9)` |

卡片高度 = `classGridHeight × (fromTo[1] - fromTo[0] + 1)`

---

## 周日期列表 (WeekDate)

**文件**: `utils/oneWeekList.ts`

周课表顶部日期栏使用的数据结构。

```typescript
interface WeekDate {
  date: string;   // "MM-DD" 格式，如 "05-28"
  day: string;    // 中文星期，如 "周一"
}

type WeekDateList = WeekDate[]; // 一周 5 天（不含周末）
```

---

## JSON 导入格式

**文件**: `app/jsonImport.tsx`

通过"导入 JSON"功能写入数据时，JSON 需满足以下格式：

```json
{
  "AllWeek": [1, 20],
  "classList": [
    {
      "uid": "unique-id-1",
      "className": "高等数学",
      "classId": "MATH101",
      "teacher": "李老师",
      "week": 1,
      "mounth": [1, 2, 3, 4, 5],
      "mounthLabel": "第1-5周",
      "time": [1, 2],
      "classRoom": "A101",
      "colorSheet": {
        "highlight": "#FF5733",
        "background": "#FFF5E6"
      }
    }
  ]
}
```

导入后会触发：
1. `dispatch SET_SCHEDULE_PERIOD` ← `AllWeek`
2. `dispatch SET_MY_CLASS_LIST` ← `classList`

---

## AsyncStorage 持久化

**Key**: `'appState'`

**保存字段**（每次 state 变化自动保存）：

```typescript
{
  schedulePeriod: AppState['schedulePeriod'],
  startDate: AppState['startDate'],
  myClassList: AppState['myClassList'],
  timeLabelList: AppState['timeLabelList']
  // needUpdate 不保存
}
```

**生命周期**:

```
应用启动
  └─ loadStateFromStorage()
       └─ AsyncStorage.getItem('appState')
            └─ dispatch LOAD_STATE_FROM_STORAGE

state 变化
  └─ saveStateToStorage()
       └─ AsyncStorage.setItem('appState', JSON.stringify(saved))

重置数据
  └─ resetAllData()
       └─ AsyncStorage.removeItem('appState')
            └─ dispatch RESET_ALL_DATA
```
