-- Supabase 데이터베이스 테이블 생성 스크립트
-- 기존 Notion 데이터베이스 구조를 기반으로 테이블 생성

-- 1. 회원 테이블 (members)
CREATE TABLE members (
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
CREATE TABLE fees (
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
CREATE TABLE service_fees (
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
CREATE TABLE special_events (
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
CREATE TABLE special_fees (
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
CREATE TABLE donations (
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
CREATE TABLE master_info (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 8. 공지사항 테이블 (notices)
CREATE TABLE notices (
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
CREATE TABLE transactions (
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

-- 인덱스 생성
CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_fees_member_id ON fees(member_id);
CREATE INDEX idx_fees_date ON fees(date);
CREATE INDEX idx_service_fees_member_id ON service_fees(member_id);
CREATE INDEX idx_service_fees_date ON service_fees(date);
CREATE INDEX idx_special_events_member_id ON special_events(member_id);
CREATE INDEX idx_special_events_date ON special_events(date);
CREATE INDEX idx_special_fees_member_id ON special_fees(member_id);
CREATE INDEX idx_special_fees_date ON special_fees(date);
CREATE INDEX idx_donations_member_id ON donations(member_id);
CREATE INDEX idx_donations_date ON donations(date);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_related_member_id ON transactions(related_member_id);

-- RLS (Row Level Security) 설정
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (모든 사용자가 읽기 가능)
CREATE POLICY "Enable read access for all users" ON members FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON fees FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON service_fees FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON special_events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON special_fees FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON donations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON master_info FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON notices FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON transactions FOR SELECT USING (true);

-- 삽입, 수정, 삭제 정책 (추후 인증 시스템 구현 시 수정 필요)
CREATE POLICY "Enable all access for authenticated users" ON members FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON fees FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON service_fees FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON special_events FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON special_fees FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON donations FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON master_info FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON notices FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON transactions FOR ALL USING (true);

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
CREATE TRIGGER trigger_update_member_unpaid_fee
    AFTER UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_member_unpaid_fee();

-- 기본 마스터 정보 데이터 삽입
INSERT INTO master_info (key, value, description) VALUES
('special_event_fee', '20000', '특별 이벤트 회비 기본 금액'),
('current_year', '2024', '현재 연도'),
('club_name', 'YY로타리클럽', '클럽 이름'),
('fee_year', '2024', '회비 연도'); 