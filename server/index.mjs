import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 7860);
const ROOT = process.cwd();
const SPACE_URL = "https://xinxinzi1021-sana-ai.hf.space";
const TOKEN = process.env.HF_TOKEN || "";
const MAX_BODY = 24_000;
const MIME = { ".css":"text/css", ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".gif":"image/gif", ".ico":"image/x-icon" };

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" });
  res.end(JSON.stringify(body));
}
function safePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.message !== "string" || !value.message.trim() || value.message.length > 2000) return null;
  return value;
}
async function callSanaAI(payload) {
  if (!TOKEN) throw new Error("server_misconfigured");
  const headers = { "content-type":"application/json", "accept":"application/json, text/event-stream", "authorization":`Bearer ${TOKEN}` };
  const start = await fetch(`${SPACE_URL}/gradio_api/call/sana_chat`, { method:"POST", headers, body:JSON.stringify({ data:[JSON.stringify(payload)] }), signal:AbortSignal.timeout(20_000) });
  if (!start.ok) throw new Error("upstream_start_failed");
  const { event_id: eventId } = await start.json();
  if (!eventId) throw new Error("upstream_event_missing");
  const stream = await fetch(`${SPACE_URL}/gradio_api/call/sana_chat/${encodeURIComponent(eventId)}`, { headers, signal:AbortSignal.timeout(75_000) });
  if (!stream.ok) throw new Error("upstream_poll_failed");
  const text = await stream.text();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const data = JSON.parse(line.slice(6));
    if (Array.isArray(data) && typeof data[0] === "string") return JSON.parse(data[0]);
  }
  throw new Error("upstream_response_missing");
}
function staticFile(req, res) {
  const raw = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = normalize(join(ROOT, raw));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) return sendJson(res, 404, { error:"not_found" });
  res.writeHead(200, { "content-type": `${MIME[extname(file).toLowerCase()] || "application/octet-stream"}; charset=utf-8`, "x-content-type-options":"nosniff" });
  createReadStream(file).pipe(res);
}
createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > MAX_BODY) req.destroy(); });
    req.on("end", async () => {
      try {
        const payload = safePayload(JSON.parse(body));
        if (!payload) return sendJson(res, 400, { ok:false, error:"invalid_request" });
        const result = await callSanaAI(payload);
        return sendJson(res, 200, result && typeof result === "object" ? result : { ok:false, error:"invalid_response" });
      } catch (error) {
        console.error("[SANA proxy] upstream request failed:", error.message);
        return sendJson(res, 503, { ok:false, error:"temporarily_unavailable" });
      }
    });
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") return staticFile(req, res);
  return sendJson(res, 405, { error:"method_not_allowed" });
}).listen(PORT, "0.0.0.0", () => console.log(`[SANA] frontend server listening on ${PORT}`));
