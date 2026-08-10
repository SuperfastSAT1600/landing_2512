import { NextRequest, NextResponse } from 'next/server';

/**
 * 호스트명 기반 루트 라우팅.
 *
 * 뉴튼아카데미 제안 자료를 짧은 주소 하나로 전달하기 위한 것.
 * Edumo 호스트로 들어온 루트 요청만 /demo/newton 으로 rewrite 한다.
 * superfastsat.com 루트는 손대지 않는다 — 같은 Vercel 프로젝트를 공유하기 때문에
 * 여기서 조건을 잘못 잡으면 본 사이트 첫 화면이 제안서로 바뀐다.
 *
 * 호스트는 env로 덮어쓸 수 있게 둔다(도메인이 바뀌어도 코드 수정 없이 대응).
 *   EDUMO_HOSTS="argonautai-edumo.vercel.app,edumo.argonautai.co.kr"
 */
const DEFAULT_EDUMO_HOSTS = ['argonautai-edumo.vercel.app', 'edumo.argonautai.co.kr'];

const EDUMO_HOSTS = (process.env.EDUMO_HOSTS ?? '')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

const HOSTS = EDUMO_HOSTS.length > 0 ? EDUMO_HOSTS : DEFAULT_EDUMO_HOSTS;

const DEMO_PATH = '/demo/newton';

export function middleware(request: NextRequest) {
  // 포트를 떼고 소문자로 비교한다(로컬 확인·프록시 환경 대응).
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (!HOSTS.includes(host)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = DEMO_PATH;
  return NextResponse.rewrite(url);
}

// 루트 요청에만 개입한다. 정적 자산·API·다른 경로는 그대로 통과시킨다.
export const config = {
  matcher: '/',
};
