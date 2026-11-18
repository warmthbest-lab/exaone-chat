// Cloudflare Worker: 엑사원 API 중계 서버 (CORS 해결용)
// 채팅 페이지 설정의 "API 주소"를 https://<워커주소>/v1 로 바꿔서 사용하세요.
const ALLOWED = "https://warmthbest-lab.github.io";

export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    const path = new URL(req.url).pathname;
    const upstream = await fetch("https://api.exaone.ai" + path, {
      method: "POST",
      headers: {
        "Authorization": req.headers.get("Authorization") || "",
        "Content-Type": "application/json",
      },
      body: req.body,
    });

    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
