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
      const MAX_BODY_BYTES = 50 * 1024; // 50 KB

      const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
      if (contentLength > MAX_BODY_BYTES) {
        return json({ error: '数据过大' }, 413, corsHeaders);
      }

      let body;
      try {
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) {
          return json({ error: '数据过大' }, 413, corsHeaders);
        }
        body = JSON.parse(text);
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
