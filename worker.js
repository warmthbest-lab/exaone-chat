// Cloudflare Worker: 엑사원 API 중계 서버 (CORS 해결용)
// 채팅 페이지 설정의 "API 주소"를 https://<워커주소>/v1 로 바꿔서 사용하세요.
// API 키는 이 코드에 넣지 않습니다. 페이지가 보낸 키를 그대로 엑사원에 전달만 합니다.

const ALLOWED_ORIGIN = "https://warmthbest-lab.github.io";
const UPSTREAM = "https://api.exaone.ai";
const ALLOWED_PATHS = ["/v1/chat/completions", "/v1/models"];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonError(status, message, cors) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    const { pathname } = new URL(request.url);

    // 브라우저 사전 확인 요청(preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // 상태 확인용: 브라우저로 워커 주소를 열면 이 문구가 보입니다
    if (request.method === "GET" && pathname === "/") {
      return new Response("exaone-proxy 작동 중", {
        headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 요청 검증: 내 페이지에서 온 요청, 허용된 경로, 키가 있는 요청만 통과
    if (origin !== ALLOWED_ORIGIN) {
      return jsonError(403, "허용되지 않은 사이트에서 온 요청입니다.", cors);
    }
    if (!ALLOWED_PATHS.includes(pathname)) {
      return jsonError(404, "지원하지 않는 경로입니다: " + pathname, cors);
    }
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.length < 12) {
      return jsonError(401, "API 키가 없습니다. 채팅 페이지 설정에서 키를 넣어 주세요.", cors);
    }

    try {
      const upstream = await fetch(UPSTREAM + pathname, {
        method: request.method,
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: request.method === "POST" ? request.body : undefined,
      });

      // 스트리밍 응답을 그대로 흘려보내고 CORS 헤더만 덧붙임
      const headers = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch (err) {
      console.error("엑사원 서버 연결 실패:", err);
      return jsonError(502, "엑사원 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.", cors);
    }
  },
};
