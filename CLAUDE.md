# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**SHOU轻选课 scheduleAPP** — 一个面向学生的移动端课程表应用，基于 React Native + Expo 构建。

**核心功能：**
- 今日课程（首页）：按上午/下午/晚上分组展示当天课程，实时计算课程状态
- 周课表视图：5列×12行网格，绝对定位渲染课程卡片，支持上下周切换
- 课表设置：学期周数、开始日期配置，JSON 数据导入
- 数据持久化：全部数据通过 AsyncStorage 自动保存

## Development Commands

```bash
npm run start     # 启动 Expo 开发服务器
npm run android   # 启动 Android
npm run ios       # 启动 iOS
npm run web       # 启动 Web
npm run lint      # ESLint 检查
```

## Tech Stack

- **React Native 0.83** + **Expo SDK 55**
- **Expo Router 55** — 文件系统路由
- **React Context + useReducer** — 全局状态管理（无 Redux）
- **AsyncStorage** — 本地持久化，key: `'appState'`
- **@ant-design/react-native** — UI 组件库（Picker、DatePicker 等）
- **TypeScript**（部分文件）

### @ant-design/react-native Picker 使用规范

`<Provider>` 已在根布局 `app/_layout.tsx` 注册，页面内**无需**再包裹 Provider。

**通用 Picker（列表选择）**：

```tsx
import { Picker, PickerValue, PickerValueExtend } from '@ant-design/react-native';

const [visible, setVisible] = useState(false);
const [value, setValue] = useState<PickerValue[]>([]);

<Picker
  data={dataSource}       // PickerColumnItem[] 或多列 PickerColumnItem[][]
  cols={1}                // 列数
  visible={visible}
  value={value}
  onVisibleChange={(v) => setVisible(v)}
  onOk={(v: PickerValue[], ext: PickerValueExtend) => {
    setValue(v);
    setVisible(false);
  }}
/>
```

**DatePicker（时间/日期选择）**：

```tsx
import { DatePicker } from '@ant-design/react-native';

const [visible, setVisible] = useState(false);
const [date, setDate] = useState(new Date());

<DatePicker
  visible={visible}
  value={date}
  precision="minute"      // "year" | "month" | "day" | "hour" | "minute"
  onOk={(d) => {
    setDate(d);
    setVisible(false);
  }}
  onVisibleChange={(v) => setVisible(v)}
/>
```

- 时间字符串 `"HH:MM"` → `Date`：`const d = new Date(); d.setHours(h, m, 0, 0);`
- `Date` → `"HH:MM"`：`` `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` ``
- 在原生 Modal 内使用 Picker 时需加 `modalType="modal"` 防止被遮挡

## Color Palette

主色使用紫色系，基准色为 `#6454ab`。

```
主色        #6454ab   —— 按钮、选中态、强调元素、tabBar 激活色
主色浅      #8B7DC4   —— hover 态、次级强调
主色极浅    #EDE9F7   —— 卡片背景、浅色填充
文字主色    #1A1A2E   —— 标题、主要文字
文字次色    #575757   —— 副标题、周次日期
文字弱色    #A5A5A5   —— 占位符、非激活图标、分区标签
分割线      #F7F7F7   —— 网格线、区块分隔
午/晚休区   #F7F7F7   —— 课表中间间隔条背景
背景        #FFFFFF   —— 页面底色
```

> 在 `constants/theme.ts` 中维护颜色常量，新增颜色时必须写在这里，不要在组件内硬编码颜色值。

## Architecture

### 目录结构

```
scheduleAPP/
├── app/                          # Expo Router 页面
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 底部 TabBar，3 个 Tab
│   │   ├── index.tsx            # 今日课程（首页）
│   │   ├── weekschedule.tsx     # 周课表网格
│   │   └── settings.tsx         # 设置页
│   ├── _layout.tsx              # 根布局，包裹 GlobalStateProvider
│   └── jsonImport.tsx           # JSON 导入页
├── components/
│   ├── DailyClassCard.tsx       # 今日课程卡片
│   ├── ScheduleClassCard.tsx    # 周课表课程卡片
│   ├── settingCard.tsx          # 设置卡片容器
│   ├── settingBar.tsx           # 设置行项目
│   └── settingPage/
│       └── scheduleSetting.tsx  # 课表设置组件
├── state/
│   └── GlobalState.js           # 全局状态（Context + useReducer + AsyncStorage）
├── utils/
│   ├── classes.ts               # 课程初始数据（默认为空）
│   ├── timeLabel.ts             # 12 节课时间段配置
│   ├── getCurrentWeekInfo.js    # 计算当前周次/星期
│   ├── getClassSchedule.ts      # 获取今日课程并计算状态
│   ├── weekClassList.ts         # 获取指定周课程（按时段分组）
│   └── oneWeekList.ts           # 生成周日期列表
├── constants/
│   └── theme.ts                 # 颜色和字体常量（Colors、Fonts）
└── docs/
    └── data-structures.md       # 数据结构文档
```

### 全局状态

**文件**: `state/GlobalState.js`  
**访问**: `const { state, dispatch } = useGlobalState()`  
**持久化 Key**: `AsyncStorage 'appState'`

```javascript
state = {
  schedulePeriod: [1, 20],          // [起始周, 结束周]
  startDate: [2025, 8, 17],         // [年, 月, 日]（月份 0-based）
  timeLabelList: TimeLabelItem[],   // 12 节课时间配置
  myClassList: ClassItem[],         // 所有课程数据
  needUpdate: [],                   // 运行时刷新标志（不持久化）
}
```

### 核心数据结构

**ClassItem**（单条课程）:
```typescript
{
  uid: string;
  className: string;
  classId: string;
  teacher: string;
  week: number;           // 1=周一 … 7=周日
  mounth: number[];       // 上课周次列表（注：历史拼写错误，实为"月/周"）
  mounthLabel: string;    // 周次描述文字
  time: [number, number]; // [起始节次, 结束节次]，1-based
  classRoom: string;
  colorSheet: { highlight: string; background: string };
}
```

**TimeLabelItem**（节次时间）:
```typescript
{
  label: string;                           // "1" - "12"
  from: string;                            // "HH:MM"
  to: string;                              // "HH:MM"
  time: 'morning' | 'afternoon' | 'night';
}
```

详细字段说明见 `docs/data-structures.md`。

### 周课表网格布局

- `leftBarWidth = 32`：左侧节次栏宽度（px）
- `classGridHeight = 70`：单节课格子高度（px）
- 课程卡片使用 `position: absolute` 放置

```
卡片高度 = classGridHeight × (fromTo[1] - fromTo[0] + 1)

上午 top = classGridHeight × (fromTo[0] - 1)
下午 top = classGridHeight × (fromTo[0] - 5)
晚上 top = classGridHeight × (fromTo[0] - 9)

left = (containerWidth - leftBarWidth) / 5 × (week - 1) + leftBarWidth
```

## Important Rules

### 颜色使用
- 所有颜色必须引用 `constants/theme.ts` 中的常量，禁止在组件内硬编码颜色
- 主色 `#6454ab` 用于 tabBar 激活色、按钮、选中态
- 课程卡片颜色来自 `ClassItem.colorSheet`，由数据控制，不写死

### 数据流
- 单向数据流：只通过 `dispatch` 修改 state，不直接 mutate
- 子组件通过 `useGlobalState()` 读取数据，通过 props 传递展示所需字段
- `needUpdate` 数组用于跨 Tab 刷新通知，操作时注意 `includes` 去重避免无限循环

### 月份偏移
- `startDate` 中月份为 0-based（JavaScript `Date` 规范），如 8 月存储为 `8`（内部用 `date.getMonth()` 读取后需 +1 显示）
- 当前代码存在月份处理不一致的问题，修改日期相关逻辑时注意验证

### 拼写问题
- `ClassItem` 中 `mounth`/`mounthLabel` 为历史拼写错误（应为 `month`），已在整个代码库中使用，修改前必须全局替换，不能局部修改

### 路径别名
- 使用 `@/` 代替相对路径（如 `@/components/DailyClassCard`）
- `app/(tabs)/weekschedule.tsx` 中存在直接使用相对路径 `../../utils/` 的情况，新代码统一用 `@/`

## Common Patterns

**底部弹窗 Modal（标准模板）**:

所有 Modal 统一使用以下结构，解决 Android 状态栏漏出和键盘遮挡问题：

```tsx
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

<Modal
  visible={visible}
  transparent
  animationType="fade"
  statusBarTranslucent          // Android 必须，否则顶部漏出
  onRequestClose={onClose}
>
  {/* 背景遮罩：absoluteFill 固定全屏，不随键盘缩小 */}
  <View style={styles.modalBackdrop} />
  {/* 键盘感知层：只负责把卡片顶起来 */}
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
    style={styles.modalOverlay}
  >
    {/* 点击遮罩区域关闭 */}
    <Pressable style={{ flex: 1 }} onPress={onClose} />
    <View style={styles.modalCard}>
      {/* 卡片内容 */}
    </View>
  </KeyboardAvoidingView>
</Modal>
```

对应样式：

```tsx
modalBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.45)',
},
modalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
},
modalCard: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  gap: 14,
  paddingBottom: 32,   // 底部安全区留白
},
```

- **不要**把背景色放在 `KeyboardAvoidingView` 上，否则键盘弹起时底部漏出
- **不要**用 `behavior="height"`，会压缩容器高度导致遮罩缩短；统一用 `"padding"`
- `Pressable style={{ flex: 1 }}` 占满卡片上方空白区域，点击即关闭

**添加新设置项**:
1. `GlobalState.js` 的 `initialState` 添加字段
2. 添加对应 `SET_*` action 到 reducer
3. `components/settingPage/scheduleSetting.tsx` 添加 UI
4. 保存字段列表 `saveStateToStorage` 中加入新字段

**添加新页面**:
1. 在 `app/` 下创建文件，Expo Router 自动注册路由
2. Tab 页面放在 `app/(tabs)/`，普通页面放在 `app/` 根目录
3. **使用 React Navigation 内置 header**：在 `app/_layout.tsx` 的 Stack 中显式注册 `Stack.Screen`，通过 `options={{ title: '页面标题' }}` 配置标题，不要在页面内自己实现导航栏（自定义 View 模拟 header 会导致 safe area 和返回手势不一致）

**更新课程数据**:
- 仅通过 `dispatch({ type: 'SET_MY_CLASS_LIST', payload: [...] })` 更新
- 导入后会触发所有订阅了 `state.myClassList` 的 `useEffect` 自动刷新

## JSON Import Format

```json
{
  "AllWeek": [1, 20],
  "classList": [
    {
      "uid": "unique-id",
      "className": "高等数学",
      "classId": "MATH101",
      "teacher": "李老师",
      "week": 1,
      "mounth": [1, 2, 3, 4, 5],
      "mounthLabel": "第1-5周",
      "time": [1, 2],
      "classRoom": "A101",
      "colorSheet": { "highlight": "#6454ab", "background": "#EDE9F7" }
    }
  ]
}
```
