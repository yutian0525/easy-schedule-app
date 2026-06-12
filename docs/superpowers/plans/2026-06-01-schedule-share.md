# 课表分享与导入功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在课表切换页面新增课表分享（生成8位分享码）和导入（输入分享码新建课表）功能，后端使用 Cloudflare Workers + KV。

**Architecture:** App 通过 `POST /share` 上传课表 JSON 并获得8位数字分享码（24小时有效），通过 `GET /import/:code` 用分享码拉取课表 JSON 并在本地新建课表。Workers 使用 KV 存储，TTL 机制自动过期。

**Tech Stack:** React Native / Expo、expo-clipboard、Cloudflare Workers、Cloudflare KV

---

## 文件变更清单

| 文件 | 类型 | 职责 |
|------|------|------|
| `cloudflare/worker.js` | 新建 | Workers 入口：`POST /share`、`GET /import/:code` |
| `cloudflare/wrangler.toml` | 新建 | Workers 部署配置 |
| `constants/api.ts` | 新建 | `SHARE_API_BASE` 常量 |
| `state/GlobalState.js` | 修改 | 新增 `IMPORT_SCHEDULE` reducer case |
| `app/scheduleSwitch.tsx` | 修改 | 顶部导入区 + `···`菜单"分享课表" + 两个 Modal |

---

## Task 1：创建 Cloudflare Workers 文件

**Files:**
- Create: `cloudflare/worker.js`
- Create: `cloudflare/wrangler.toml`

- [ ] **Step 1: 创建 cloudflare 目录并写入 worker.js**

```javascript
// cloudflare/worker.js
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

    // POST /share — 上传课表，返回分享码
    if (method === 'POST' && url.pathname === '/share') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: '无效的 JSON' }, 400, corsHeaders);
      }

      // 生成不重复的8位数字码，最多重试10次
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

    // GET /import/:code — 用分享码拉取课表
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

- [ ] **Step 2: 创建 wrangler.toml**

```toml
# cloudflare/wrangler.toml
name = "schedule-share"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SCHEDULE_KV"
id = "填入KV命名空间ID"
preview_id = "填入预览KV命名空间ID"
```

- [ ] **Step 3: 提交**

```bash
git add cloudflare/
git commit -m "feat: add cloudflare workers for schedule share"
```

---

## Task 2：创建 constants/api.ts

**Files:**
- Create: `constants/api.ts`

- [ ] **Step 1: 写入 api.ts**

Workers 部署完成后将实际 URL 替换占位符。

```typescript
// constants/api.ts
// 部署 Cloudflare Workers 后替换为实际 URL
// 格式: https://schedule-share.<your-subdomain>.workers.dev
export const SHARE_API_BASE = 'https://schedule-share.your-subdomain.workers.dev';
```

- [ ] **Step 2: 提交**

```bash
git add constants/api.ts
git commit -m "feat: add SHARE_API_BASE constant"
```

---

## Task 3：GlobalState 新增 IMPORT_SCHEDULE action

**Files:**
- Modify: `state/GlobalState.js`

`CREATE_SCHEDULE` action 只接受 `name` 字段，无法携带完整课表数据。需新增 `IMPORT_SCHEDULE` 支持一次性写入所有字段。

- [ ] **Step 1: 在 globalReducer 的 `CREATE_SCHEDULE` case 之后新增 `IMPORT_SCHEDULE` case**

在 `state/GlobalState.js` 的 `globalReducer` 函数中，找到 `case 'CREATE_SCHEDULE':` 结束的 `}` 后，紧接着插入：

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

- [ ] **Step 2: 验证 reducer 结构完整**

确认 `globalReducer` 中 `IMPORT_SCHEDULE` case 位于 `CREATE_SCHEDULE` 和 `DELETE_SCHEDULE` 之间，switch 语句无语法错误。

- [ ] **Step 3: 提交**

```bash
git add state/GlobalState.js
git commit -m "feat: add IMPORT_SCHEDULE reducer action"
```

---

## Task 4：scheduleSwitch.tsx — 顶部导入区

**Files:**
- Modify: `app/scheduleSwitch.tsx`

- [ ] **Step 1: 在文件顶部 import 区新增以下导入**

在现有 import 语句末尾追加：

```typescript
import * as Clipboard from 'expo-clipboard';
import { SHARE_API_BASE } from '@/constants/api';
```

- [ ] **Step 2: 在组件 state 区新增导入相关状态**

在现有 `const [renameTarget, setRenameTarget] = useState<Schedule | null>(null);` 之后追加：

```typescript
const [importCode, setImportCode] = useState('');
const [importing, setImporting] = useState(false);
```

- [ ] **Step 3: 新增 handleImport 函数**

在 `confirmName` 函数之后追加：

```typescript
async function handleImport() {
  if (importCode.length !== 8) return;
  setImporting(true);
  try {
    const res = await fetch(`${SHARE_API_BASE}/import/${importCode}`);
    if (!res.ok) {
      Alert.alert('导入失败', '分享码无效或已过期');
      return;
    }
    const data = await res.json();
    dispatch({ type: 'IMPORT_SCHEDULE', payload: data });
    setImportCode('');
    Alert.alert('导入成功', `课表「${data.name || '来自分享'}」已添加`);
  } catch {
    Alert.alert('导入失败', '网络错误，请检查连接');
  } finally {
    setImporting(false);
  }
}
```

- [ ] **Step 4: 在 JSX 的 ScrollView 内、`<Text style={styles.sectionTitle}>我的课表</Text>` 之前插入顶部导入区**

```tsx
{/* 顶部导入区 */}
<View style={styles.importRow}>
  <TextInput
    style={styles.importInput}
    placeholder="输入8位分享码"
    placeholderTextColor="#C5C5C5"
    value={importCode}
    onChangeText={(t) => setImportCode(t.replace(/\D/g, '').slice(0, 8))}
    keyboardType="numeric"
    maxLength={8}
  />
  <TouchableOpacity
    style={[styles.importBtn, importCode.length !== 8 && styles.importBtnDisabled]}
    onPress={handleImport}
    disabled={importCode.length !== 8 || importing}
    activeOpacity={0.8}
  >
    <Text style={[styles.importBtnText, importCode.length !== 8 && styles.importBtnTextDisabled]}>
      {importing ? '导入中' : '导入'}
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 5: 在 StyleSheet 末尾新增样式**

```typescript
importRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
},
importInput: {
  flex: 1,
  height: 44,
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  paddingHorizontal: 14,
  fontSize: 15,
  color: '#1A1A2E',
  borderWidth: 1,
  borderColor: '#E0D9F5',
},
importBtn: {
  height: 44,
  paddingHorizontal: 18,
  borderRadius: 10,
  backgroundColor: '#6454ab',
  justifyContent: 'center',
  alignItems: 'center',
},
importBtnDisabled: {
  backgroundColor: '#E0E0E0',
},
importBtnText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#FFFFFF',
},
importBtnTextDisabled: {
  color: '#A5A5A5',
},
```

- [ ] **Step 6: 提交**

```bash
git add app/scheduleSwitch.tsx constants/api.ts
git commit -m "feat: add import-by-code UI to schedule switch page"
```

---

## Task 5：scheduleSwitch.tsx — 分享课表功能

**Files:**
- Modify: `app/scheduleSwitch.tsx`

- [ ] **Step 1: 新增分享相关状态**

在 `const [importing, setImporting] = useState(false);` 之后追加：

```typescript
const [shareCode, setShareCode] = useState('');
const [shareModalVisible, setShareModalVisible] = useState(false);
const [sharing, setSharing] = useState(false);
```

- [ ] **Step 2: 新增 handleShare 函数**

在 `handleImport` 函数之后追加：

```typescript
async function handleShare(s: Schedule) {
  setMenuSchedule(null);
  setSharing(true);
  try {
    const res = await fetch(`${SHARE_API_BASE}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: s.name,
        schedulePeriod: s.schedulePeriod,
        startDate: s.startDate,
        timeLabelList: s.timeLabelList,
        myClassList: s.myClassList,
      }),
    });
    if (!res.ok) {
      Alert.alert('分享失败', '生成分享码失败，请重试');
      return;
    }
    const data = await res.json();
    setShareCode(data.code);
    setShareModalVisible(true);
  } catch {
    Alert.alert('分享失败', '网络错误，请检查连接');
  } finally {
    setSharing(false);
  }
}
```

- [ ] **Step 3: 在 `···` 菜单的"重命名"菜单项后、"设为第二课表"之前插入"分享课表"菜单项**

找到以下代码块：
```tsx
<TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && openRename(menuSchedule)}>
  <AntDesign name="edit" size={16} color="#575757" />
  <Text style={styles.menuItemText}>重命名</Text>
</TouchableOpacity>
<View style={styles.menuDivider} />
<TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleSetSecond(menuSchedule)}>
```

在 `<View style={styles.menuDivider} />` 与 `<TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleSetSecond(menuSchedule)}>` 之间插入：

```tsx
<TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleShare(menuSchedule)}>
  <AntDesign name="sharealt" size={16} color="#575757" />
  <Text style={styles.menuItemText}>{sharing ? '生成中…' : '分享课表'}</Text>
</TouchableOpacity>
<View style={styles.menuDivider} />
```

- [ ] **Step 4: 在文件末尾的 `</View>`（组件根节点关闭标签）之前插入分享码展示 Modal**

找到组件 return 中最后一个 `</Modal>` 结束标签之后、`</View>` 之前，插入：

```tsx
{/* 分享码展示 Modal */}
<Modal
  visible={shareModalVisible}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setShareModalVisible(false)}
>
  <View style={styles.modalBackdrop} />
  <Pressable style={styles.menuOverlay} onPress={() => setShareModalVisible(false)}>
    <View style={styles.shareCard}>
      <Text style={styles.shareCardTitle}>分享码</Text>
      <Text style={styles.shareCodeText}>{shareCode}</Text>
      <Text style={styles.shareCardHint}>24 小时内有效</Text>
      <View style={styles.shareCardActions}>
        <TouchableOpacity
          style={styles.copyBtn}
          activeOpacity={0.8}
          onPress={async () => {
            await Clipboard.setStringAsync(shareCode);
            Alert.alert('已复制', '分享码已复制到剪贴板');
          }}
        >
          <AntDesign name="copy1" size={16} color="#FFFFFF" />
          <Text style={styles.copyBtnText}>复制分享码</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Pressable>
</Modal>
```

- [ ] **Step 5: 在 StyleSheet 末尾新增分享 Modal 样式**

```typescript
shareCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 28,
  alignItems: 'center',
  minWidth: 260,
  gap: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 20,
  elevation: 12,
},
shareCardTitle: {
  fontSize: 14,
  color: '#A5A5A5',
  fontWeight: '500',
},
shareCodeText: {
  fontSize: 36,
  fontWeight: '800',
  color: '#1A1A2E',
  letterSpacing: 6,
  marginVertical: 8,
},
shareCardHint: {
  fontSize: 12,
  color: '#C5C5C5',
  marginBottom: 8,
},
shareCardActions: {
  flexDirection: 'row',
  marginTop: 8,
},
copyBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  height: 44,
  paddingHorizontal: 24,
  borderRadius: 10,
  backgroundColor: '#6454ab',
},
copyBtnText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#FFFFFF',
},
```

- [ ] **Step 6: 提交**

```bash
git add app/scheduleSwitch.tsx
git commit -m "feat: add share schedule via code feature"
```

---

## Task 6：部署 Cloudflare Workers（人工操作）

**Files:**
- Modify: `cloudflare/wrangler.toml`（填入实际 KV ID）
- Modify: `constants/api.ts`（填入实际 Workers URL）

- [ ] **Step 1: 安装 Wrangler CLI（如未安装）**

```bash
npm install -g wrangler
```

- [ ] **Step 2: 登录 Cloudflare**

```bash
wrangler login
# 浏览器打开 Cloudflare 授权页面，完成登录
```

- [ ] **Step 3: 创建 KV 命名空间**

```bash
cd cloudflare
wrangler kv:namespace create SCHEDULE_KV
# 输出示例:
# ✅ Created KV namespace with ID "abc123def456..."
# Add the following to your wrangler.toml:
# [[kv_namespaces]]
# binding = "SCHEDULE_KV"
# id = "abc123def456..."
```

将输出的 `id` 填入 `cloudflare/wrangler.toml` 的 `id` 字段。

- [ ] **Step 4: 部署 Workers**

```bash
wrangler deploy
# 输出示例:
# ✅ Deployed schedule-share to https://schedule-share.你的用户名.workers.dev
```

- [ ] **Step 5: 将 Workers URL 填入 constants/api.ts**

将 `constants/api.ts` 中的占位符替换为实际 URL：

```typescript
export const SHARE_API_BASE = 'https://schedule-share.你的用户名.workers.dev';
```

- [ ] **Step 6: 验证 API 可访问**

```bash
# 测试分享接口
curl -X POST https://schedule-share.你的用户名.workers.dev/share \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","schedulePeriod":[1,20],"startDate":[2025,8,17],"timeLabelList":[],"myClassList":[]}'
# 预期返回: {"code":"12345678"}

# 测试导入接口（用上面返回的 code）
curl https://schedule-share.你的用户名.workers.dev/import/12345678
# 预期返回: {"name":"测试","schedulePeriod":[1,20],...}
```

- [ ] **Step 7: 提交最终配置**

```bash
git add cloudflare/wrangler.toml constants/api.ts
git commit -m "feat: configure workers url and kv namespace id"
```

---

## 自审检查

- ✅ `IMPORT_SCHEDULE` action 完整定义在 Task 3，Task 4 中 `dispatch` 调用与之一致
- ✅ `SHARE_API_BASE` 在 Task 2 新建，Task 4/5 中 import 路径 `@/constants/api` 一致
- ✅ `handleShare` 接收 `Schedule` 类型参数，与 `menuSchedule` 类型 `Schedule | null` 匹配
- ✅ `expo-clipboard` 已在项目中安装（`package.json` 中已有 `"expo-clipboard": "~8.0.8"`），无需额外安装步骤
- ✅ 所有 Modal 结构遵循 CLAUDE.md 中的底部弹窗模板（`statusBarTranslucent`、`modalBackdrop`）
- ✅ 分享码展示 Modal 使用居中样式（`menuOverlay` + `shareCard`），区别于底部弹起的 Modal
