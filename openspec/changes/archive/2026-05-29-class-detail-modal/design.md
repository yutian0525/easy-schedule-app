## Context

scheduleAPP 中两个核心展示页面（首页今日课程 `app/(tabs)/index.tsx`、周课表 `app/(tabs)/weekschedule.tsx`）目前只把课程数据渲染成卡片，卡片本身没有任何点击交互。两个页面分别使用 `DailyClassCard` 和 `ScheduleClassCard` 两个独立组件，它们都不是 `Pressable`，也都没有暴露事件。

数据层面，两个卡片接收的并非纯粹的 `ClassItem`，而是经过工具函数加工后的「展示对象」：

- `DailyClassCard` 的 `classInfo` 来自 `utils/getClassSchedule.ts`，包含 `className/teacher/location/startTime/endTime/colorSheet/status` 等字段。
- `ScheduleClassCard` 的 `classInfo` 来自 `utils/weekClassList.ts`，包含 `className/teacher/location/fromTo/colorSheet` 等字段。

两个加工后的对象都不包含 `classRoom`（统一改名成 `location`）、且不一定保留 `classId/uid`，但**都**包含展示详情面板所需的：课程名、教师、教室（即 `location`）、节次范围（`fromTo` 或可由 `time` 推导）。具体时间段 `from-to` 字符串可以直接从 `displaySchedule.timeLabelList` 中按 `fromTo[0]`/`fromTo[1]` 查找。

CLAUDE.md 中已经明确给出底部弹窗 Modal 的标准模板，本设计直接采用，不再发明新结构。

## Goals / Non-Goals

**Goals:**
- 抽出一个可复用的 `ClassDetailModal` 组件，在两个页面之间共享。
- 让 `ScheduleClassCard` 和 `DailyClassCard` 通过可选的 `onPress` 回调把当前展示的对象传给上层，由上层决定打开哪个 Modal。
- 弹窗信息字段：课程名、教师、教室、节次范围（如「第 1-2 节」）、具体时间段（如「08:00 - 09:40」）。
- 颜色全部走 `constants/theme.ts`（主要复用 `BottomPickerColors`）。

**Non-Goals:**
- 不在本期实现编辑/删除/新增课程能力。
- 不在本期渲染 `mounth/mounthLabel`、`classId`、`uid`、颜色块等附加字段（保留为后续扩展点）。
- 不做导航跳转（不新增 `app/` 下页面）。
- 不修改 `utils/weekClassList.ts` 与 `utils/getClassSchedule.ts` 的产出结构，避免影响现有渲染。

## Decisions

### Decision 1: 详情面板使用底部 Modal，不新增独立路由

复用 CLAUDE.md 中规定的底部弹窗模板（`statusBarTranslucent` + `absoluteFillObject` 遮罩 + `KeyboardAvoidingView` + 顶部 `Pressable` 关闭区域 + 卡片圆角 20）。

**Why:**
- 与设置页其他底部弹窗形态一致（如 `scheduleSetting`），用户体验一致。
- 信息量小（5 个字段），不需要整页空间。
- 不引入新路由和返回栈管理成本。

**Alternatives considered:**
- 独立路由页面 `/class-detail`：信息量过少，反而割裂；放弃。
- 中间居中 Modal：与现有 UI 风格不一致，CLAUDE.md 已经统一为底部弹窗模板，放弃。

### Decision 2: 父组件管理弹窗状态，子卡片仅向上传递点击事件

`ScheduleClassCard` / `DailyClassCard` 不持有弹窗 state，仅通过 `onPress?: (classInfo) => void` 把整个展示对象抛给页面组件。页面组件维护 `[selectedClass, setSelectedClass]` 与 `[detailVisible, setDetailVisible]`（也可以合并成一个 `selectedClass: object | null`，`null` 即关闭）。

**Why:**
- 两个页面的 displaySchedule 不同（today vs 周），父组件已经有 `displaySchedule.timeLabelList` 这一上下文，把 `timeLabelList` 与 `classInfo` 一并传给 Modal 更自然。
- 卡片组件保持纯展示职责，便于后续在其他场景复用（如长按菜单）。

**Alternatives considered:**
- 卡片内部管理弹窗：会让每张卡片都挂一个 Modal 实例，渲染成本与状态散乱。

### Decision 3: 详情数据通过完整对象 + `timeLabelList` 入参

`ClassDetailModal` 的 props：

```ts
type Props = {
  visible: boolean;
  classInfo: any | null;        // 直接接收 weekClassList / getClassSchedule 加工后的对象
  timeLabelList: TimeLabelItem[]; // 用于按 fromTo 索引出 from/to 时间字符串
  onClose: () => void;
};
```

节次范围的取值优先级：

1. 若对象上有 `fromTo: [number, number]`（来自 `weekClassList`），直接用。
2. 否则尝试从 `time: [number, number]`（原始 `ClassItem`，或 `getClassSchedule` 中的 `startTime/endTime` 反向）推导。

具体时间段：从 `timeLabelList` 中找到 `label === String(fromTo[0])` 的 `from` 与 `label === String(fromTo[1])` 的 `to`，拼成 `${from} - ${to}`。

**Why:**
- 两个加工对象的字段命名不完全一致（`fromTo` vs 没有），用一个降级查找路径覆盖两种调用点，比让两个 utils 改字段更安全。
- 让父组件传入 `timeLabelList`，避免 Modal 通过 `useGlobalState` 反向取上下文（保持组件纯净，便于测试）。

**Alternatives considered:**
- 传入原始 `ClassItem` 而非加工对象：需要回头修改两个工具函数或在父组件里查 uid 反向找原始数据，工作量更大、收益更小。

### Decision 4: 颜色复用 `BottomPickerColors`，不新增主题常量

- 遮罩：`BottomPickerColors.backdrop`
- 卡片背景：`BottomPickerColors.cardBg`
- 主标题（课程名）：`BottomPickerColors.textPrimary`
- 副字段（教师/教室/时间）：`BottomPickerColors.textSecondary`
- 分割线：`BottomPickerColors.headerDivider`

如果需要点缀色（如左侧色条），使用 `classInfo.colorSheet.highlight`，与卡片现有风格一致。

**Why:** 这一组常量已经面向「底部卡片」语义，无需另起一套。

### Decision 5: 关闭交互——遮罩点击 + Android 返回键

- 顶部 `Pressable` 占据 `KeyboardAvoidingView` 内卡片以上的全部空白，点击关闭。
- `Modal.onRequestClose` 处理 Android 物理返回键。
- 不提供「关闭」文字按钮（信息少，向下滑/点遮罩足够），简化 UI。

## Risks / Trade-offs

- **加工对象字段不一致** → Modal 内做字段降级（`fromTo ?? time`、`location ?? classRoom`），并对缺失字段使用空字符串 fallback，避免运行时 undefined 报错。
- **`onPress` 加在容器后改变手势行为** → `weekschedule.tsx` 中外层有 `PanResponder`（左右滑动切周）。`ScheduleClassCard` 的 `Pressable`/`TouchableOpacity` 会在 `PanResponder.onMoveShouldSetPanResponder` 满足后被父级抢占，但单纯点击（dx<8）不会触发抢占，因此点击与滑动可以共存。需在实现后实测以确认无冲突。
- **`DailyClassCard` 当前 `// @ts-ignore`** → 改造时只在调用层 `onPress` 加上类型，组件内仍可暂时保留 `// @ts-ignore` 风格，避免一次性引入大范围类型化。
- **多次打开同一弹窗的状态残留** → 父组件用 `selectedClass: object | null` 单一来源；关闭时置 `null` 即可。

## Migration Plan

无破坏性变更，纯增量：

1. 新增 `components/ClassDetailModal.tsx`。
2. `ScheduleClassCard` 增加可选 `onPress` 回调；`DailyClassCard` 同样增加可选 `onPress`。两者都向后兼容（不传 `onPress` 时表现与现有完全一致）。
3. `weekschedule.tsx` 与 `index.tsx` 接入弹窗 state，并把 `onPress={(c) => setSelectedClass(c)}` 传给卡片。

无需数据迁移、无需修改 GlobalState、无需改 AsyncStorage。

## Open Questions

- 节次时间字符串如果 `timeLabelList` 配置缺失（找不到对应 `label`）时，如何展示？建议：仅展示节次范围「第 X-Y 节」，时间段一行隐藏。实现时按此处理，无需追加配置。
- 是否需要在卡片点击时给予轻微视觉反馈（按下变暗）？建议：使用 `Pressable` 的 `pressed` 状态把 `opacity` 降到 0.85，作为轻量反馈，不另加动画。
