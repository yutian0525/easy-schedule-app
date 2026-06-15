# 简白课表 · scheduleAPP

> 一款专为学生设计的轻量移动端课程表应用，基于 React Native + Expo 构建。

简白课表帮助你轻松管理课程安排：今日课程一览、周课表网格视图、多课表切换、课表分享与导入、上课提醒通知，全部数据本地存储，开箱即用。

---

## 功能特性

- **今日课程**（首页）：按上午 / 下午 / 晚上分组展示当天课程，实时计算每节课的「未开始 / 进行中 / 已结束」状态及剩余时间。
- **周课表视图**：5 列 × 12 行网格，课程卡片绝对定位渲染；支持左右滑动无限切换周次，自动高亮今日列，格子高度按最拥挤的课程动态计算。
- **多课表管理**：可创建、重命名、删除多个课表，一键切换激活课表；支持设置「第二课表」，在首页 / 周课表内快速对照或长按预览。
- **课表分享与导入**：通过 8 位分享码上传 / 拉取课表（基于 Cloudflare Workers + KV，分享码 24 小时有效）。
- **JSON / AI 导入**：在「课表编辑」中复制 AI 提示词，将课程截图发给 AI，把返回的 JSON 粘贴即可批量导入；导入时自动做时间冲突检测。
- **课程提醒通知**：
  - 上课通知 —— 每节课开始前 10 分钟本地推送。
  - 明日课程通知 —— 每晚 21:00 推送次日课程摘要。
  - 采用滚动 7 天窗口策略，App 启动或数据变更时自动重新调度。
- **个性化设置**：自定义每节课的上下课时间、学期总周数、开始上课日期、默认启动页。
- **本地持久化**：全部数据通过 AsyncStorage 自动保存，无需登录。

---

## 技术栈

| 分类     | 技术                                                         |
| -------- | ------------------------------------------------------------ |
| 框架     | React Native 0.81 + Expo SDK 54                              |
| 路由     | Expo Router 6（文件系统路由）                                |
| 状态管理 | React Context + useReducer（无 Redux）                       |
| 本地存储 | @react-native-async-storage/async-storage（key：`appState`） |
| UI 组件  | @ant-design/react-native、@expo/vector-icons                 |
| 通知     | expo-notifications（本地定时通知）                           |
| 云端分享 | Cloudflare Workers + KV                                      |
| 语言     | TypeScript（部分文件为 JS）                                  |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm
- 真机调试需安装 [Expo Go](https://expo.dev/go)，或使用 Android / iOS 模拟器

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start

# 或直接在指定平台运行
npm run android   # Android
npm run ios       # iOS
npm run web       # Web
```

启动后可在终端中选择以开发构建、模拟器或 Expo Go 方式打开应用。

### 代码检查

```bash
npm run lint
```

---

## 目录结构

```
scheduleAPP/
├── app/                          # Expo Router 页面
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 底部 TabBar（今日 / 周课表 / 设置）
│   │   ├── index.tsx            # 今日课程（首页）
│   │   ├── weekschedule.tsx     # 周课表网格
│   │   └── settings.tsx         # 设置页
│   ├── _layout.tsx              # 根布局：GlobalStateProvider + 通知初始化
│   ├── jsonImport.tsx           # JSON 导入页
│   ├── courseEdit.tsx           # 课表编辑（增删改 + AI 导入）
│   ├── scheduleSwitch.tsx       # 多课表切换 / 分享 / 导入
│   ├── timeLabelSetting.tsx     # 节次时间设置
│   └── about.tsx                # 关于页
├── components/
│   ├── DailyClassCard.tsx       # 今日课程卡片
│   ├── ScheduleClassCard.tsx    # 周课表课程卡片
│   ├── ClassDetailModal.tsx     # 课程详情弹窗
│   ├── settingCard.tsx          # 设置卡片容器
│   ├── settingBar.tsx           # 设置行项目
│   ├── BottomPicker/            # 底部选择器（周次 / 时间 / 日期）
│   └── settingPage/
│       └── scheduleSetting.tsx  # 课表与通知设置组件
├── state/
│   └── GlobalState.js           # 全局状态（Context + useReducer + AsyncStorage）
├── utils/
│   ├── classes.ts               # 课程初始数据（默认为空）
│   ├── timeLabel.ts             # 12 节课时间段配置
│   ├── getCurrentWeekInfo.js    # 计算当前周次 / 星期
│   ├── getClassSchedule.ts      # 获取今日课程并计算状态
│   ├── weekClassList.ts         # 获取指定周课程（按时段分组）
│   ├── oneWeekList.ts           # 生成周日期列表
│   └── notificationService.ts   # 本地通知调度
├── constants/
│   ├── theme.ts                 # 颜色与字体常量
│   └── api.ts                   # 分享服务 API 地址
├── cloudflare/
│   └── worker.js                # Cloudflare Workers 分享服务
└── docs/
    └── data-structures.md       # 数据结构文档
```

---

## 数据结构

全局状态结构（持久化于 AsyncStorage `appState`）：

```js
state = {
  schedules: [                      // 多课表数组
    {
      id: 'default',
      name: '我默认课程表',
      schedulePeriod: [1, 20],      // [起始周, 结束周]
      startDate: [2025, 8, 17],     // [年, 月(0-based), 日]
      timeLabelList: TimeLabelItem[],   // 12 节课时间配置
      myClassList: ClassItem[],         // 该课表的课程数据
    },
  ],
  activeScheduleId: 'default',      // 当前激活课表
  secondScheduleId: null,           // 第二课表（用于对照）
  defaultTab: 'index',              // 默认启动页
  notificationSettings: {           // 通知开关
    classReminder: false,           // 上课通知
    dailyDigest: false,             // 明日课程通知
  },
}
```

**ClassItem（单条课程）：**

```ts
{
  uid: string;
  className: string;
  classId: string;
  teacher: string;
  week: number;           // 1=周一 … 7=周日
  mounth: number[];       // 上课周次列表（历史拼写，实为"周"）
  mounthLabel: string;    // 周次描述文字，如"第1-8周"
  time: [number, number]; // [起始节次, 结束节次]，1-based
  classRoom: string;
  colorSheet: { highlight: string; background: string };
}
```

详细字段说明见 [docs/data-structures.md](docs/data-structures.md)。

---

## JSON 导入格式

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

---

## 主题色

主色采用紫色系，基准色为 `#6454ab`。所有颜色统一维护在 [constants/theme.ts](constants/theme.ts)，组件内禁止硬编码颜色。

| 用途                                | 色值      |
| ----------------------------------- | --------- |
| 主色（按钮、选中态、tabBar 激活色） | `#6454ab` |
| 主色浅（hover、次级强调）           | `#8B7DC4` |
| 主色极浅（卡片背景）                | `#EDE9F7` |
| 文字主色                            | `#1A1A2E` |
| 文字次色                            | `#575757` |
| 文字弱色                            | `#A5A5A5` |
| 分割线 / 午晚休区                   | `#F7F7F7` |
| 背景                                | `#FFFFFF` |

---

## 云端分享服务

课表分享功能依赖部署在 Cloudflare Workers 上的轻量服务（[cloudflare/worker.js](cloudflare/worker.js)）：

- `POST /share` —— 上传课表，返回 8 位分享码（KV 存储，24 小时过期）。
- `GET /import/:code` —— 用分享码拉取课表数据。

部署后将 [constants/api.ts](constants/api.ts) 中的 `SHARE_API_BASE` 替换为你的 Workers 地址即可。

---

## 通知说明

通知基于 `expo-notifications` 的本地定时通知，采用「滚动 7 天窗口」策略：每次 App 启动、回到前台或课表数据变更时，会取消旧通知并重新调度未来 7 天的提醒。

> ⚠️ 注意事项：
>
> - 通知靠打开 App 续期，连续 7 天以上不打开 App 后续通知不会自动续上。
> - 部分国产 Android ROM（MIUI / EMUI / ColorOS 等）的电池优化会冻结后台、拦截本地通知，需在系统设置中为本应用开启「自启动 / 后台运行」并关闭电池优化。

---

## 开发约定

- **单向数据流**：仅通过 `dispatch` 修改 state，不直接 mutate。
- **路径别名**：使用 `@/` 代替相对路径（如 `@/components/DailyClassCard`）。
- **颜色常量**：新增颜色必须写入 `constants/theme.ts`。
- **历史拼写**：`ClassItem` 中 `mounth` / `mounthLabel` 为历史拼写错误（应为 `month`），已全库使用，如需修改必须全局替换。

更多开发细节见 [CLAUDE.md](CLAUDE.md)。

---

© 2025 简白课表
