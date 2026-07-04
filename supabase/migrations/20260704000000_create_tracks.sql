-- Blair-tunes: tracks 테이블 (Step 1)
-- 실행: Supabase Dashboard → SQL Editor에 붙여넣기, 또는 supabase db push

create table if not exists public.tracks (
  id                    uuid primary key default gen_random_uuid(),
  sort_order            integer not null default 0,
  title                 text not null,
  artist                text not null,
  youtube_url           text not null,
  youtube_video_id      text,
  thumbnail_url         text,
  curation              text,
  performance_location  text,
  performance_year      integer,
  theme_color           text not null default '#2A2118',
  text_color            text not null default '#FFFFFF',
  color_source          text not null default 'fallback',
  duration_label        text,
  is_featured           boolean not null default false,
  is_published          boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 플레이리스트 정렬용 인덱스 (sort_order asc, 동률이면 created_at asc)
create index if not exists tracks_playlist_order_idx
  on public.tracks (sort_order asc, created_at asc);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tracks_set_updated_at on public.tracks;
create trigger tracks_set_updated_at
  before update on public.tracks
  for each row
  execute function public.set_updated_at();

-- RLS: 정적 사이트가 anon key로 읽으므로 반드시 활성화.
-- 공개 정책은 "published된 행 읽기"만 — 쓰기는 대시보드/서비스 롤로만.
alter table public.tracks enable row level security;

drop policy if exists "Public can read published tracks" on public.tracks;
create policy "Public can read published tracks"
  on public.tracks
  for select
  using (is_published = true);
