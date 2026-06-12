## Why

当前 scheduleAPP 中，无论是「今日课程」首页还是「周课表」网格页，课程卡片都只展示了课程名、教师、教室等少量字段，用户无法在应用内查看完整的课程信息（节次、具体时间段等）。点击卡片目前没有任何反馈，造成交互断点：用户想确认"这节课从几点上到几点"时，只能去对照独立的时间表配置页，体验割裂。

引入统一的课程详情底部弹窗，可以在不离开当前页面的情况下，快速查看所点击课程的完整信息，提升信息查询效率。

## What Changes

- 新增 `ClassDetailModal` 组件：底部弹出的只读详情面板，展示课程名、教师、教室、节次范围、具体时间段（起止时间）。
- `ScheduleClassCard`（周课表卡片）添加点击交互，触发详情弹窗。
- `DailyClassCard`（今日课程卡片）添加点击交互，复用同一个详情弹窗。
- `app/(tabs)/weekschedule.tsx` 与 `app/(tabs)/index.tsx` 中接入弹窗状态管理（visible + 当前选中的 ClassItem）。
- 弹窗 UI 遵循 CLAUDE.md 中定义的「底部弹窗 Modal 标准模板」（statusBarTranslucent + KeyboardAvoidingView + 遮罩 Pressable 关闭）。
- 颜色严格使用 `constants/theme.ts` 中的常量，不引入新硬编码颜色。

本期范围内**不**包含编辑、删除、新增课程的能力，仅做只读展示。

## Capabilities

### New Capabilities

- `class-detail-modal`: 提供课程详情的底部弹窗组件，以及在周课表与今日课程页面中通过点击课程卡片触发该弹窗的交互。

### Modified Capabilities

（无）

## Impact

- 新增组件：`components/ClassDetailModal.tsx`
- 修改组件：`components/ScheduleClassCard.tsx`、`components/DailyClassCard.tsx`（增加 onPress 回调）
- 修改页面：`app/(tabs)/weekschedule.tsx`、`app/(tabs)/index.tsx`（管理弹窗 state、传入选中的 ClassItem）
- 依赖：复用现有 `@/utils/timeLabel`、`@/constants/theme`、`ClassItem` 类型，无新增第三方依赖
- 数据流：仅本地 UI state，不写入 GlobalState、不持久化到 AsyncStorage
