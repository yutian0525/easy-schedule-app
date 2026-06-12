# 课表编辑页 Design Spec

## 目标

新增「课表编辑」页面，支持对 `myClassList` 中的课程进行增删改，同时在页面顶部提供 AI 解析 JSON 导入入口，方便用户批量导入课程。现有的 `jsonImport` 页面保留不变。

## 架构

单页全量管理：一个主页面（`app/courseEdit.tsx`）展示所有课程列表，添加/编辑通过底部弹窗（bottom sheet modal）完成。AI 导入卡片复用 `timeLabelSetting.tsx` 的提示词复制 + JSON 粘贴流程。数据变更通过 `dispatch(SET_MY_CLASS_LIST)` 写入 GlobalState，自动持久化到 AsyncStorage。

## 入口

- `components/settingPage/scheduleSetting.tsx` 的「导入 JSON」`SettingBar` 下方新增一行「课表编辑」SettingBar，点击跳转 `courseEdit` 页面。
- `app/_layout.tsx` 注册 `Stack.Screen name="courseEdit"` 并配置内置 header `title="课表编辑"`。

---

## 页面结构

### 主页面 `app/courseEdit.tsx`

```
├── React Navigation 内置 header（title: "课表编辑"）
├── ScrollView
│   ├── AI 导入卡片
│   └── 课程列表（平铺，无分组）
└── 固定底部「+ 添加课程」按钮
```

#### AI 导入卡片

与 `timeLabelSetting.tsx` 保持一致的样式：
- 雷电图标 + "AI 导入" 标题
- 描述文字："复制提示词，连同课程截图或文字发给 AI，将返回的 JSON 粘贴导入"
- 三步引导：① 复制提示词 → ② 附截图发 AI → ③ 粘贴 JSON
- 两个按钮：「复制提示词」（边框）/ 「粘贴 JSON 导入」（填充紫色）
- 点击「粘贴 JSON 导入」打开 JSON 导入弹窗（与 timeLabelSetting 的底部弹窗同款）
- JSON 导入弹窗解析格式：`{ AllWeek: [1,20], classList: ClassItem[] }`，成功后 dispatch `SET_MY_CLASS_LIST` 和 `SET_SCHEDULE_PERIOD`

AI 提示词内容（复制到剪贴板）：
```
我会提供我学校的课程安排（截图或文字），请根据以下要求生成课程 JSON 数组。

格式要求：
- JSON 对象，包含 AllWeek（学期周数范围数组，如 [1,20]）和 classList（课程数组）
- 每条课程包含：uid（随机字符串）、className、classId、teacher、week（1=周一...7=周日）、mounth（上课周次数组，如 [1,2,3,4,5]）、mounthLabel（如 "第1-5周"）、time（[起始节次, 结束节次]，1-based）、classRoom、colorSheet（{ highlight, background }，从以下10组中选一组）
- colorSheet 可选值：{"highlight":"#A3C0A1","background":"#ebf4eb"} | {"highlight":"#bfb3a4","background":"#f3eeec"} | {"highlight":"#A7BEE0","background":"#ececf3"} | {"highlight":"#D48D95","background":"#f1e5e6"} | {"highlight":"#A09BC3","background":"#ede7f1"} | {"highlight":"#9DBEC3","background":"#e7f2f3"} | {"highlight":"#DFB197","background":"#f8f3ed"} | {"highlight":"#EBC175","background":"#fff2e0"} | {"highlight":"#968073","background":"#f4e5dd"} | {"highlight":"#817d7d","background":"#e3e3e3"}

直接输出 JSON，不要包含说明文字。
```

#### 课程列表

- 平铺展示所有课程，无分组
- 每行高度 64px：左侧 4px 宽彩色竖条（`colorSheet.highlight`）+ 课程名（fontSize 15, bold）+ 副文字（节次/星期摘要，如"周一 · 第1-2节"）+ 右侧删除图标（trash icon，红色 #FF3B30）
- 空状态：居中显示「暂无课程，点击下方按钮添加」
- 点击课程行 → 打开编辑弹窗，预填该课程数据
- 点击删除图标 → Alert 二次确认后删除

#### 固定底部按钮

- 高度 80px，白色背景，顶部 1px 分割线
- 「+ 添加课程」紫色按钮（`#6454ab`），圆角 12，高度 48px，全宽

---

### 编辑弹窗（底部 bottom sheet modal）

复用 CLAUDE.md 的标准底部弹窗模板（`statusBarTranslucent` + `absoluteFillObject` 遮罩 + `KeyboardAvoidingView`）。

弹窗内部使用 `ScrollView` 包裹表单（周次选择会很高），底部「取消/保存」按钮固定不滚动。

#### 表单字段（从上到下）

| 字段 | 类型 | 说明 |
|------|------|------|
| 课程名称 | TextInput | 必填，placeholder "如：高等数学" |
| 教师 | TextInput | 可选，placeholder "如：张老师" |
| 教室 | TextInput | 可选，placeholder "如：A101" |
| 课程编号 | TextInput | 可选，placeholder "如：MATH101" |
| 星期 | 7 个 toggle 按钮 | 周一～周日，单选，选中紫色填充 |
| 节次 | 两个 Picker | 起始节次（1-12）和结束节次（1-12），用「至」连接；结束节次不得小于起始节次 |
| 颜色 | 10 个色点 | 来自 `docs/appColorList.js`，圆形，直径 28px，选中态外圈描边 |
| 上课周次 | toggle 网格 + 快捷行 | 详见下方 |

#### 上课周次字段

快捷操作行（4 个按钮）：
- **全部**：选中 1-20 全部周
- **单周**：选中奇数周 1,3,5,...,19
- **双周**：选中偶数周 2,4,6,...,20
- **清空**：取消所有选中

周次 toggle 网格：
- 共 20 个按钮，4行×5列
- 每个按钮显示周次数字
- 选中：紫色背景 `#6454ab`，白色文字；未选中：灰色背景 `#F4F4F8`，灰色文字

`mounthLabel` 由选中的 `mounth` 数组自动生成：对已排序的周次数组，将连续区间合并为「X-Y」，单独周次保持数字，最终格式为 `"第X-Y,Z周"`。例如 `[1,2,3,5,7,8]` → `"第1-3,5,7-8周"`；`[1,2,3,4,5]` → `"第1-5周"`。

#### 保存逻辑

- 新增：生成 `uid = Date.now().toString()`，push 到 `myClassList`
- 编辑：按 `uid` 找到原条目，替换更新
- 校验：`className` 不能为空；`time[0] <= time[1]`；`mounth.length > 0`
- 校验失败：`Alert.alert` 提示具体错误
- 成功：`dispatch(SET_MY_CLASS_LIST, [...])` 并关闭弹窗

---

## 数据流

```
用户操作
  ├─ 编辑/添加保存 → dispatch SET_MY_CLASS_LIST → AsyncStorage 自动持久化
  └─ AI JSON 导入  → dispatch SET_MY_CLASS_LIST + SET_SCHEDULE_PERIOD
```

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `app/courseEdit.tsx` |
| 修改 | `app/_layout.tsx`（注册路由） |
| 修改 | `components/settingPage/scheduleSetting.tsx`（添加入口） |

## 颜色规范

复用 `constants/theme.ts` 中现有颜色常量，课程卡片颜色来自 `docs/appColorList.js` 的 10 组 colorSheet，不在组件内硬编码。
