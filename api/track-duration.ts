/**
 * POST /api/track-duration
 * body: { id: string (tracks.id, uuid), seconds: number }
 *
 * 재생 중인 브라우저가 YouTube IFrame Player로부터 실제 duration을 알아낸
 * 시점에 호출. duration_label이 아직 비어있는(placeholder) 트랙만 채운다 —
 * 이미 값이 있으면 건드리지 않음(임의 방문자가 값을 조작하지 못하게).
 *
 * scripts/sync-durations.mjs(YouTube Data API로 일괄 백필)와 같은 목적,
 * 다른 경로: API 키 없이 실제 재생 시점에 자연스럽게 채워짐.
 */
import { SUPABASE_URL } from '../src/lib/supabase-config';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const PLACEHOLDER_VALUES = new Set([null, '', 'mm:hh']);
const MAX_SECONDS = 6 * 3600; // 6시간 — 이보다 길면 오류/이상값으로 간주

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}
interface VercelResponseLike {
  status(code: number): VercelResponseLike;
  json(body: unknown): void;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as
    | { id?: unknown; seconds?: unknown }
    | undefined;
  const id = body?.id;
  const seconds = body?.seconds;

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS) {
    res.status(400).json({ error: 'invalid seconds' });
    return;
  }

  const authHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  try {
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${id}&select=duration_label`, {
      headers: authHeaders,
    });
    if (!getRes.ok) {
      res.status(502).json({ error: `lookup failed: HTTP ${getRes.status}` });
      return;
    }
    const rows = (await getRes.json()) as Array<{ duration_label: string | null }>;
    if (rows.length === 0) {
      res.status(404).json({ error: 'track not found' });
      return;
    }
    if (!PLACEHOLDER_VALUES.has(rows[0].duration_label)) {
      // 이미 값이 있음 — 덮어쓰지 않고 그대로 반환
      res.status(200).json({ updated: false, duration_label: rows[0].duration_label });
      return;
    }

    const duration_label = formatDuration(seconds);
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ duration_label }),
    });
    if (!patchRes.ok) {
      res.status(502).json({ error: `update failed: HTTP ${patchRes.status}` });
      return;
    }
    res.status(200).json({ updated: true, duration_label });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'unknown error' });
  }
}
