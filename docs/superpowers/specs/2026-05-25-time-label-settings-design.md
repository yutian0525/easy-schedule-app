# 课程时间设置功能设计文档

**日期**: 2026-05-25  
**状态**: 已确认

---

## 需求概述

在设置页新增「课程时间设置」入口，进入后可对课程表的 12 节课时间标签进行管理：按上午 / 下午 / 晚上分区，每个区可独立添加、删除节次，每节课的起止时间通过时间选择器修改。

---

## 涉及文件

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `components/settingPage/scheduleSetting.tsx` | 修改 | 新增「课程时间设置」设置行 |
| `app/timeLabelSetting.tsx` | 新建 | 课程时间设置页面 |
| `state/GlobalState.js` | 修改 | 确认 `SET_TIME_LABEL_LIST` action 存在（已有，无需改动） |

---

## 页面设计

### Screen 1 — 设置页入口

`components/settingPage/scheduleSetting.tsx` 在现有 `SettingCard` 末尾追加一行：

```
标题：课程时间设置
副文字：设置每节课的上下课时间
右侧：chevron_right 图标
点击：navigate('timeLabelSetting')
```

行样式与其他 `SettingBar` 行保持一致，无需高亮。

---

### Screen 2 — 课程时间设置页（`app/timeLabelSetting.tsx`）

**整体布局**

```
[状态栏 62px]
[导航栏 56px]  ← chevron_left + "设置" / 标题"课程时间设置"
[ScrollView，背景 #F4F4F8，padding 16px，卡片间距 16px]
  ├── 上午 卡片
  ├── 下午 卡片
  └── 晚上 卡片
```

**Section 卡片（上午 / 下午 / 晚上）**

每个卡片结构相同，白色背景，圆角 12px，轻阴影：

```
[卡片头部 50px]
  左：彩色小圆点 + 节区名称（粗体）+ 节数统计（灰色）
  右：「＋ 添加」紫色 pill 按钮（fill #EDE9F7，文字 #6454ab）
[分割线 #F0F0F0]
[节次行 × N 条]（条间分割线 #F7F7F7）
```

节区颜色点：
- 上午：`#FF9800`（橙）
- 下午：`#6454ab`（主色紫）
- 晚上：`#5856D6`（靛蓝）

**节次行（每条 54px）**

```
[ 节次标签 pill ]   [ 起始时间 chip ]  —  [ 结束时间 chip ]   [ 🗑 ]
```

| 元素 | 样式 |
|---|---|
| 节次标签 pill | 背景 `#F4F4F8`，圆角 6px，字号 12，颜色 `#575757` |
| 时间 chip | 背景 `#c9ebca`，无边框，圆角 8px，字号 14 粗体，颜色 `#2d6a4f` |
| 分隔符 `—` | 字号 13，颜色 `#CCCCCC` |
| 删除图标 | `delete`（Material Symbols Rounded），尺寸 20，颜色 `#FF3B30` |

---

## 交互逻辑

### 点击时间 chip

点击起始或结束时间 chip，弹出 `DatePicker`（`@ant-design/react-native`），精度 `"minute"`，只展示时:分选择。

弹出时需将 `"HH:MM"` 字符串解析为 `Date` 对象（年月日取今日，只关心时分）。确认回调中用 `date.getHours()` / `date.getMinutes()` 重新格式化为 `"HH:MM"` 字符串写回 state。

- 弹出时 value 为当前该 chip 的时间值
- 确认后更新本地 state 中对应节次的 `from` 或 `to` 字段
- 取消/关闭不做任何修改

### 点击删除图标

直接从对应节区列表中移除该节次行（无需二次确认弹窗）。

### 点击「＋ 添加」

在对应节区末尾追加一条新节次行：
- `from`：该节区最后一条的 `to` 时间 + 5 分钟（若节区为空则取默认值：上午 `08:00`，下午 `13:00`，晚上 `18:00`）
- `to`：`from` + 45 分钟
- 追加后自动滚动到新行

### 离开页面保存

用户按返回键（或导航回退）时，将当前编辑后的 `timeLabelList` 通过 `dispatch({ type: 'SET_TIME_LABEL_LIST', payload: [...] })` 写入全局状态（自动持久化到 AsyncStorage）。

---

## 数据结构

使用已有的 `TimeLabelItem`，无需新增字段：

```typescript
interface TimeLabelItem {
  label: string;                           // "1" - "12"
  from: string;                            // "HH:MM"
  to: string;                             // "HH:MM"
  time: 'morning' | 'afternoon' | 'night';
}
```

页面内部用本地 state 存放编辑中的三个分组数组，离开时统一合并排序后写入全局。

---

## 颜色规范

所有颜色引用 `constants/theme.ts`，本功能新增以下 token（如尚未定义需补充）：

```typescript
timeLabelChipBg:     '#c9ebca'
timeLabelChipText:   '#2d6a4f'
sectionDotMorning:   '#FF9800'
sectionDotAfternoon: '#6454ab'   // 复用主色
sectionDotNight:     '#5856D6'
```

---

## 不在范围内

- 节次的 `label` 字段（"1"~"12"）不可编辑，由系统自动按顺序赋值
- 不支持跨节区拖拽排序
- 不对时间合法性做强验证（如 from > to），由用户自行保证
