# Bottom Picker 组件设计规范

**日期：** 2026-05-27  
**作者：** 倪镭  
**状态：** 已批准，待实现

---

## 背景

当前应用的三处选择器（课程时间、总周数、开始日期）使用 `@ant-design/react-native` 的 `Picker` / `DatePicker`，样式为 ant-design 默认风格，与应用紫色主题体系（`#6454ab`）不一致。本次替换目标：**视觉一致性**。

### 受影响的场景

| 场景 | 文件 | 当前组件 | 替换后 |
|------|------|----------|--------|
| 本学期总周数 | `components/settingPage/scheduleSetting.tsx` | `<Picker>` (1列) | `<WeekPicker>` |
| 开始上课时间 | `components/settingPage/scheduleSetting.tsx` | `<DatePicker>` (年/月/日) | `<DatePickerSheet>` |
| 节次时间 HH:MM | `app/timeLabelSetting.tsx` | `<Picker>` (2列) | `<TimePicker>` |

---

## 架构

### 组件层级

```
components/
└── BottomPicker/
    ├── BottomPickerBase.tsx     # 底层通用容器（遮罩 + 底部卡片 + Header）
    ├── PickerColumn.tsx         # 单列滚轮（ScrollView + 高亮背景条）
    ├── WeekPicker.tsx           # 周数选择（1-40，单列）
    ├── TimePicker.tsx           # 时间选择（HH:MM，双列）
    └── DatePickerSheet.tsx      # 日期选择（年/月/日，三列）
```

### 数据流

```
调用方（scheduleSetting / timeLabelSetting）
  ↓ visible / value / onConfirm / onCancel
BottomPickerBase
  ↓ columns / labels / value[] / onChange
PickerColumn × N
  ↓ selectedIndex / onIndexChange
ScrollView（snapping）
```

---

## BottomPickerBase

**职责：** 渲染底部卡片、遮罩、Header（取消 / 标题 / 确认）、动画。

**Props：**

```typescript
interface BottomPickerBaseProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;         // 列内容由具体 Picker 传入
  hint?: string;                     // 底部提示文字（可选）
}
```

**样式规范：**

| 元素 | 规格 |
|------|------|
| 遮罩 | `rgba(0,0,0,0.45)`，全屏绝对定位，`statusBarTranslucent` |
| 卡片背景 | `#FFFFFF`，`borderTopLeftRadius: 20`，`borderTopRightRadius: 20` |
| 拖拽把手 | `36×4`，`cornerRadius: 2`，颜色 `#E0E0E0`，顶部外边距 `12` |
| Header 高度 | `52px` |
| 取消文字 | `#A5A5A5`，size 15，normal |
| 标题文字 | `#1A1A2E`，size 16，bold |
| 确认文字 | `#6454ab`，size 15，semibold |
| Header 分割线 | `1px #F0F0F0`，底部 |
| 底部安全留白 | `paddingBottom: 20` |

**动画：** 使用 `Animated.timing` 做 translateY 从 `+300` → `0`，时长 `280ms`，easing `Easing.out(Easing.cubic)`。点击遮罩或取消时反向退出。

---

## PickerColumn

**职责：** 单列无限滚动选项，`ScrollView + snapToInterval`，自动居中选中项。

**Props：**

```typescript
interface PickerColumnProps {
  items: string[];                   // 显示文字列表
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  itemHeight?: number;               // 默认 44
  visibleCount?: number;             // 默认 5（上下各 2 项 + 选中 1 项）
}
```

**实现要点：**

- `ScrollView` 设 `showsVerticalScrollIndicator={false}`，`snapToInterval={itemHeight}`，`decelerationRate="fast"`
- 上下各加 `(visibleCount - 1) / 2 * itemHeight` 的透明 padding，使首尾项也能居中
- `onMomentumScrollEnd` 计算 `Math.round(offsetY / itemHeight)` 得到 index
- 初始化时用 `scrollTo({ y: selectedIndex * itemHeight, animated: false })`
- 选中项：`fill: #1A1A2E`，`fontSize: 17`，`fontWeight: 700`
- 非选中项：`fill: #A5A5A5`，`fontSize: 15`，`fontWeight: normal`

**高亮背景条（绝对定位）：**

```
position: absolute
top: (visibleCount - 1) / 2 * itemHeight    // 默认 88
height: itemHeight                            // 默认 44
left: 8, right: 8
backgroundColor: #EDE9F7
borderRadius: 8
```

---

## WeekPicker

**封装：** `BottomPickerBase` + 单个 `PickerColumn`

```typescript
interface WeekPickerProps {
  visible: boolean;
  value: number;                     // 当前周数（1-40）
  onConfirm: (week: number) => void;
  onCancel: () => void;
}
```

- `items`: `["1周", "2周", ..., "40周"]`
- `hint`: `"滚动选择周数（1-40）"`
- 确认时从 items 中解析出数字

---

## TimePicker

**封装：** `BottomPickerBase` + 两个 `PickerColumn` + 冒号分隔符

```typescript
interface TimePickerProps {
  visible: boolean;
  value: string;                     // "HH:MM" 格式
  onConfirm: (time: string) => void;
  onCancel: () => void;
}
```

- 左列 `items`: `["00", "01", ..., "23"]`（小时）
- 右列 `items`: `["00", "01", ..., "59"]`（分钟）
- 中间固定渲染 `":"` 文字（`#1A1A2E`，size 20，bold）
- 列标签行：`时` / `分`（`#A5A5A5`，size 11）

---

## DatePickerSheet

**封装：** `BottomPickerBase` + 三个 `PickerColumn`

```typescript
interface DatePickerSheetProps {
  visible: boolean;
  value: Date;
  minDate?: Date;
  maxDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}
```

- 左列（年）：`minDate.year` ~ `maxDate.year`，显示 `"YYYY"`
- 中列（月）：`"1月"` ~ `"12月"`，随年份动态联动
- 右列（日）：`"1日"` ~ `"N日"`，根据年月自动计算天数
- 列标签行：`年` / `月` / `日`
- 月份联动：左列 `onIndexChange` 后重新计算右列 items，若当前日超范围则 clamp

---

## 调用方改动

### scheduleSetting.tsx

移除 `@ant-design/react-native` 的 `Picker` / `DatePicker` import，替换为：

```tsx
import WeekPicker from '@/components/BottomPicker/WeekPicker';
import DatePickerSheet from '@/components/BottomPicker/DatePickerSheet';

<WeekPicker
  visible={circleVisible}
  value={activeSchedule.schedulePeriod[1]}
  onConfirm={(week) => {
    dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: [0, week] });
    setCircleVisible(false);
  }}
  onCancel={() => setCircleVisible(false)}
/>

<DatePickerSheet
  visible={timeSelectVisible}
  value={new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2])}
  minDate={new Date(new Date().getFullYear() - 1, 0, 1)}
  maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
  onConfirm={(date) => {
    dispatch({ type: 'SET_START_DATE', payload: [date.getFullYear(), date.getMonth(), date.getDate()] });
    setTimeSelectVisible(false);
  }}
  onCancel={() => setTimeSelectVisible(false)}
/>
```

### timeLabelSetting.tsx

替换 `<Picker>` 为：

```tsx
import TimePicker from '@/components/BottomPicker/TimePicker';

<TimePicker
  visible={pickerVisible}
  value={editTarget ? sections[editTarget.section][editTarget.index][editTarget.field] : "08:00"}
  onConfirm={(time) => onPickerOk(time)}
  onCancel={() => setPickerVisible(false)}
/>
```

`onPickerOk` 签名改为接收 `string` 而非 `PickerValue[]`。

---

## 不在本次范围内

- 深色模式适配
- 无障碍（accessibility）标签
- 键盘感知（Picker 不涉及键盘输入）
