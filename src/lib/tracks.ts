/**
 * Blair-tunes 트랙 fetch 로직 (Step 1).
 * - is_published = true 만
 * - sort_order asc, 동률이면 created_at asc
 * - 에러는 throw하지 않고 결과 객체로 반환 (UI가 안전하게 처리)
 *
 * 참고: 이 프로젝트는 빌드 없는 정적 사이트라, UI에 연결하는 단계(Step 3+)에서
 * esm.sh CDN import로 브라우저에서 직접 쓰거나 가벼운 번들 단계를 추가한다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Track } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export interface FetchTracksResult {
  tracks: Track[];
  /** null이면 성공 */
  error: string | null;
}

export async function fetchTracks(): Promise<FetchTracksResult> {
  try {
    const { data, error } = await getClient()
      .from('tracks')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { tracks: [], error: error.message };
    }
    return { tracks: (data ?? []) as Track[], error: null };
  } catch (e) {
    return {
      tracks: [],
      error: e instanceof Error ? e.message : 'Unknown error while fetching tracks',
    };
  }
}
