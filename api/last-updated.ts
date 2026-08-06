/**
 * GET /api/last-updated
 * → { date: "YY-MM-DD" }
 *
 * About Me 팝업의 "Last updated" — 손으로 날짜를 고치지 않아도, 이 저장소
 * main 브랜치의 최신 커밋 날짜를 매번 가져와 보여준다. Vercel 서버리스
 * 함수를 거치는 이유는 theme-color.ts와 동일 — 방문자마다 브라우저에서
 * GitHub API를 직접 두드리면 비로그인 rate limit(시간당 60회)에 쉽게
 * 걸리므로, 여기서 한 번 가져와 CDN에 캐시해두고 그걸 나눠준다.
 */
const REPO = 'sejeongblairlee/portfolio_mac_os9';

interface VercelResponseLike {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export default async function handler(_req: unknown, res: VercelResponseLike) {
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/commits?sha=main&per_page=1`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-last-updated' },
    });
    if (!ghRes.ok) {
      res.status(502).json({ error: `GitHub API HTTP ${ghRes.status}` });
      return;
    }
    const commits = (await ghRes.json()) as Array<{ commit?: { committer?: { date?: string } } }>;
    const iso = commits[0]?.commit?.committer?.date;
    if (!iso) {
      res.status(502).json({ error: 'no commit date in response' });
      return;
    }
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ date: formatDate(iso) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'unknown error' });
  }
}
