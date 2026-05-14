/**
 * Vercel Serverless: /api/* so'rovlarini Django (Render va h.k.) ga proksilaydi.
 * Vercel → Settings → Environment Variables: BACKEND_ORIGIN
 * Masalan: https://sizning-api.onrender.com  (oxirida /api bo'lmasin)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const backend = (process.env.BACKEND_ORIGIN || "").trim().replace(/\/$/, "");
  if (!backend) {
    res.status(503).setHeader("Content-Type", "application/json").send(
      JSON.stringify({
        detail:
          "BACKEND_ORIGIN sozlanmagan. Vercel → Environment Variables: Django API domeni (masalan https://xxx.onrender.com)",
      })
    );
    return;
  }

  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const u = new URL(req.url || "/", `${proto}://${host}`);
  const target = `${backend}${u.pathname}${u.search}`;

  const skip = new Set(["host", "connection", "content-length", "transfer-encoding"]);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined || skip.has(k.toLowerCase())) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "string") body = req.body;
    else if (Buffer.isBuffer(req.body)) body = req.body;
    else if (req.body !== undefined && typeof req.body === "object") {
      body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (e) {
    res.status(502).setHeader("Content-Type", "application/json").send(JSON.stringify({ detail: String(e) }));
    return;
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.append(key, value);
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}
