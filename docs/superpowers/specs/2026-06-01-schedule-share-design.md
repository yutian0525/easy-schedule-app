# 课表分享与导入功能设计

## 概述

在课表切换页面（`app/scheduleSwitch.tsx`）新增课表分享和导入功能。用户可以将某张课表生成一个 8 位数字分享码（有效期 24 小时），其他用户输入分享码后自动新建并导入该课表。后端使用 Cloudflare Workers + KV 实现。

---

## 架构

```
App (scheduleSwitch.tsx)
    │
    ├── 分享课表 → POST /share  ──────┐
    │   返回 8位数字分享码             │
    │                                  ▼
    └── 输入分享码 → GET /import/:code  Cloudflare Workers
        返回课表 JSON                   │
                                       ├── KV: key=code, value=JSON, TTL=86400s
                                       └── 生成不重复8位随机码
```

### Workers API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/share` | POST | 接收课表 JSON，生成8位码，写入 KV（TTL 86400s），返回 `{ code }` |
| `/import/:code` | GET | 按8位码读取 KV，返回课表 JSON；不存在则返回 404 |

---

## App 界面改动（`scheduleSwitch.tsx`）

### 顶部导入区（新增）

页面顶部、"我的课表"标题之前，新增一个输入行：

```
┌───────────────────────────────────────┐
│  🔢 输入分享码（8位数字）        [导入] │
└───────────────────────────────────────┘
```

- `TextInput`：keyboardType="numeric"，maxLength=8，placeholder="输入8位分享码"
- "导入"按钮：输入满8位后高亮可点击，不足则置灰
- 点击后调用 `GET /import/:code`，成功则 dispatch `CREATE_SCHEDULE` + `SET_MY_CLASS_LIST` 等，命名为"来自分享"，失败则 Alert 提示"分享码无效或已过期"

### `···` 菜单（新增菜单项）

在现有菜单（重命名 / 设为第二课表 / 删除）中，**重命名下方**新增：

```
重命名
──────
分享课表       ← 新增
──────
设为第二课表
──────
删除课表（仅多课表时显示）
```

点击"分享课表"后：
1. 将目标课表的 `schedulePeriod`、`startDate`、`timeLabelList`、`myClassList` 组装为 JSON
2. 调用 `POST /share`
3. 成功后弹出Modal，展示分享码 + "复制分享码"按钮（使用 `Clipboard.setStringAsync`）
4. Modal 提示"分享码 24 小时内有效"

---

## 数据结构

### POST /share 请求体

```json
{
  "name": "大三下学期",
  "schedulePeriod": [1, 20],
  "startDate": [2025, 8, 17],
  "timeLabelList": [...],
  "myClassList": [...]
}
```

### GET /import/:code 响应体

与请求体相同结构，直接透传存储内容。

---

## Cloudflare Workers 代码（`worker.js`）

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (method === 'POST' && url.pathname === '/share') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: '无效的 JSON' }, 400, corsHeaders);
      }

      let code;
      for (let i = 0; i < 10; i++) {
        const candidate = String(Math.floor(Math.random() * 90000000) + 10000000);
        const existing = await env.SCHEDULE_KV.get(candidate);
        if (!existing) { code = candidate; break; }
      }
      if (!code) {
        return json({ error: '生成分享码失败，请重试' }, 500, corsHeaders);
      }

      await env.SCHEDULE_KV.put(code, JSON.stringify(body), { expirationTtl: 86400 });
      return json({ code }, 200, corsHeaders);
    }

    const importMatch = url.pathname.match(/^\/import\/(\d{8})$/);
    if (method === 'GET' && importMatch) {
      const code = importMatch[1];
      const data = await env.SCHEDULE_KV.get(code);
      if (!data) {
        return json({ error: '分享码无效或已过期' }, 404, corsHeaders);
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return json({ error: 'Not Found' }, 404, corsHeaders);
  },
};

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
```

## wrangler.toml

```toml
name = "schedule-share"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SCHEDULE_KV"
id = "你的KV命名空间ID"
preview_id = "你的预览KV命名空间ID"
```

## 部署步骤

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 KV 命名空间，把输出的 id 填入 wrangler.toml
wrangler kv:namespace create SCHEDULE_KV

# 4. 部署，输出 Workers URL
wrangler deploy
```

部署完成后，将 Workers URL 作为 `SHARE_API_BASE` 常量写入 App。

---

## App 侧新增文件/改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `app/scheduleSwitch.tsx` | 修改 | 顶部加导入输入区；`···`菜单加"分享课表"；新增分享码展示 Modal |
| `state/GlobalState.js` | 修改 | 新增 `IMPORT_SCHEDULE` action，支持一次性创建完整课表 |
| `constants/api.ts` | 新增 | 存放 `SHARE_API_BASE` 常量（Workers 部署后的 URL） |
| `constants/theme.ts` | 无需改动 | 颜色已覆盖 |

### IMPORT_SCHEDULE action 说明

现有 `CREATE_SCHEDULE` 只接受 `name`，其余字段使用默认值，无法满足导入需求。需在 `GlobalState.js` 新增：

```javascript
case 'IMPORT_SCHEDULE': {
  const s = {
    id: Date.now().toString(),
    name: action.payload.name || '来自分享',
    schedulePeriod: action.payload.schedulePeriod ?? [1, 20],
    startDate: action.payload.startDate ?? [2025, 8, 17],
    timeLabelList: action.payload.timeLabelList ?? timeList,
    myClassList: action.payload.myClassList ?? [],
  };
  return { ...state, schedules: [...state.schedules, s] };
}
```

App 导入时调用：
```javascript
dispatch({ type: 'IMPORT_SCHEDULE', payload: importedData });
```

### expo-clipboard 依赖

复制分享码使用 `expo-clipboard`，如尚未安装需执行：

```bash
npx expo install expo-clipboard
```

使用方式：
```javascript
import * as Clipboard from 'expo-clipboard';
await Clipboard.setStringAsync(code);
```

### constants/api.ts

```typescript
export const SHARE_API_BASE = 'https://schedule-share.你的用户名.workers.dev';
```

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络请求失败 | Alert "网络错误，请检查连接" |
| 分享码不存在/已过期 | Alert "分享码无效或已过期" |
| 分享码不足8位时点导入 | 按钮置灰，不发请求 |
| Workers 生成码失败（极低概率） | Alert "生成失败，请重试" |
