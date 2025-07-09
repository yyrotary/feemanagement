-- donations 테이블에 from_friend 관련 컬럼 추가
-- 이 스크립트를 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. from_friend_id 컬럼 추가 (회원 ID 참조)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS from_friend_id uuid REFERENCES members(id) ON DELETE SET NULL;

-- 2. from_friend_name 컬럼 추가 (회원 이름)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS from_friend_name text;

-- 3. 인덱스 추가 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_donations_from_friend_id ON donations(from_friend_id);
CREATE INDEX IF NOT EXISTS idx_donations_from_friend_name ON donations(from_friend_name);

-- 실행 후 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'donations' 
AND column_name LIKE '%friend%'
ORDER BY ordinal_position; 