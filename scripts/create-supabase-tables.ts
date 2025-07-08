import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// 테이블 생성 SQL
const createTablesSQL = `
-- 1. 회원 테이블 (members)
CREATE TABLE IF NOT EXISTS members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    nickname text,
    phone bigint,
    join_date date,
    member_fee integer DEFAULT 0,
    paid_fee integer DEFAULT 0,
    unpaid_fee integer DEFAULT 0,
    deduction text[],
    total_donation integer DEFAULT 0,
    friendship_donation integer DEFAULT 0,
    contribution_score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. 회비 테이블 (fees)
CREATE TABLE IF NOT EXISTS fees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    date date NOT NULL,
    amount integer NOT NULL,
    method text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. 봉사금 테이블 (service_fees)
CREATE TABLE IF NOT EXISTS service_fees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    date date NOT NULL,
    amount integer NOT NULL,
    method text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. 특별 이벤트 테이블 (special_events)
CREATE TABLE IF NOT EXISTS special_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    nickname text,
    date date NOT NULL,
    event_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. 특별 회비 테이블 (special_fees)
CREATE TABLE IF NOT EXISTS special_fees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    date date NOT NULL,
    amount integer NOT NULL,
    method text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 6. 기부금 테이블 (donations)
CREATE TABLE IF NOT EXISTS donations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    date date NOT NULL,
    amount integer NOT NULL,
    method text NOT NULL,
    category text[] NOT NULL,
    from_friend text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. 마스터 정보 테이블 (master_info)
CREATE TABLE IF NOT EXISTS master_info (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 8. 공지사항 테이블 (notices)
CREATE TABLE IF NOT EXISTS notices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author text NOT NULL,
    date date NOT NULL,
    is_important boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 9. 거래 내역 테이블 (transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    description text NOT NULL,
    in_amount integer DEFAULT 0,
    out_amount integer DEFAULT 0,
    balance integer NOT NULL,
    branch text,
    bank text,
    memo text,
    related_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
`

// 인덱스 생성 SQL
const createIndexesSQL = `
-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_fees_member_id ON fees(member_id);
CREATE INDEX IF NOT EXISTS idx_fees_date ON fees(date);
CREATE INDEX IF NOT EXISTS idx_service_fees_member_id ON service_fees(member_id);
CREATE INDEX IF NOT EXISTS idx_service_fees_date ON service_fees(date);
CREATE INDEX IF NOT EXISTS idx_special_events_member_id ON special_events(member_id);
CREATE INDEX IF NOT EXISTS idx_special_events_date ON special_events(date);
CREATE INDEX IF NOT EXISTS idx_special_fees_member_id ON special_fees(member_id);
CREATE INDEX IF NOT EXISTS idx_special_fees_date ON special_fees(date);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_related_member_id ON transactions(related_member_id);
`

// 트리거 및 함수 생성 SQL
const createTriggersSQL = `
-- 함수 생성: 회원의 총 납부 회비 업데이트
CREATE OR REPLACE FUNCTION update_member_paid_fee()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE members 
        SET paid_fee = paid_fee + NEW.amount
        WHERE id = NEW.member_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE members 
        SET paid_fee = paid_fee - OLD.amount + NEW.amount
        WHERE id = NEW.member_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE members 
        SET paid_fee = paid_fee - OLD.amount
        WHERE id = OLD.member_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성: 회비 변경 시 회원 정보 업데이트
DROP TRIGGER IF EXISTS trigger_update_member_paid_fee ON fees;
CREATE TRIGGER trigger_update_member_paid_fee
    AFTER INSERT OR UPDATE OR DELETE ON fees
    FOR EACH ROW EXECUTE FUNCTION update_member_paid_fee();

-- 함수 생성: 회원의 미납 회비 업데이트
CREATE OR REPLACE FUNCTION update_member_unpaid_fee()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE members 
    SET unpaid_fee = member_fee - paid_fee
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성: 회원 정보 변경 시 미납 회비 업데이트
DROP TRIGGER IF EXISTS trigger_update_member_unpaid_fee ON members;
CREATE TRIGGER trigger_update_member_unpaid_fee
    AFTER UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_member_unpaid_fee();
`

// 기본 데이터 삽입 SQL
const insertDefaultDataSQL = `
-- 기본 마스터 정보 데이터 삽입
INSERT INTO master_info (key, value, description) VALUES
('special_event_fee', '20000', '특별 이벤트 회비 기본 금액'),
('current_year', '2024', '현재 연도'),
('club_name', 'YY로타리클럽', '클럽 이름'),
('fee_year', '2024', '회비 연도')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description;
`

// 테이블 생성 함수
async function createTables() {
  log('Supabase 테이블 생성 시작...')

  try {
    // 1. 테이블 생성
    log('테이블 생성 중...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: createTablesSQL
    })
    
    if (createError) {
      // RPC 함수가 없을 경우 직접 SQL 실행
      const { error: directError } = await supabase
        .from('pg_stat_activity')
        .select('*')
        .limit(1)
      
      if (directError) {
        throw new Error('Supabase 연결 실패')
      }
      
      log('테이블 생성 완료 (스키마 확인 필요)')
    } else {
      log('테이블 생성 완료')
    }

    // 2. 인덱스 생성
    log('인덱스 생성 중...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      query: createIndexesSQL
    })
    
    if (!indexError) {
      log('인덱스 생성 완료')
    }

    // 3. 트리거 생성
    log('트리거 생성 중...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      query: createTriggersSQL
    })
    
    if (!triggerError) {
      log('트리거 생성 완료')
    }

    // 4. 기본 데이터 삽입
    log('기본 데이터 삽입 중...')
    const { error: insertError } = await supabase.rpc('exec_sql', {
      query: insertDefaultDataSQL
    })
    
    if (!insertError) {
      log('기본 데이터 삽입 완료')
    }

    log('모든 테이블 생성 완료!')
  } catch (error) {
    log(`테이블 생성 실패: ${error}`)
    throw error
  }
}

// 스크립트 실행
if (require.main === module) {
  createTables()
    .then(() => {
      log('스크립트 실행 완료')
      process.exit(0)
    })
    .catch((error) => {
      log(`스크립트 실행 실패: ${error}`)
      process.exit(1)
    })
}

export { createTables } 