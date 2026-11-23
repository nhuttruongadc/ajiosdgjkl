// BÁ KHÍ AI - máy chủ trung gian (không cần cài thư viện, chỉ cần Node 18+)
const http = require("http");
const fs = require("fs");
const path = require("path");

// Đọc .env thủ công
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (_) {}

const KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = process.env.PORT || 3000;
const PERSONA = "Bạn là Bá Khí AI, một trợ lý trí tuệ nhân tạo thông minh, thân thiện, tự tin và có tư duy logic. Bạn giao tiếp tự nhiên, tôn trọng người dùng, trả lời đúng trọng tâm, giải thích rõ ràng và không bịa đặt thông tin. Khi không chắc chắn, bạn phải nói rõ mức độ không chắc chắn. Mặc định trả lời bằng tiếng Việt (trừ khi người dùng dùng ngôn ngữ khác) và có thể dùng Markdown.";

// Giới hạn đơn giản: 20 yêu cầu / phút / IP
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr); return arr.length > 20;
}
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };

async function chat(req, res) {
  if (!KEY) return json(res, 503, { error: "Máy chủ chưa có GEMINI_API_KEY." });
  if (limited(req.socket.remoteAddress)) return json(res, 429, { error: "Quá nhiều yêu cầu, vui lòng đợi một chút." });
  let body = "";
  for await (const c of req) { body += c; if (body.length > 400000) return json(res, 413, { error: "Nội dung quá dài." }); }
  let messages;
  try { messages = JSON.parse(body).messages; } catch (_) { return json(res, 400, { error: "Dữ liệu không hợp lệ." }); }
  if (!Array.isArray(messages) || !messages.length) return json(res, 400, { error: "Thiếu tin nhắn." });
  const contents = messages.slice(-40).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "").slice(0, 30000) }]
  }));
  const ac = new AbortController();
  res.on("close", () => ac.abort());
  let up;
  try {
    up = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:streamGenerateContent?alt=sse`, {
      method: "POST", signal: ac.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: PERSONA }] }, contents })
    });
  } catch (e) { return json(res, 502, { error: "Không kết nối được tới Gemini." }); }
  if (!up.ok) {
    let msg = "Gemini trả lỗi " + up.status + ".";
    try { const j = await up.json(); if (j.error && j.error.message) msg += " " + j.error.message; } catch (_) {}
    return json(res, up.status === 429 ? 429 : 502, { error: msg });
  }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
  const dec = new TextDecoder(); let buf = "";
  try {
    for await (const chunk of up.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const j = JSON.parse(line.slice(5));
          const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
          for (const p of parts) if (p.text) res.write(p.text);
        } catch (_) {}
      }
    }
  } catch (_) {}
  res.end();
}

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  // CORS để bản app điện thoại (APK) gọi được /api
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (url === "/api/health") return json(res, 200, { ready: !!KEY, model: MODEL });
  if (url === "/api/chat" && req.method === "POST") return chat(req, res).catch(() => { try { json(res, 500, { error: "Lỗi máy chủ." }); } catch (_) {} });
  const file = path.join(__dirname, "public", url === "/" ? "index.html" : path.normalize(url).replace(/^(\.\.[\/\\])+/, ""));
  if (!file.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); res.end(data);
  });
}).listen(PORT, () => console.log(`BÁ KHÍ AI đang chạy: http://localhost:${PORT}  (key: ${KEY ? "đã cấu hình" : "CHƯA cấu hình"})`));
