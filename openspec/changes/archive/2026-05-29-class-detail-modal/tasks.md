## 1. 新增 ClassDetailModal 组件

- [x] 1.1 创建 `components/ClassDetailModal.tsx` 文件骨架，定义 Props 类型 `{ visible, classInfo, timeLabelList, onClose }`
- [x] 1.2 按 CLAUDE.md 「底部弹窗 Modal 标准模板」实现 Modal 容器（`statusBarTranslucent` + `absoluteFillObject` 遮罩 + `KeyboardAvoidingView` + 顶部 `Pressable` 关闭区）
- [x] 1.3 在 `Modal.onRequestClose` 中调用 `onClose`，覆盖 Android 物理返回键
- [x] 1.4 实现 `classInfo == null` 时的 early return，避免 undefined 字段访问报错
- [x] 1.5 实现节次范围派生：优先取 `classInfo.fromTo`，缺省时回退到 `classInfo.time`，渲染为「第 X-Y 节」（`X===Y` 时显示「第 X 节」）
- [x] 1.6 实现具体时间段派生：从 `timeLabelList` 中按 `label === String(fromTo[0])` 取 `from`、`label === String(fromTo[1])` 取 `to`，拼成 `${from} - ${to}`；查不到时不渲染该行
- [x] 1.7 渲染五个字段区块：课程名（标题）、教师、教室、节次范围、具体时间段；教师/教室缺省时使用 `'-'` 占位
- [x] 1.8 全部颜色引用 `BottomPickerColors`（遮罩、卡片、文字主/次、分割线），点缀色用 `classInfo.colorSheet.highlight`，禁止硬编码颜色
- [x] 1.9 默认导出组件，文件不写多行注释和无 WHY 的注释（遵循项目编码规范）

## 2. 改造 ScheduleClassCard

- [x] 2.1 给 `components/ScheduleClassCard.tsx` 增加可选 prop `onPress?: (classInfo) => void`
- [x] 2.2 当 `onPress` 存在时，将外层 `View` 改为 `Pressable`，按下时把 `classInfo` 传给 `onPress`
- [x] 2.3 利用 `Pressable` 的 `pressed` 状态把容器 `opacity` 降到 0.85，作为轻量按下反馈
- [x] 2.4 不传 `onPress` 时保持当前 `View` 渲染行为，确保向后兼容

## 3. 改造 DailyClassCard

- [x] 3.1 给 `components/DailyClassCard.tsx` 增加可选 prop `onPress?: (classInfo) => void`
- [x] 3.2 用 `Pressable` 包裹（或替换）最外层 `View`，按下时把 `classInfo` 传给 `onPress`
- [x] 3.3 同样实现 `pressed` 时 `opacity=0.85` 的反馈
- [x] 3.4 不传 `onPress` 时保持现有渲染与样式不变

## 4. 接入周课表页

- [x] 4.1 在 `app/(tabs)/weekschedule.tsx` 中引入 `ClassDetailModal`
- [x] 4.2 增加本地 state `const [selectedClass, setSelectedClass] = useState<any>(null)`
- [x] 4.3 在三处 `<ScheduleClassCard classInfo={classInfo} />`（morning / afternoon / night）上加 `onPress={setSelectedClass}`
- [x] 4.4 在页面根 `View` 末尾渲染 `<ClassDetailModal visible={!!selectedClass} classInfo={selectedClass} timeLabelList={displaySchedule.timeLabelList} onClose={() => setSelectedClass(null)} />`
- [ ] 4.5 实测：点击课程能弹出 Modal，左右滑动切周仍能正常触发，二者不冲突（待用户在模拟器/真机上验证）

## 5. 接入今日课程页

- [x] 5.1 在 `app/(tabs)/index.tsx` 中引入 `ClassDetailModal`
- [x] 5.2 增加本地 state `const [selectedClass, setSelectedClass] = useState<any>(null)`
- [x] 5.3 在三处 `<DailyClassCard classInfo={item} key={item.id} />`（morning / afternoon / night）上加 `onPress={setSelectedClass}`
- [x] 5.4 在页面根 `View` 末尾渲染 `<ClassDetailModal visible={!!selectedClass} classInfo={selectedClass} timeLabelList={displaySchedule.timeLabelList} onClose={() => setSelectedClass(null)} />`
- [ ] 5.5 实测：点击课程能弹出 Modal，状态文字（"X分"/"X后"/"已结束"）展示不受影响（待用户在模拟器/真机上验证）

## 6. 验证

- [x] 6.1 `npm run lint` 通过（如有现存告警，确保不引入新告警）— 已确认本次改动未引入新告警
- [ ] 6.2 在模拟器/真机上验证：周课表与今日课程两个页面的弹出、关闭、二次打开、Android 返回键关闭、字段展示正确（待用户验证）
- [ ] 6.3 验证空字段场景：构造一条 `teacher` 或 `classRoom` 为空字符串的课程，确认显示 `-` 而非空白行错位（待用户验证）
- [ ] 6.4 验证 `timeLabelList` 中不存在对应 `label` 时，时间段行被正确隐藏，不显示 `undefined - undefined`（待用户验证）
