/**
 * Blair-tunes 데이터 모델 — Supabase `tracks` 테이블과 1:1 매칭.
 * (스키마: supabase/migrations/20260704000000_create_tracks.sql)
 */

/** theme_color / text_color가 어떻게 정해졌는지 표시 */
export type ColorSource = 'fallback' | 'thumbnail' | 'manual' | (string & {});

export interface Track {
  /** uuid primary key */
  id: string;
  /** 플레이리스트 정렬 순서 (asc) */
  sort_order: number;
  title: string;
  artist: string;
  youtube_url: string;
  /** Step 2에서 youtube_url 파싱으로 채워질 예정 */
  youtube_video_id: string | null;
  /** Step 2에서 썸네일 추출로 채워질 예정 */
  thumbnail_url: string | null;
  /** 큐레이션 코멘트 (한국어) */
  curation: string | null;
  performance_location: string | null;
  performance_year: number | null;
  /** 기본 '#2A2118' */
  theme_color: string;
  /** 기본 '#FFFFFF' */
  text_color: string;
  /** 기본 'fallback' */
  color_source: ColorSource;
  duration_label: string | null;
  is_featured: boolean;
  is_published: boolean;
  /** timestamptz ISO 문자열 */
  created_at: string;
  /** timestamptz ISO 문자열 — DB 트리거로 자동 갱신 */
  updated_at: string;
}

/**
 * fetch 시점에 YouTube 메타데이터가 파생·보정된 트랙 (Step 2).
 * DB에 youtube_video_id / thumbnail_url이 비어 있어도
 * youtube_url에서 파생 가능하면 채워진 상태로 UI에 전달된다.
 */
export interface EnrichedTrack extends Track {
  /** maxresdefault 404 대비용 hqdefault 폴백 (UI의 <img onerror>에서 사용) */
  thumbnail_fallback_url: string | null;
}
