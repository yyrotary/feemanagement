import { createClient } from '@supabase/supabase-js'

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 환경변수 검증
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.'
  )
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey)

// 데이터베이스 테이블 이름
export const TABLES = {
  MEMBERS: 'members',
  FEES: 'fees',
  SERVICE_FEES: 'service_fees',
  SPECIAL_EVENTS: 'special_events',
  SPECIAL_FEES: 'special_fees',
  MASTER_INFO: 'master_info',
  DONATIONS: 'donations',
  NOTICES: 'notices',
  TRANSACTIONS: 'transactions'
} as const; 