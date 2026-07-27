/**
 * Blair-tunes: tracks.duration_label 백필 스크립트.
 *
 * DB에 실제 재생시간을 저장해두는 이유: /api/theme-color처럼 매 방문마다
 * 파생하면 값이 도착하기 전(placeholder) 순간이 항상 생긴다. duration은
 * 첫 렌더부터 정확해야 하므로, 대신 이 스크립트로 미리 채워서
 * fetchTracks()의 select('*') 한 번에 진짜 값이 같이 오게 한다.
 *
 * 대상: duration_label이 비어있거나(null/'') placeholder('mm:hh')인 행만.
 * 이미 값이 채워진 행은 건드리지 않으므로 여러 번 실행해도 안전 —
 * 새 트랙 추가할 때마다 다시 실행하면 됨.
 *
 * 실행:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/sync-durations.mjs
 *
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase Dashboard → Project Settings → API
 *   → service_role secret (절대 커밋/클라이언트 노출 금지, RLS 우회 권한)
 * - YOUTUBE_API_KEY: Google Cloud Console → YouTube Data API v3 활성화 후
 *   API 키 발급
 */

const SUPABASE_URL = 'https://nmivopvhiwzaifpzlskf.supabase.co';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const PLACEHOLDER_VALUES = new Set([null, '', 'mm:hh']);

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY / YOUTUBE_API_KEY 환경변수가 필요합니다.');
  console.error('사용법: SUPABASE_SERVICE_ROLE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/sync-durations.mjs');
  process.exit(1);
}

function extractYouTubeVideoId(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let c = null;
  if (host === 'youtu.be') {
    c = u.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const seg = u.pathname.split('/').filter(Boolean);
    if (seg[0] === 'watch' || u.pathname === '/watch') c = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(seg[0])) c = seg[1] ?? null;
  }
  return c && VIDEO_ID_RE.test(c) ? c : null;
}

/** blairtunes.js의 formatTime()과 동일한 표기(시 단위 롤오버 없음)로 맞춤 */
function formatDuration(iso8601) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso8601);
  if (!m) return null;
  const totalSeconds = (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
  if (totalSeconds <= 0) return null;
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

async function fetchTracksNeedingSync() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tracks?select=id,title,youtube_url,youtube_video_id,duration_label`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
  );
  if (!res.ok) throw new Error(`tracks 조회 실패: HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.filter((t) => PLACEHOLDER_VALUES.has(t.duration_label));
}

async function fetchDurations(videoIds) {
  const map = new Map();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API 실패: HTTP ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const item of body.items ?? []) {
      const label = formatDuration(item.contentDetails?.duration ?? '');
      if (label) map.set(item.id, label);
    }
  }
  return map;
}

async function updateDurationLabel(id, durationLabel) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ duration_label: durationLabel }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
}

async function main() {
  const tracks = await fetchTracksNeedingSync();
  if (tracks.length === 0) {
    console.log('동기화 필요한 트랙 없음 — 모든 duration_label이 이미 채워져 있습니다.');
    return;
  }

  const resolved = tracks.map((t) => ({
    ...t,
    videoId: t.youtube_video_id || extractYouTubeVideoId(t.youtube_url),
  }));

  const missingVideoId = resolved.filter((t) => !t.videoId);
  for (const t of missingVideoId) {
    console.warn(`[SKIP] "${t.title}" (${t.id}) — youtube_url에서 video id를 추출할 수 없음`);
  }

  const withVideoId = resolved.filter((t) => t.videoId);
  const durations = await fetchDurations([...new Set(withVideoId.map((t) => t.videoId))]);

  let updated = 0;
  for (const t of withVideoId) {
    const label = durations.get(t.videoId);
    if (!label) {
      console.warn(`[SKIP] "${t.title}" (${t.id}) — YouTube에서 duration을 가져오지 못함 (videoId: ${t.videoId})`);
      continue;
    }
    await updateDurationLabel(t.id, label);
    console.log(`[OK] "${t.title}" → ${label}`);
    updated += 1;
  }

  console.log(`\n완료: ${updated}/${tracks.length}개 트랙 duration_label 갱신.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
