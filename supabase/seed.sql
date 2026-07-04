-- Blair-tunes 시드 데이터 (Step 1 예시 1곡)

insert into public.tracks
  (sort_order, title, artist, youtube_url,
   curation, performance_location, performance_year,
   duration_label, is_featured, is_published)
values
  (1, 'Smooth Operator', 'Sade',
   'https://www.youtube.com/watch?v=PLACEHOLDER',
   '샌디에고의 밤공기를 닮은 목소리. 작업 시작할 때 제일 먼저 트는 곡이에요.',
   'San Diego', 2016,
   'mm:hh', true, true);
