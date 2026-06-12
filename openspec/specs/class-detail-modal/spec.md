# class-detail-modal

## Purpose

提供课程详情的底部弹窗组件，以及在周课表与今日课程页面中通过点击课程卡片触发该弹窗的交互。

## Requirements

### Requirement: 课程详情底部弹窗组件

系统 SHALL 提供一个名为 `ClassDetailModal` 的可复用组件，以底部弹出的 Modal 形式展示一门课程的完整只读信息。

该组件 MUST 接收以下入参：

- `visible: boolean` — 是否显示弹窗
- `classItem: ClassItem | null` — 当前要展示的课程数据，为 `null` 时不渲染内容
- `onClose: () => void` — 关闭弹窗的回调

该组件 MUST 使用项目 CLAUDE.md 中规定的「底部弹窗 Modal 标准模板」结构（`statusBarTranslucent`、`absoluteFill` 遮罩、`KeyboardAvoidingView` + 顶部 `Pressable` 关闭区域、`borderTopLeftRadius/borderTopRightRadius=20` 的卡片）。

该组件 MUST 仅引用 `constants/theme.ts` 中定义的颜色常量，禁止硬编码颜色值。

#### Scenario: 弹窗显示完整课程信息

- **WHEN** `visible=true` 且传入有效 `classItem`
- **THEN** 弹窗从屏幕底部滑入并显示以下字段：课程名 `className`、教师 `teacher`、教室 `classRoom`、节次范围（基于 `time[0]`–`time[1]`，如「第 1-2 节」）、具体时间段（基于 `timeLabelList` 查出 `time[0]` 的 `from` 与 `time[1]` 的 `to`，格式 `HH:MM-HH:MM`）

#### Scenario: 点击遮罩关闭弹窗

- **WHEN** 用户点击卡片以外的半透明遮罩区域
- **THEN** 触发 `onClose` 回调，弹窗关闭

#### Scenario: 系统返回手势关闭弹窗

- **WHEN** Android 用户按下系统返回键，或 iOS 用户触发返回手势
- **THEN** 触发 `onRequestClose`，进而调用 `onClose` 回调，弹窗关闭

#### Scenario: classItem 为空时不渲染内容

- **WHEN** `visible=true` 但 `classItem` 为 `null`
- **THEN** 弹窗内部不渲染任何课程字段（避免 undefined 报错），可通过外层条件渲染或内部 early return 实现

### Requirement: 周课表点击课程卡片触发详情

系统 SHALL 在周课表页面（`app/(tabs)/weekschedule.tsx`）中支持点击 `ScheduleClassCard` 课程卡片打开详情弹窗。

`ScheduleClassCard` MUST 暴露 `onPress?: (item: ClassItem) => void` 回调；当回调存在时，整张卡片 MUST 可点击，并在点击时携带当前 `ClassItem` 调用回调。

#### Scenario: 点击周课表中的课程卡片

- **WHEN** 用户在周课表页面点击任意一张课程卡片
- **THEN** `ClassDetailModal` 以该课程的数据弹出，显示完整信息

#### Scenario: 关闭后再次点击同一课程

- **WHEN** 用户关闭弹窗后再次点击同一张卡片
- **THEN** 弹窗以该课程的数据重新弹出，无残留状态

### Requirement: 今日课程点击课程卡片触发详情

系统 SHALL 在今日课程页面（`app/(tabs)/index.tsx`）中支持点击 `DailyClassCard` 课程卡片打开同一个 `ClassDetailModal` 弹窗。

`DailyClassCard` MUST 暴露 `onPress?: (item: ClassItem) => void` 回调；当回调存在时，整张卡片 MUST 可点击，并在点击时携带当前 `ClassItem` 调用回调。

#### Scenario: 点击今日课程卡片

- **WHEN** 用户在首页点击任意一张当日课程卡片
- **THEN** `ClassDetailModal` 以该课程的数据弹出，显示与周课表相同的字段集合
