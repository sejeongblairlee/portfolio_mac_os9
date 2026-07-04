/**
 * Supabase 연결 정보.
 * anon key는 공개용 키(클라이언트 배포 전제)이며, 쓰기 권한은 RLS로 차단되어 있음.
 * 값은 Supabase Dashboard → Project Settings → API에서 복사.
 */
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
