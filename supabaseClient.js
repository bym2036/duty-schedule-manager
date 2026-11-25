// ====================================================================
// 스마트 국방 당직·근무 일정 관리 시스템 - Supabase 클라이언트 모듈
// ====================================================================

// 기본 Supabase 설정 (사용자가 설정 모달에서 입력하거나 아래에 직접 적을 수 있음)
const STORAGE_KEY_URL = 'smart_duty_supabase_url';
const STORAGE_KEY_KEY = 'smart_duty_supabase_key';

let supabaseClient = null;

// Supabase 클라이언트 초기화 함수
function initSupabase() {
    const url = localStorage.getItem(STORAGE_KEY_URL) || '';
    const key = localStorage.getItem(STORAGE_KEY_KEY) || '';

    if (url && key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(url, key);
            console.log('✅ Supabase 클라이언트 연결 성공:', url);
            return true;
        } catch (error) {
            console.error('❌ Supabase 초기화 오류:', error);
            supabaseClient = null;
            return false;
        }
    }
    supabaseClient = null;
    return false;
}

// 설정 저장
function saveSupabaseConfig(url, key) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    return initSupabase();
}

// 설정 가져오기
function getSupabaseConfig() {
    return {
        url: localStorage.getItem(STORAGE_KEY_URL) || '',
        key: localStorage.getItem(STORAGE_KEY_KEY) || ''
    };
}

// 설정 초기화
function clearSupabaseConfig() {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    supabaseClient = null;
}

// 연결 상태 확인
function isSupabaseConnected() {
    return supabaseClient !== null;
}

// ====================================================================
// 로컬 모드용 Mock 데이터 (Supabase 연결 전에도 완벽히 작동하도록 지원)
// ====================================================================
const LOCAL_STORAGE_DB_KEY = 'smart_duty_mock_db';

function getLocalDB() {
    const data = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(e);
        }
    }
    // 기본 초기 데이터
    const today = new Date().toISOString().split('T')[0];
    const initial = {
        personnel: [
            { id: 'p1', name: '김태희', rank: '대위', service_number: '19-100234', unit: '본부포대', phone: '010-1234-5678', is_active: true },
            { id: 'p2', name: '박상준', rank: '중위', service_number: '21-105678', unit: '1포대', phone: '010-2345-6789', is_active: true },
            { id: 'p3', name: '이승원', rank: '상사', service_number: '15-103412', unit: '본부포대', phone: '010-3456-7890', is_active: true },
            { id: 'p4', name: '정민우', rank: '중사', service_number: '18-107890', unit: '2포대', phone: '010-4567-8901', is_active: true },
            { id: 'p5', name: '이진우', rank: '병장', service_number: '24-76099999', unit: '본부포대', phone: '010-9999-8888', is_active: true },
            { id: 'p6', name: '최현우', rank: '병장', service_number: '24-76012345', unit: '본부포대', phone: '010-5678-9012', is_active: true },
            { id: 'p7', name: '강동원', rank: '상병', service_number: '24-76023456', unit: '1포대', phone: '010-6789-0123', is_active: true },
            { id: 'p8', name: '윤시윤', rank: '일병', service_number: '25-76034567', unit: '2포대', phone: '010-7890-1234', is_active: true }
        ],
        duty_types: [
            { id: 'dt1', name: '당직사령', category: '간부당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#DC2626', description: '부대 총괄 지휘 및 야간 비상대기' },
            { id: 'dt2', name: '당직사관', category: '간부당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#2563EB', description: '중대 인원 점검, 총기 관리 및 일과 진행' },
            { id: 'dt3', name: '당직병', category: '병당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#059669', description: '당직사관 보좌, 지휘통제실 기록 및 상황 보고' },
            { id: 'dt4', name: '불침번 1초소', category: '경계근무', 1: 1, start_time: '22:00', end_time: '24:00', color: '#7C3AED', description: '생활관 1층 순찰 및 인원 점검' },
            { id: 'dt5', name: '불침번 2초소', category: '경계근무', 1: 1, start_time: '00:00', end_time: '02:00', color: '#D97706', description: '생활관 2층 순찰 및 화재 예방' }
        ],
        duty_schedules: [
            { id: 'sch1', duty_date: today, duty_type_id: 'dt1', notes: '기상악화 대비 영내 순찰 강화', status: 'scheduled' },
            { id: 'sch2', duty_date: today, duty_type_id: 'dt2', notes: '저녁 점호 및 총기 전수 점검', status: 'scheduled' },
            { id: 'sch3', duty_date: today, duty_type_id: 'dt3', notes: '상황일지 기록 철저', status: 'scheduled' },
            { id: 'sch4', duty_date: today, duty_type_id: 'dt4', notes: '소등 후 생활관 순찰', status: 'scheduled' }
        ],
        duty_assignments: [
            { id: 'as1', schedule_id: 'sch1', personnel_id: 'p1', role_detail: '정' },
            { id: 'as2', schedule_id: 'sch2', personnel_id: 'p2', role_detail: '정' },
            { id: 'as3', schedule_id: 'sch3', personnel_id: 'p5', role_detail: '정' },
            { id: 'as4', schedule_id: 'sch4', personnel_id: 'p7', role_detail: '1번초' }
        ]
    };
    saveLocalDB(initial);
    return initial;
}

function saveLocalDB(data) {
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(data));
}

// ====================================================================
// 데이터 CRUD API 통합 함수 (Supabase 우선, 연결 없으면 Local DB)
// ====================================================================

// 1. 근무자 목록 가져오기
async function dbGetPersonnel() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('personnel')
            .select('*')
            .order('rank', { ascending: true })
            .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    }
    const db = getLocalDB();
    return db.personnel;
}

// 2. 근무자 추가/수정
async function dbSavePersonnel(personnelData) {
    if (supabaseClient) {
        if (personnelData.id) {
            const { data, error } = await supabaseClient
                .from('personnel')
                .update(personnelData)
                .eq('id', personnelData.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await supabaseClient
                .from('personnel')
                .insert([personnelData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }
    const db = getLocalDB();
    if (personnelData.id) {
        const idx = db.personnel.findIndex(p => p.id === personnelData.id);
        if (idx !== -1) db.personnel[idx] = { ...db.personnel[idx], ...personnelData };
    } else {
        const newP = { ...personnelData, id: 'p_' + Date.now(), is_active: true };
        db.personnel.push(newP);
    }
    saveLocalDB(db);
    return personnelData;
}

// 3. 근무자 삭제
async function dbDeletePersonnel(id) {
    if (supabaseClient) {
        const { error } = await supabaseClient
            .from('personnel')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
    const db = getLocalDB();
    db.personnel = db.personnel.filter(p => p.id !== id);
    db.duty_assignments = db.duty_assignments.filter(a => a.personnel_id !== id);
    saveLocalDB(db);
    return true;
}

// 4. 근무 종류 목록 가져오기
async function dbGetDutyTypes() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('duty_types')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    }
    const db = getLocalDB();
    return db.duty_types;
}

// 5. 근무 종류 추가/수정
async function dbSaveDutyType(dutyTypeData) {
    if (supabaseClient) {
        if (dutyTypeData.id) {
            const { data, error } = await supabaseClient
                .from('duty_types')
                .update(dutyTypeData)
                .eq('id', dutyTypeData.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await supabaseClient
                .from('duty_types')
                .insert([dutyTypeData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }
    const db = getLocalDB();
    if (dutyTypeData.id) {
        const idx = db.duty_types.findIndex(d => d.id === dutyTypeData.id);
        if (idx !== -1) db.duty_types[idx] = { ...db.duty_types[idx], ...dutyTypeData };
    } else {
        const newDt = { ...dutyTypeData, id: 'dt_' + Date.now() };
        db.duty_types.push(newDt);
    }
    saveLocalDB(db);
    return dutyTypeData;
}

// 6. 전체 일정 및 배정 내역 조회 (조인 연동)
async function dbGetFullDutyData() {
    if (supabaseClient) {
        // 1) 일정 조회
        const { data: schedules, error: errSch } = await supabaseClient
            .from('duty_schedules')
            .select(`
                id,
                duty_date,
                duty_type_id,
                notes,
                status,
                duty_types (id, name, category, color, start_time, end_time)
            `)
            .order('duty_date', { ascending: true });
        if (errSch) throw errSch;

        // 2) 배정 내역 조회
        const { data: assignments, error: errAs } = await supabaseClient
            .from('duty_assignments')
            .select(`
                id,
                schedule_id,
                personnel_id,
                role_detail,
                personnel (id, name, rank, service_number, unit, phone)
            `);
        if (errAs) throw errAs;

        // 조인하여 통합 객체 생성
        const result = schedules.map(sch => {
            const asList = assignments.filter(a => a.schedule_id === sch.id);
            return {
                ...sch,
                duty_type: sch.duty_types,
                assignments: asList.map(a => ({
                    assignment_id: a.id,
                    role_detail: a.role_detail,
                    person: a.personnel
                }))
            };
        });
        return result;
    }

    // 로컬 Mock DB 매핑
    const db = getLocalDB();
    return db.duty_schedules.map(sch => {
        const type = db.duty_types.find(t => t.id === sch.duty_type_id);
        const asList = db.duty_assignments
            .filter(a => a.schedule_id === sch.id)
            .map(a => {
                const person = db.personnel.find(p => p.id === a.personnel_id);
                return {
                    assignment_id: a.id,
                    role_detail: a.role_detail,
                    person: person
                };
            });

        return {
            ...sch,
            duty_type: type,
            assignments: asList
        };
    });
}

// 7. 근무 배정 등록 (일정 생성 + 근무자 배정 원스톱 처리)
async function dbAddAssignment({ dutyDate, dutyTypeId, personnelId, roleDetail, notes }) {
    if (supabaseClient) {
        // 기존 해당 일자 + 해당 근무 종류의 일정이 있는지 확인
        const { data: existingSchedules, error: findErr } = await supabaseClient
            .from('duty_schedules')
            .select('id')
            .eq('duty_date', dutyDate)
            .eq('duty_type_id', dutyTypeId)
            .limit(1);

        if (findErr) throw findErr;

        let scheduleId = null;
        if (existingSchedules && existingSchedules.length > 0) {
            scheduleId = existingSchedules[0].id;
        } else {
            // 새 일정 생성
            const { data: newSch, error: schErr } = await supabaseClient
                .from('duty_schedules')
                .insert([{
                    duty_date: dutyDate,
                    duty_type_id: dutyTypeId,
                    notes: notes || '',
                    status: 'scheduled'
                }])
                .select();
            if (schErr) throw schErr;
            scheduleId = newSch[0].id;
        }

        // 근무자 배정 내역 등록
        const { data: newAs, error: asErr } = await supabaseClient
            .from('duty_assignments')
            .insert([{
                schedule_id: scheduleId,
                personnel_id: personnelId,
                role_detail: roleDetail || '정'
            }])
            .select();
        if (asErr) throw asErr;

        return { scheduleId, assignmentId: newAs[0].id };
    }

    // 로컬 모드
    const db = getLocalDB();
    let sch = db.duty_schedules.find(s => s.duty_date === dutyDate && s.duty_type_id === dutyTypeId);
    if (!sch) {
        sch = {
            id: 'sch_' + Date.now(),
            duty_date: dutyDate,
            duty_type_id: dutyTypeId,
            notes: notes || '',
            status: 'scheduled'
        };
        db.duty_schedules.push(sch);
    }
    const newAs = {
        id: 'as_' + Date.now(),
        schedule_id: sch.id,
        personnel_id: personnelId,
        role_detail: roleDetail || '정'
    };
    db.duty_assignments.push(newAs);
    saveLocalDB(db);
    return { scheduleId: sch.id, assignmentId: newAs.id };
}

// 8. 근무 배정 삭제
async function dbDeleteAssignment(assignmentId, scheduleId) {
    if (supabaseClient) {
        // 배정 내역 삭제
        const { error: asErr } = await supabaseClient
            .from('duty_assignments')
            .delete()
            .eq('id', assignmentId);
        if (asErr) throw asErr;

        // 만약 해당 일정에 남은 배정자가 없다면 빈 일정 레코드도 함께 정리
        const { data: remaining, error: checkErr } = await supabaseClient
            .from('duty_assignments')
            .select('id')
            .eq('schedule_id', scheduleId);

        if (!checkErr && remaining && remaining.length === 0) {
            await supabaseClient.from('duty_schedules').delete().eq('id', scheduleId);
        }
        return true;
    }

    const db = getLocalDB();
    db.duty_assignments = db.duty_assignments.filter(a => a.id !== assignmentId);
    const hasMore = db.duty_assignments.some(a => a.schedule_id === scheduleId);
    if (!hasMore) {
        db.duty_schedules = db.duty_schedules.filter(s => s.id !== scheduleId);
    }
    saveLocalDB(db);
    return true;
}

// 9. 원클릭 샘플 데이터 세팅 (Supabase DB에 한 번에 넣기)
async function dbSeedData() {
    if (!supabaseClient) {
        // 로컬 초기화
        localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
        return getLocalDB();
    }

    // Supabase에 샘플 인원 및 근무 종류 등록
    const samplePersonnel = [
        { name: '김태희', rank: '대위', service_number: '19-100234', unit: '본부포대', phone: '010-1234-5678' },
        { name: '박상준', rank: '중위', service_number: '21-105678', unit: '1포대', phone: '010-2345-6789' },
        { name: '이승원', rank: '상사', service_number: '15-103412', unit: '본부포대', phone: '010-3456-7890' },
        { name: '정민우', rank: '중사', service_number: '18-107890', unit: '2포대', phone: '010-4567-8901' },
        { name: '이진우', rank: '병장', service_number: '24-76099999', unit: '본부포대', phone: '010-9999-8888' },
        { name: '최현우', rank: '병장', service_number: '24-76012345', unit: '본부포대', phone: '010-5678-9012' },
        { name: '강동원', rank: '상병', service_number: '24-76023456', unit: '1포대', phone: '010-6789-0123' },
        { name: '윤시윤', rank: '일병', service_number: '25-76034567', unit: '2포대', phone: '010-7890-1234' }
    ];

    const sampleTypes = [
        { name: '당직사령', category: '간부당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#DC2626', description: '부대 총괄 지휘 및 야간 비상대기' },
        { name: '당직사관', category: '간부당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#2563EB', description: '중대 인원 점검, 총기 관리 및 일과 진행' },
        { name: '당직병', category: '병당직', required_count: 1, start_time: '08:30', end_time: '익일 08:30', color: '#059669', description: '당직사관 보좌, 지휘통제실 기록 및 상황 보고' },
        { name: '불침번 1초소', category: '경계근무', required_count: 1, start_time: '22:00', end_time: '24:00', color: '#7C3AED', description: '생활관 1층 순찰 및 인원 점검' },
        { name: '불침번 2초소', category: '경계근무', required_count: 1, start_time: '00:00', end_time: '02:00', color: '#D97706', description: '생활관 2층 순찰 및 화재 예방' }
    ];

    // 1) 근무자 및 근무종류 등록
    const { data: pData } = await supabaseClient.from('personnel').upsert(samplePersonnel, { onConflict: 'service_number' }).select();
    const { data: dtData } = await supabaseClient.from('duty_types').upsert(sampleTypes, { onConflict: 'name' }).select();

    // 2) 오늘 날짜 기준 샘플 당직 일정 및 배정 등록
    const todayStr = new Date().toISOString().split('T')[0];
    if (pData && dtData && pData.length >= 4 && dtData.length >= 4) {
        const cmdType = dtData.find(t => t.name === '당직사령') || dtData[0];
        const offType = dtData.find(t => t.name === '당직사관') || dtData[1];
        const solType = dtData.find(t => t.name === '당직병') || dtData[2];
        const guardType = dtData.find(t => t.name.includes('불침번')) || dtData[3];

        const pOfficer1 = pData.find(p => p.rank === '대위') || pData[0];
        const pOfficer2 = pData.find(p => p.rank === '중위') || pData[1];
        const pSoldier = pData.find(p => p.name === '이진우') || pData[4];
        const pGuard = pData.find(p => p.rank === '상병') || pData[6];

        await dbAddAssignment({ dutyDate: todayStr, dutyTypeId: cmdType.id, personnelId: pOfficer1.id, roleDetail: '정', notes: '기상악화 대비 영내 순찰 철저' });
        await dbAddAssignment({ dutyDate: todayStr, dutyTypeId: offType.id, personnelId: pOfficer2.id, roleDetail: '정', notes: '저녁 점호 및 총기 전수 점검' });
        await dbAddAssignment({ dutyDate: todayStr, dutyTypeId: solType.id, personnelId: pSoldier.id, roleDetail: '정', notes: '상황일지 기록 철저' });
        await dbAddAssignment({ dutyDate: todayStr, dutyTypeId: guardType.id, personnelId: pGuard.id, roleDetail: '1번초', notes: '생활관 순찰' });
    }

    return true;
}

// 초기 로드시 자동 호출
initSupabase();
