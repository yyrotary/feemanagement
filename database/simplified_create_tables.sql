-- Supabase 데이터베이스 테이블 생성 스크립트 (간단 버전)
-- 먼저 테이블만 생성하고 나중에 인덱스와 트리거 추가

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

-- 기본 마스터 정보 데이터 삽입
INSERT INTO master_info (key, value, description) VALUES
('special_event_fee', '20000', '특별 이벤트 회비 기본 금액'),
('current_year', '2024', '현재 연도'),
('club_name', 'YY로타리클럽', '클럽 이름'),
('fee_year', '2024', '회비 연도')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description; 