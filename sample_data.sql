-- ====================================================================
-- 스마트 국방 당직·근무 일정 관리 시스템 (Smart Duty Guard Manager)
-- Supabase 데이터베이스 생성 및 초기화 통합 SQL 스크립트
-- ====================================================================

-- 1. 기존 테이블 정리 (필요 시 주석 해제하여 초기화)
DROP TABLE IF EXISTS duty_assignments CASCADE;
DROP TABLE IF EXISTS duty_schedules CASCADE;
DROP TABLE IF EXISTS duty_types CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. 사용자 및 관리자 계정 테이블 (users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    pin_code VARCHAR(20) DEFAULT '1234', -- 관리자 전환용 PIN 번호
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 근무자 정보 테이블 (personnel)
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    rank VARCHAR(30) NOT NULL, -- 이병, 일병, 상병, 병장, 하사, 중사, 상사, 소위, 중위, 대위 등
    service_number VARCHAR(50) UNIQUE NOT NULL, -- 군번 (고유값)
    unit VARCHAR(100) NOT NULL, -- 소속 (예: 본부중대, 1중대, 2중대, 포대)
    phone VARCHAR(30), -- 비상연락처
    is_active BOOLEAN DEFAULT TRUE, -- 현재 복무/근무 투입 가능 여부
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 근무 종류 테이블 (duty_types)
CREATE TABLE duty_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- 예: 당직사령, 당직사관, 당직병, 불침번 1초소
    category VARCHAR(50) NOT NULL, -- 간부당직, 병당직, 경계근무, 특수근무
    required_count INT DEFAULT 1 CHECK (required_count > 0), -- 필요 인원수
    start_time VARCHAR(10) NOT NULL, -- 시작 시간 (예: '08:30', '22:00')
    end_time VARCHAR(10) NOT NULL,   -- 종료 시간 (예: '익일 08:30', '00:00')
    color VARCHAR(20) DEFAULT '#2563EB', -- UI 뱃지 색상 코드
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 근무 일정 테이블 (duty_schedules)
CREATE TABLE duty_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_date DATE NOT NULL, -- 근무 일자 (YYYY-MM-DD)
    duty_type_id UUID NOT NULL REFERENCES duty_types(id) ON DELETE CASCADE,
    notes TEXT, -- 특이사항 또는 지시사항
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 근무 배정 내역 테이블 (duty_assignments)
CREATE TABLE duty_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES duty_schedules(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    role_detail VARCHAR(50) DEFAULT '정', -- 정/부, 1번초, 통신 등 세부 역할
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_schedule_personnel UNIQUE (schedule_id, personnel_id) -- 동일 일정 내 중복 배정 방지
);

-- 7. 빠른 검색을 위한 인덱스 생성
CREATE INDEX idx_schedules_date ON duty_schedules(duty_date);
CREATE INDEX idx_assignments_schedule ON duty_assignments(schedule_id);
CREATE INDEX idx_assignments_personnel ON duty_assignments(personnel_id);
CREATE INDEX idx_personnel_service_num ON personnel(service_number);

-- 8. Row Level Security (RLS) 정책 설정 (웹 프론트엔드 연동용)
-- 누구나 조회 및 작성 가능하도록 익명(anon) 키에 대한 전체 접근 권한 허용
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read all" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anon write all" ON users FOR ALL USING (true);

CREATE POLICY "Allow anon read all" ON personnel FOR SELECT USING (true);
CREATE POLICY "Allow anon write all" ON personnel FOR ALL USING (true);

CREATE POLICY "Allow anon read all" ON duty_types FOR SELECT USING (true);
CREATE POLICY "Allow anon write all" ON duty_types FOR ALL USING (true);

CREATE POLICY "Allow anon read all" ON duty_schedules FOR SELECT USING (true);
CREATE POLICY "Allow anon write all" ON duty_schedules FOR ALL USING (true);

CREATE POLICY "Allow anon read all" ON duty_assignments FOR SELECT USING (true);
CREATE POLICY "Allow anon write all" ON duty_assignments FOR ALL USING (true);

-- 9. 실무형 샘플 데이터 입력 (초기 테스트 및 시연용)
-- (1) 기본 관리자 및 사용자
INSERT INTO users (username, name, role, pin_code) VALUES
('admin', '당직작전관', 'admin', '1234'),
('soldier1', '김철수', 'user', '0000');

-- (2) 근무자 기본 데이터 (간부 및 병사)
INSERT INTO personnel (name, rank, service_number, unit, phone) VALUES
('김태희', '대위', '19-100234', '본부포대', '010-1234-5678'),
('박상준', '중위', '21-105678', '1포대', '010-2345-6789'),
('이승원', '상사', '15-103412', '본부포대', '010-3456-7890'),
('정민우', '중사', '18-107890', '2포대', '010-4567-8901'),
('최현우', '병장', '24-76012345', '본부포대', '010-5678-9012'),
('강동원', '상병', '24-76023456', '1포대', '010-6789-0123'),
('윤시윤', '일병', '25-76034567', '2포대', '010-7890-1234'),
('배영민', '병장', '24-76099999', '본부포대', '010-9999-8888'),
('한지훈', '상병', '24-76056789', '본부포대', '010-8901-2345'),
('송중기', '일병', '25-76067890', '1포대', '010-9012-3456');

-- (3) 근무 종류 기본 데이터
INSERT INTO duty_types (name, category, required_count, start_time, end_time, color, description) VALUES
('당직사령', '간부당직', 1, '08:30', '익일 08:30', '#DC2626', '부대 총괄 지휘 및 야간 비상대기'),
('당직사관', '간부당직', 1, '08:30', '익일 08:30', '#2563EB', '중대 인원 점검, 총기 관리 및 일과 진행'),
('당직병', '병당직', 1, '08:30', '익일 08:30', '#059669', '당직사관 보좌, 지휘통제실 기록 및 상황 보고'),
('불침번 1초소', '경계근무', 1, '22:00', '24:00', '#7C3AED', '야간 생활관 내부 순찰 및 인원 이상유무 확인'),
('불침번 2초소', '경계근무', 1, '00:00', '02:00', '#D97706', '야간 생활관 내부 순찰 및 화재 예방 점검'),
('CCTV 감시병', '특수근무', 1, '18:00', '22:00', '#0891B2', '외곽 울타리 및 주요 시설 CCTV 집중 모니터링');

-- (4) 오늘과 내일의 근무 일정 및 배정 샘플 (CURRENT_DATE 기준)
DO $$
DECLARE
    v_type_cmd UUID;
    v_type_off UUID;
    v_type_sol UUID;
    v_type_guard1 UUID;
    
    v_p_kim UUID;
    v_p_park UUID;
    v_p_bae UUID;
    v_p_kang UUID;
    
    v_sch_today_cmd UUID;
    v_sch_today_off UUID;
    v_sch_today_sol UUID;
    v_sch_today_g1 UUID;
BEGIN
    SELECT id INTO v_type_cmd FROM duty_types WHERE name = '당직사령' LIMIT 1;
    SELECT id INTO v_type_off FROM duty_types WHERE name = '당직사관' LIMIT 1;
    SELECT id INTO v_type_sol FROM duty_types WHERE name = '당직병' LIMIT 1;
    SELECT id INTO v_type_guard1 FROM duty_types WHERE name = '불침번 1초소' LIMIT 1;

    SELECT id INTO v_p_kim FROM personnel WHERE name = '김태희' LIMIT 1;
    SELECT id INTO v_p_park FROM personnel WHERE name = '박상준' LIMIT 1;
    SELECT id INTO v_p_bae FROM personnel WHERE name = '배영민' LIMIT 1;
    SELECT id INTO v_p_kang FROM personnel WHERE name = '강동원' LIMIT 1;

    -- 오늘 당직 일정 등록
    INSERT INTO duty_schedules (duty_date, duty_type_id, notes)
    VALUES (CURRENT_DATE, v_type_cmd, '기상악화 대비 영내 순찰 강화') RETURNING id INTO v_sch_today_cmd;

    INSERT INTO duty_schedules (duty_date, duty_type_id, notes)
    VALUES (CURRENT_DATE, v_type_off, '저녁 점호 및 총기 전수 점검') RETURNING id INTO v_sch_today_off;

    INSERT INTO duty_schedules (duty_date, duty_type_id, notes)
    VALUES (CURRENT_DATE, v_type_sol, '보고체계 유지 및 상황일지 기록') RETURNING id INTO v_sch_today_sol;

    INSERT INTO duty_schedules (duty_date, duty_type_id, notes)
    VALUES (CURRENT_DATE, v_type_guard1, '생활관 1층 순찰') RETURNING id INTO v_sch_today_g1;

    -- 오늘 근무자 배정
    INSERT INTO duty_assignments (schedule_id, personnel_id, role_detail) VALUES
    (v_sch_today_cmd, v_p_kim, '정'),
    (v_sch_today_off, v_p_park, '정'),
    (v_sch_today_sol, v_p_bae, '정'),
    (v_sch_today_g1, v_p_kang, '1번초');
END $$;
