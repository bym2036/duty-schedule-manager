// ====================================================================
// 스마트 국방 당직·근무 일정 관리 시스템 - 메인 애플리케이션 스크립트
// ====================================================================

// 전역 상태
const state = {
    isAdmin: false,
    currentDate: new Date(),
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(), // 0 ~ 11
    personnel: [],
    dutyTypes: [],
    schedules: [],
    highlightPersonnelId: '',
    selectedMyPersonnelId: ''
};

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // Lucide 아이콘 초기화
    lucide.createIcons();

    // 실시간 시계 시작
    startLiveClock();

    // 이벤트 리스너 등록
    setupEventListeners();

    // Supabase 연결 상태 갱신
    updateSupabaseStatusUI();

    // 초기 데이터 로딩
    await loadAllData();
});

// --------------------------------------------------------------------
// 1. 실시간 시계
// --------------------------------------------------------------------
function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const update = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[now.getDay()];
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        if (clockEl) {
            clockEl.textContent = `${year}-${month}-${day} (${dayName}) ${hours}:${mins}:${secs}`;
        }
    };
    update();
    setInterval(update, 1000);
}

// --------------------------------------------------------------------
// 2. 전체 데이터 로딩 및 동기화
// --------------------------------------------------------------------
// --------------------------------------------------------------------
// 2. 전체 데이터 로딩 및 동기화 (오류 발생 시 로컬 데이터 자동 폴백)
// --------------------------------------------------------------------
async function loadAllData() {
    let personnel = [];
    let dutyTypes = [];
    let schedules = [];

    try {
        [personnel, dutyTypes, schedules] = await Promise.all([
            dbGetPersonnel(),
            dbGetDutyTypes(),
            dbGetFullDutyData()
        ]);
    } catch (dbErr) {
        console.warn('DB 조회 오류 발생, 로컬 안전 데이터로 복구합니다:', dbErr);
        // Supabase 조회 실패 시 빈 화면으로 멈추지 않도록 로컬 데이터로 안전 복구
        const localDb = getLocalDB();
        personnel = localDb.personnel || [];
        dutyTypes = localDb.duty_types || [];
        schedules = (localDb.duty_schedules || []).map(sch => {
            const type = localDb.duty_types.find(t => t.id === sch.duty_type_id);
            const asList = (localDb.duty_assignments || [])
                .filter(a => a.schedule_id === sch.id)
                .map(a => ({
                    assignment_id: a.id,
                    role_detail: a.role_detail,
                    person: localDb.personnel.find(p => p.id === a.personnel_id)
                }));
            return { ...sch, duty_type: type, assignments: asList };
        });

        if (isSupabaseConnected()) {
            console.error('Supabase 연동 상세 오류:', dbErr.message);
        }
    }

    state.personnel = personnel || [];
    state.dutyTypes = dutyTypes || [];
    state.schedules = schedules || [];

    // UI 전반 갱신 (무조건 실행되어 화면이 멈추지 않음)
    updateDashboardStats();
    populateDropdowns();
    renderCalendar();
    renderListView();
    renderMyDutyView();
    renderManagePersonnelTable();
    renderManageDutyTypesTable();
}

// --------------------------------------------------------------------
// 3. 상단 대시보드 요약 통계 갱신
// --------------------------------------------------------------------
function updateDashboardStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySchedules = state.schedules.filter(s => s.duty_date === todayStr);

    // 간부 당직자 (당직사령, 당직사관)
    const officerDuties = todaySchedules.filter(s => 
        s.duty_type?.category === '간부당직' || 
        s.duty_type?.name?.includes('사령') || 
        s.duty_type?.name?.includes('사관')
    );
    const officerNames = officerDuties.flatMap(s => s.assignments.map(a => `${s.duty_type.name}: ${a.person?.rank || ''} ${a.person?.name || '미배정'}`)).join(' | ');
    document.getElementById('statTodayOfficer').textContent = officerNames || '배정 내역 없음';

    // 병 당직자 / 불침번
    const soldierDuties = todaySchedules.filter(s => 
        s.duty_type?.category !== '간부당직' && 
        !s.duty_type?.name?.includes('사령') && 
        !s.duty_type?.name?.includes('사관')
    );
    const soldierNames = soldierDuties.flatMap(s => s.assignments.map(a => `${s.duty_type.name}: ${a.person?.rank || ''} ${a.person?.name || '미배정'}`)).join(' | ');
    document.getElementById('statTodaySoldier').textContent = soldierNames || '배정 내역 없음';

    // 이번 달 총 일정 수
    const ymPrefix = `${state.viewYear}-${String(state.viewMonth + 1).padStart(2, '0')}`;
    const monthCount = state.schedules.filter(s => s.duty_date.startsWith(ymPrefix)).reduce((acc, cur) => acc + (cur.assignments?.length || 0), 0);
    document.getElementById('statMonthCount').textContent = `${monthCount}건`;

    // 총 인원 수
    document.getElementById('statPersonnelCount').textContent = `${state.personnel.length}명`;
}

// --------------------------------------------------------------------
// 4. 셀렉트 박스 옵션 채우기
// --------------------------------------------------------------------
function populateDropdowns() {
    // 1) 캘린더 상단 인원 강조 셀렉트
    const selHighlight = document.getElementById('selectHighlightUser');
    const currentHighlightVal = selHighlight.value;
    selHighlight.innerHTML = '<option value="">전체 보기 (강조 없음)</option>';
    state.personnel.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `[${p.rank}] ${p.name} (${p.unit})`;
        selHighlight.appendChild(opt);
    });
    selHighlight.value = currentHighlightVal;

    // 2) 내 근무 간편 조회 셀렉트
    const selMy = document.getElementById('selectMyPersonnel');
    const currentMyVal = selMy.value;
    selMy.innerHTML = '<option value="">-- 성함을 선택해주세요 --</option>';
    state.personnel.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `[${p.rank}] ${p.name} (${p.service_number})`;
        selMy.appendChild(opt);
    });
    selMy.value = currentMyVal;

    // 3) 배정 모달 - 근무 종류 셀렉트
    const selDutyType = document.getElementById('inputDutyType');
    selDutyType.innerHTML = '<option value="">-- 근무 종류를 선택하세요 --</option>';
    state.dutyTypes.forEach(dt => {
        const opt = document.createElement('option');
        opt.value = dt.id;
        opt.textContent = `[${dt.category}] ${dt.name} (${dt.start_time} ~ ${dt.end_time})`;
        selDutyType.appendChild(opt);
    });

    // 4) 배정 모달 - 근무자 셀렉트
    const selPersonnel = document.getElementById('inputPersonnel');
    selPersonnel.innerHTML = '<option value="">-- 근무자를 선택하세요 --</option>';
    state.personnel.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `[${p.rank}] ${p.name} - ${p.unit} (${p.service_number})`;
        selPersonnel.appendChild(opt);
    });

    // 5) 리스트 뷰 근무 종류 필터
    const filterType = document.getElementById('filterDutyType');
    const currentFilterVal = filterType.value;
    filterType.innerHTML = '<option value="">모든 근무 종류</option>';
    state.dutyTypes.forEach(dt => {
        const opt = document.createElement('option');
        opt.value = dt.id;
        opt.textContent = dt.name;
        filterType.appendChild(opt);
    });
    filterType.value = currentFilterVal;
}

// --------------------------------------------------------------------
// 5. 월간 캘린더 렌더링
// --------------------------------------------------------------------
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarMonthTitle');
    const year = state.viewYear;
    const month = state.viewMonth;

    title.textContent = `${year}년 ${month + 1}월`;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay(); // 0(일) ~ 6(토)
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    // 이전 달 날짜 셀
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevMonthLastDate - i;
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerHTML = `<span class="text-xs font-semibold text-slate-400 mb-1">${d}</span>`;
        grid.appendChild(cell);
    }

    // 이번 달 날짜 셀
    for (let day = 1; day <= lastDate; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;

        // 해당 일자의 근무 일정 검색
        const daySchedules = state.schedules.filter(s => s.duty_date === dateStr);

        // 하이라이트 인원 포함 여부
        let isHighlighted = false;
        if (state.highlightPersonnelId) {
            isHighlighted = daySchedules.some(s => s.assignments.some(a => a.person?.id === state.highlightPersonnelId));
        }

        const cell = document.createElement('div');
        cell.className = `calendar-day-cell ${isToday ? 'is-today' : ''} ${isHighlighted ? 'my-duty-highlight' : ''}`;

        // 상단 날짜 숫자 및 배정 버튼
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';
        headerDiv.innerHTML = `
            <span class="text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}">${day}</span>
            ${state.isAdmin ? `<button class="btn-quick-add text-slate-400 hover:text-emerald-600" title="근무 배정 추가"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>` : ''}
        `;
        cell.appendChild(headerDiv);

        // 근무 뱃지 목록 컨테이너
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'flex flex-col gap-1 overflow-y-auto max-h-24';

        daySchedules.forEach(sch => {
            const dt = sch.duty_type || { name: '미정', color: '#64748b' };
            sch.assignments.forEach(as => {
                const badge = document.createElement('div');
                badge.className = 'duty-badge text-white shadow-xs';
                badge.style.backgroundColor = dt.color || '#2563eb';

                const pName = as.person ? `${as.person.rank} ${as.person.name}` : '미배정';
                badge.innerHTML = `
                    <span class="truncate" title="${dt.name} - ${pName}">
                        ${dt.name}: ${pName}
                    </span>
                `;
                badgesContainer.appendChild(badge);
            });
        });

        cell.appendChild(badgesContainer);

        // 클릭 이벤트 (관리자 모드일 경우 해당 날짜 선택하여 모달 오픈)
        cell.addEventListener('click', (e) => {
            if (state.isAdmin) {
                openAssignmentModalWithDate(dateStr);
            }
        });

        grid.appendChild(cell);
    }

    // 다음 달 날짜 채우기 (전체 셀 35 or 42개로 맞춤)
    const totalCells = firstDay + lastDate;
    const remaining = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerHTML = `<span class="text-xs font-semibold text-slate-400 mb-1">${d}</span>`;
        grid.appendChild(cell);
    }

    lucide.createIcons();
}

// --------------------------------------------------------------------
// 6. 일자별 전체 근무표 리스트 렌더링
// --------------------------------------------------------------------
function renderListView() {
    const tbody = document.getElementById('dutyListTbody');
    const searchName = document.getElementById('filterSearchName').value.trim().toLowerCase();
    const filterType = document.getElementById('filterDutyType').value;
    const countEl = document.getElementById('listFilteredCount');

    tbody.innerHTML = '';

    // 배정 내역 플랫화
    let flatList = [];
    state.schedules.forEach(sch => {
        sch.assignments.forEach(as => {
            flatList.push({
                scheduleId: sch.id,
                assignmentId: as.assignment_id,
                dutyDate: sch.duty_date,
                dutyType: sch.duty_type,
                person: as.person,
                roleDetail: as.role_detail,
                notes: sch.notes
            });
        });
    });

    // 필터링 적용
    flatList = flatList.filter(item => {
        if (filterType && item.dutyType?.id !== filterType) return false;
        if (searchName) {
            const matchName = item.person?.name?.toLowerCase().includes(searchName);
            const matchService = item.person?.service_number?.toLowerCase().includes(searchName);
            const matchRank = item.person?.rank?.toLowerCase().includes(searchName);
            if (!matchName && !matchService && !matchRank) return false;
        }
        return true;
    });

    // 날짜 역순 정렬
    flatList.sort((a, b) => b.dutyDate.localeCompare(a.dutyDate));

    countEl.textContent = flatList.length;

    if (flatList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${state.isAdmin ? 7 : 6}" class="py-8 text-center text-slate-400 text-xs">
                    등록된 근무 배정 내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    flatList.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';

        const p = item.person;
        const dt = item.dutyType;

        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-slate-900">${item.dutyDate}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold text-white" style="background-color: ${dt?.color || '#3b82f6'}">
                    ${dt?.name || '근무'}
                </span>
            </td>
            <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${dt?.start_time || '08:30'} ~ ${dt?.end_time || '익일 08:30'}</td>
            <td class="py-3 px-4">
                <div class="font-bold text-slate-900">${p ? `[${p.rank}] ${p.name}` : '<span class="text-red-500">미배정</span>'}</div>
                <div class="text-[11px] text-slate-400">역할: ${item.roleDetail || '정'}</div>
            </td>
            <td class="py-3 px-4 text-slate-500 text-[11px]">
                <div>${p?.unit || '-'}</div>
                <div class="font-mono text-slate-400">${p?.service_number || '-'}</div>
            </td>
            <td class="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">${item.notes || '-'}</td>
            ${state.isAdmin ? `
            <td class="py-3 px-4 text-right admin-only-col">
                <button class="btn-delete-assignment text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" data-assignment-id="${item.assignmentId}" data-schedule-id="${item.scheduleId}" title="배정 취소">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>` : ''}
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// --------------------------------------------------------------------
// 7. 내 근무 간편 조회 뷰 렌더링
// --------------------------------------------------------------------
function renderMyDutyView() {
    const container = document.getElementById('myDutyDetails');
    const selectedId = state.selectedMyPersonnelId;

    if (!selectedId) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-400 text-xs">
                상단 드롭다운에서 본인의 성함을 선택하시면 배정된 근무 일정이 여기에 표시됩니다.
            </div>
        `;
        return;
    }

    const person = state.personnel.find(p => p.id === selectedId);
    if (!person) return;

    // 해당 인원의 배정 내역 추출
    const myDuties = [];
    state.schedules.forEach(sch => {
        const found = sch.assignments.find(a => a.person?.id === selectedId);
        if (found) {
            myDuties.push({
                dutyDate: sch.duty_date,
                dutyType: sch.duty_type,
                roleDetail: found.role_detail,
                notes: sch.notes
            });
        }
    });

    myDuties.sort((a, b) => a.dutyDate.localeCompare(b.dutyDate));

    // 오늘 날짜 기준 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = `
        <!-- 인원 정보 카드 -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    ${person.name.substring(0, 1)}
                </div>
                <div>
                    <h4 class="font-bold text-sm text-slate-900">[${person.rank}] ${person.name}</h4>
                    <p class="text-xs text-slate-500 font-mono">${person.unit} | 군번: ${person.service_number}</p>
                </div>
            </div>
            <div class="text-right">
                <span class="text-xs text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-1 rounded-full">
                    배정된 근무: 총 ${myDuties.length}회
                </span>
            </div>
        </div>
    `;

    if (myDuties.length === 0) {
        html += `
            <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
                현재 배정된 당직 및 경계근무 일정이 없습니다.
            </div>
        `;
    } else {
        html += '<div class="space-y-3">';
        myDuties.forEach(d => {
            const targetDate = new Date(d.dutyDate);
            targetDate.setHours(0, 0, 0, 0);
            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let dDayBadge = '';
            if (diffDays === 0) {
                dDayBadge = '<span class="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-xs animate-pulse">오늘 당직</span>';
            } else if (diffDays > 0) {
                dDayBadge = `<span class="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-xs">D-${diffDays}</span>`;
            } else {
                dDayBadge = `<span class="bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded text-xs">완료됨</span>`;
            }

            html += `
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div class="space-y-1">
                        <div class="flex items-center space-x-2">
                            ${dDayBadge}
                            <span class="font-bold text-sm text-slate-900">${d.dutyDate}</span>
                            <span class="text-xs px-2 py-0.5 rounded text-white font-semibold" style="background-color: ${d.dutyType?.color || '#3b82f6'}">
                                ${d.dutyType?.name || '근무'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-500">
                            근무시간: <span class="font-mono">${d.dutyType?.start_time} ~ ${d.dutyType?.end_time}</span> | 세부역할: <strong>${d.roleDetail || '정'}</strong>
                        </p>
                        ${d.notes ? `<p class="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1">지시사항: ${d.notes}</p>` : ''}
                    </div>
                    <div class="text-slate-400">
                        <i data-lucide="calendar" class="w-5 h-5"></i>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    container.innerHTML = html;
    lucide.createIcons();
}

// --------------------------------------------------------------------
// 8. 관리자 전용 관리 테이블 렌더링
// --------------------------------------------------------------------
function renderManagePersonnelTable() {
    const tbody = document.getElementById('personnelTableBody');
    tbody.innerHTML = '';

    state.personnel.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = `
            <td class="py-2.5 px-4 font-bold text-slate-900">${p.rank}</td>
            <td class="py-2.5 px-4">${p.name}</td>
            <td class="py-2.5 px-4 font-mono text-slate-500">${p.service_number}</td>
            <td class="py-2.5 px-4">${p.unit}</td>
            <td class="py-2.5 px-4 text-slate-500">${p.phone || '-'}</td>
            <td class="py-2.5 px-4 text-right">
                <button class="btn-delete-personnel text-red-500 hover:text-red-700 p-1" data-id="${p.id}" title="근무자 삭제">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderManageDutyTypesTable() {
    const tbody = document.getElementById('dutyTypeTableBody');
    tbody.innerHTML = '';

    state.dutyTypes.forEach(dt => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = `
            <td class="py-2.5 px-4 font-bold text-slate-900">${dt.name}</td>
            <td class="py-2.5 px-4"><span class="px-2 py-0.5 bg-slate-100 rounded text-slate-600">${dt.category}</span></td>
            <td class="py-2.5 px-4 font-mono text-slate-500">${dt.start_time} ~ ${dt.end_time}</td>
            <td class="py-2.5 px-4">
                <span class="inline-block w-4 h-4 rounded-full border border-slate-300" style="background-color: ${dt.color}"></span>
            </td>
            <td class="py-2.5 px-4 text-slate-500">${dt.description || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// --------------------------------------------------------------------
// 9. 이벤트 리스너 설정
// --------------------------------------------------------------------
function setupEventListeners() {
    // 1) 탭 전환
    const tabs = [
        { btn: 'tabBtnCalendar', content: 'tabContentCalendar' },
        { btn: 'tabBtnList', content: 'tabContentList' },
        { btn: 'tabBtnMyDuty', content: 'tabContentMyDuty' },
        { btn: 'tabBtnManage', content: 'tabContentManage' }
    ];

    tabs.forEach(t => {
        const btn = document.getElementById(t.btn);
        if (btn) {
            btn.addEventListener('click', () => {
                tabs.forEach(other => {
                    const otherBtn = document.getElementById(other.btn);
                    const otherContent = document.getElementById(other.content);
                    otherBtn.classList.remove('bg-slate-900', 'text-white');
                    otherBtn.classList.add('text-slate-600', 'hover:bg-slate-100');
                    otherContent.classList.add('hidden');
                });
                btn.classList.add('bg-slate-900', 'text-white');
                btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
                document.getElementById(t.content).classList.remove('hidden');
            });
        }
    });

    // 2) 캘린더 월 이동
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
        state.viewMonth--;
        if (state.viewMonth < 0) {
            state.viewMonth = 11;
            state.viewYear--;
        }
        renderCalendar();
        updateDashboardStats();
    });

    document.getElementById('btnNextMonth').addEventListener('click', () => {
        state.viewMonth++;
        if (state.viewMonth > 11) {
            state.viewMonth = 0;
            state.viewYear++;
        }
        renderCalendar();
        updateDashboardStats();
    });

    document.getElementById('btnCurrentMonth').addEventListener('click', () => {
        state.viewYear = new Date().getFullYear();
        state.viewMonth = new Date().getMonth();
        renderCalendar();
        updateDashboardStats();
    });

    // 3) 관리자 / 사용자 모드 전환
    document.getElementById('btnModeUser').addEventListener('click', () => {
        setAdminMode(false);
    });

    document.getElementById('btnModeAdmin').addEventListener('click', () => {
        // PIN 입력 모달 오픈
        openModal('modalAdminAuth');
        document.getElementById('inputAdminPin').value = '';
        document.getElementById('pinErrorMsg').classList.add('hidden');
        document.getElementById('inputAdminPin').focus();
    });

    // 관리자 PIN 확인 폼
    document.getElementById('formAdminPin').addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = document.getElementById('inputAdminPin').value;
        if (pin === '1234') { // 기본 PIN: 1234
            setAdminMode(true);
            closeAllModals();
        } else {
            document.getElementById('pinErrorMsg').classList.remove('hidden');
        }
    });

    // 4) 내 근무 셀렉트 및 하이라이트
    document.getElementById('selectHighlightUser').addEventListener('change', (e) => {
        state.highlightPersonnelId = e.target.value;
        renderCalendar();
    });

    document.getElementById('selectMyPersonnel').addEventListener('change', (e) => {
        state.selectedMyPersonnelId = e.target.value;
        renderMyDutyView();
    });

    // 5) 리스트 검색 필터
    document.getElementById('filterSearchName').addEventListener('input', renderListView);
    document.getElementById('filterDutyType').addEventListener('change', renderListView);

    // 6) 배정 모달 열기 버튼
    document.getElementById('btnOpenAssignmentModal').addEventListener('click', () => {
        openAssignmentModalWithDate(new Date().toISOString().split('T')[0]);
    });

    // 배정 폼 중복 검증 실시간 체크
    const checkConflict = () => {
        const date = document.getElementById('inputDutyDate').value;
        const pId = document.getElementById('inputPersonnel').value;
        const alertBox = document.getElementById('conflictAlert');
        const alertText = document.getElementById('conflictAlertText');

        if (!date || !pId) {
            alertBox.classList.add('hidden');
            return;
        }

        const conflict = state.schedules.find(s => 
            s.duty_date === date && 
            s.assignments.some(a => a.person?.id === pId)
        );

        if (conflict) {
            const dtName = conflict.duty_type?.name || '근무';
            alertText.textContent = `⚠️ 해당 인원은 ${date}에 이미 [${dtName}]에 배정되어 있습니다!`;
            alertBox.classList.remove('hidden');
        } else {
            alertBox.classList.add('hidden');
        }
    };

    document.getElementById('inputDutyDate').addEventListener('change', checkConflict);
    document.getElementById('inputPersonnel').addEventListener('change', checkConflict);

    // 배정 폼 제출
    document.getElementById('formAssignment').addEventListener('submit', async (e) => {
        e.preventDefault();
        const dutyDate = document.getElementById('inputDutyDate').value;
        const dutyTypeId = document.getElementById('inputDutyType').value;
        const personnelId = document.getElementById('inputPersonnel').value;
        const roleDetail = document.getElementById('inputRoleDetail').value;
        const notes = document.getElementById('inputNotes').value;

        try {
            await dbAddAssignment({ dutyDate, dutyTypeId, personnelId, roleDetail, notes });
            alert('근무 배정이 성공적으로 저장되었습니다!');
            closeAllModals();
            await loadAllData();
        } catch (err) {
            alert('저장 중 오류가 발생했습니다: ' + err.message);
        }
    });

    // 배정 내역 삭제 (이벤트 위임)
    document.getElementById('dutyListTbody').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-assignment');
        if (!btn) return;
        const assignmentId = btn.dataset.assignmentId;
        const scheduleId = btn.dataset.scheduleId;
        if (confirm('이 근무 배정 내역을 삭제하시겠습니까?')) {
            try {
                await dbDeleteAssignment(assignmentId, scheduleId);
                await loadAllData();
            } catch (err) {
                alert('삭제 실패: ' + err.message);
            }
        }
    });

    // 7) 신규 근무자 등록 모달
    document.getElementById('btnOpenAddPersonnelModal').addEventListener('click', () => {
        openModal('modalAddPersonnel');
    });

    document.getElementById('formPersonnel').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newP = {
            name: document.getElementById('pName').value.trim(),
            rank: document.getElementById('pRank').value,
            service_number: document.getElementById('pServiceNumber').value.trim(),
            unit: document.getElementById('pUnit').value.trim(),
            phone: document.getElementById('pPhone').value.trim()
        };

        try {
            await dbSavePersonnel(newP);
            alert('신규 근무자가 등록되었습니다!');
            closeAllModals();
            document.getElementById('formPersonnel').reset();
            await loadAllData();
        } catch (err) {
            alert('등록 실패: ' + err.message);
        }
    });

    // 근무자 삭제 (이벤트 위임)
    document.getElementById('personnelTableBody').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-personnel');
        if (!btn) return;
        const id = btn.dataset.id;
        if (confirm('정말로 이 근무자를 삭제하시겠습니까? 관련 근무 배정도 함께 취소됩니다.')) {
            try {
                await dbDeletePersonnel(id);
                await loadAllData();
            } catch (err) {
                alert('삭제 실패: ' + err.message);
            }
        }
    });

    // 8) Supabase 연동 모달 및 설정
    const handleOpenSupabaseModal = () => {
        const cfg = getSupabaseConfig();
        document.getElementById('cfgSupabaseUrl').value = cfg.url;
        document.getElementById('cfgSupabaseKey').value = cfg.key;
        openModal('modalSupabaseConfig');
    };

    document.getElementById('btnOpenSupabaseModal').addEventListener('click', handleOpenSupabaseModal);
    const bannerBtn = document.getElementById('btnBannerOpenSupabaseModal');
    if (bannerBtn) bannerBtn.addEventListener('click', handleOpenSupabaseModal);

    document.getElementById('formSupabaseConfig').addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('cfgSupabaseUrl').value;
        const key = document.getElementById('cfgSupabaseKey').value;

        saveSupabaseConfig(url, key);
        updateSupabaseStatusUI();
        closeAllModals();
        alert('Supabase 설정이 저장되었습니다. 데이터를 새로고침합니다.');
        await loadAllData();
    });

    document.getElementById('btnClearConfig').addEventListener('click', async () => {
        if (confirm('Supabase 연동을 해제하고 브라우저 로컬 데모 모드로 전환하시겠습니까?')) {
            clearSupabaseConfig();
            updateSupabaseStatusUI();
            closeAllModals();
            await loadAllData();
        }
    });

    // 9) 원클릭 샘플 데이터 채우기
    document.getElementById('btnQuickSeed').addEventListener('click', async () => {
        if (confirm('실무형 샘플 데이터(근무자 8명, 당직사령/사관/당직병/불침번)를 생성하시겠습니까?')) {
            try {
                await dbSeedData();
                alert('샘플 데이터가 성공적으로 생성되었습니다!');
                await loadAllData();
            } catch (err) {
                alert('샘플 생성 오류: ' + err.message);
            }
        }
    });

    // 10) 인쇄 기능
    document.getElementById('btnPrintSchedule').addEventListener('click', () => {
        window.print();
    });

    // 11) 모달 닫기 버튼 일괄 처리
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
}

// --------------------------------------------------------------------
// 10. 관리자 모드 토글
// --------------------------------------------------------------------
function setAdminMode(isAdmin) {
    state.isAdmin = isAdmin;
    const btnUser = document.getElementById('btnModeUser');
    const btnAdmin = document.getElementById('btnModeAdmin');
    const banner = document.getElementById('adminModeBanner');
    const tabManage = document.getElementById('tabBtnManage');
    const adminCols = document.querySelectorAll('.admin-only-col');
    const btnSupabase = document.getElementById('btnOpenSupabaseModal');
    const bannerSupabase = document.getElementById('supabaseConnectBanner');

    if (isAdmin) {
        btnAdmin.className = 'px-3 py-1 rounded text-xs font-semibold bg-amber-600 text-white shadow transition-all';
        btnUser.className = 'px-3 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white transition-all';
        banner.classList.remove('hidden');
        tabManage.classList.remove('hidden');
        adminCols.forEach(col => col.classList.remove('hidden'));
        if (btnSupabase) btnSupabase.classList.remove('hidden');
        if (bannerSupabase && !isSupabaseConnected()) bannerSupabase.classList.remove('hidden');
    } else {
        btnUser.className = 'px-3 py-1 rounded text-xs font-semibold bg-emerald-600 text-white shadow transition-all';
        btnAdmin.className = 'px-3 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white transition-all';
        banner.classList.add('hidden');
        tabManage.classList.add('hidden');
        adminCols.forEach(col => col.classList.add('hidden'));
        if (btnSupabase) btnSupabase.classList.add('hidden');
        if (bannerSupabase) bannerSupabase.classList.add('hidden');
    }

    renderCalendar();
    renderListView();
}

// --------------------------------------------------------------------
// 11. 모달 헬퍼 함수
// --------------------------------------------------------------------
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function openAssignmentModalWithDate(dateStr) {
    document.getElementById('inputDutyDate').value = dateStr;
    document.getElementById('formAssignment').reset();
    document.getElementById('inputDutyDate').value = dateStr;
    document.getElementById('conflictAlert').classList.add('hidden');
    openModal('modalAssignment');
}

// --------------------------------------------------------------------
// 12. Supabase 연동 상태 UI
// --------------------------------------------------------------------
function updateSupabaseStatusUI() {
    const dot = document.getElementById('supabaseStatusDot');
    const text = document.getElementById('supabaseStatusText');
    const banner = document.getElementById('supabaseConnectBanner');

    if (isSupabaseConnected()) {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
        text.textContent = 'Supabase 연결됨';
        if (banner) banner.classList.add('hidden');
    } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
        text.textContent = '로컬 데모 모드';
        if (banner) {
            if (state.isAdmin) banner.classList.remove('hidden');
            else banner.classList.add('hidden');
        }
    }
}
