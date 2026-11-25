# 🛡️ 스마트 국방 당직·근무 일정 관리 시스템 (Smart Duty Guard Manager)

> **군 생활 중 발생하는 당직 및 각종 근무 일정을 체계적으로 관리하기 위한 웹 기반 관리 시스템**  
> Supabase 클라우드 데이터베이스를 기반으로 영구 보존되며, Vercel을 통해 전 세계 어디서나 실시간으로 접속할 수 있습니다.

---

## 📌 주요 핵심 기능

1. **👨‍✈️ 관리자 모드 (Admin)**
   - 당직사령, 당직사관, 당직병, 불침번, 초소근무 등 날짜별 근무 일정 등록/수정/삭제
   - **중복 배정 실시간 방지 검증**: 동일 일자에 중복으로 투입되는 인원 선택 시 즉각 경고 알림
   - 부대 인원(간부/용사) 명단 및 군번, 연락처 관리
   - 근무 종류(근무 시간, 식별 색상, 필요 인원) 규정 관리
   - 원클릭 실무형 샘플 데이터 자동 생성 기능 제공

2. **🎖️ 일반 사용자 모드 (Soldier/User)**
   - **월간 캘린더 뷰**: 이번 달 전체 근무 배정 현황을 시각적 뱃지로 한눈에 열람
   - **내 근무 간편 조회**: 본인 성함 선택 시 **D-Day (오늘 당직, D-1 등)** 및 예정된 근무 목록 표시
   - **일자별 전체 근무표**: 날짜순 정렬, 근무자 이름/군번 검색 및 근무 종류별 필터링
   - **인쇄 및 PDF 출력**: 버튼 하나로 깔끔한 A4 규격 당직근무표 출력 지원

3. **☁️ Supabase 클라우드 DB 연동 & 영구 보존**
   - 브라우저를 새로고침하거나 다른 PC, 스마트폰에서 접속해도 데이터 완벽 유지
   - 외래키(`FOREIGN KEY`), 인덱스, RLS(Row Level Security)가 적용된 정석 데이터베이스 설계

---

## 🗂️ 프로젝트 파일 구성

```text
261118-수시평가2/
├── index.html          # 메인 웹 페이지 (Tailwind CSS 기반 모던 UI)
├── style.css           # 커스텀 캘린더 및 뱃지 스타일시트
├── app.js              # 프론트엔드 비즈니스 로직 및 캘린더 렌더링
├── supabaseClient.js   # Supabase 클라우드 데이터베이스 연동 및 로컬 폴백 모듈
├── sample_data.sql     # Supabase SQL 에디터에 붙여넣을 데이터베이스 구축 스크립트
├── vercel.json         # Vercel 클라우드 배포 설정 파일
├── .gitignore          # 깃 업로드 제외 설정
└── README.md           # 본 안내 가이드 문서
```

---

## 🚀 [1단계] Supabase 데이터베이스 생성 및 SQL 실행 방법

> **SQL을 전혀 몰라도 괜찮습니다!** 준비된 스크립트를 복사해서 붙여넣기만 하면 10초 만에 데이터베이스가 구축됩니다.

1. **[Supabase](https://supabase.com)** 에 접속하여 로그인합니다.
2. 대시보드 우측 상단의 **`New project`** 버튼을 클릭합니다.
   - **Name**: `duty-manager` (또는 원하는 이름)
   - **Database Password**: 기억하기 쉬운 비밀번호 입력 (메모해 두세요)
   - **Region**: `Northeast (Seoul)` 선택 (가장 빠름)
   - **`Create new project`** 버튼 클릭 후 약 1분간 대기합니다.
3. 프로젝트 생성이 완료되면 왼쪽 메뉴 바에서 **`SQL Editor`** (터미널 모양 아이콘)를 클릭합니다.
4. **`+ New query`** 버튼을 누릅니다.
5. 이 프로젝트 폴더에 있는 **`sample_data.sql`** 파일의 내용 전체를 복사하여 에디터 창에 붙여넣습니다.
6. 오른쪽 아래의 **`Run`** (또는 단축키 `Ctrl + Enter`) 버튼을 클릭합니다.
   - 하단에 **`Success. No rows returned`** 메시지가 뜨면 테이블 5개(`personnel`, `duty_types`, `duty_schedules`, `duty_assignments`, `users`)와 실무형 샘플 데이터가 성공적으로 생성된 것입니다!
7. **연동 키(API Key) 복사하기**:
   - 왼쪽 하단 톱니바퀴 아이콘 **`Project Settings`** ➔ **`Data API`** (또는 **`API`**) 메뉴를 클릭합니다.
   - **Project URL** (예: `https://abcdefg.supabase.co`) 복사
   - **Project API keys** 항목의 `anon` `public` 키 복사

---

## 🐙 [2단계] GitHub에 소스코드 올리기 (초보자를 위한 가장 쉬운 웹 업로드)

> Git 명령어가 낯설다면 웹 브라우저에서 직접 드래그 앤 드롭으로 1분 만에 올릴 수 있습니다.

### 방법 A: GitHub 웹 화면에서 바로 올리기 (추천: 가장 쉽고 확실함)
1. **[GitHub](https://github.com)** 에 로그인합니다.
2. 우측 상단의 **`+`** 아이콘 클릭 ➔ **`New repository`** 선택.
3. 저장소 설정:
   - **Repository name**: `duty-schedule-manager`
   - **Public** 선택
   - 하단의 **`Create repository`** 초록색 버튼 클릭.
4. 생성된 빈 저장소 페이지 화면 중간에 파란색 글씨로 된 **`uploading an existing file`** 링크를 클릭합니다.
5. 본 폴더(`261118-수시평가2`) 안의 모든 파일들을 마우스로 드래그하여 브라우저 창에 끌어다 놓습니다.
   - `index.html`, `style.css`, `app.js`, `supabaseClient.js`, `sample_data.sql`, `vercel.json`, `README.md`, `.gitignore`
6. 하단의 초록색 **`Commit changes`** 버튼을 클릭하면 깃허브 업로드가 완료됩니다!

---

## ⚡ [3단계] Vercel에서 깃허브 연동 및 배포 URL 만들기

1. **[Vercel](https://vercel.com)** 에 접속하여 로그인합니다. (GitHub 계정으로 연동 로그인 권장)
2. 대시보드 우측 상단의 **`Add New...`** 버튼 클릭 ➔ **`Project`** 선택.
3. **`Import Git Repository`** 목록에서 방금 깃허브에 올린 **`duty-schedule-manager`** 레포지토리 옆의 **`Import`** 버튼을 클릭합니다.
4. 설정 화면이 나오면:
   - **Project Name**: 그대로 유지
   - **Framework Preset**: `Other` 로 자동 인식됨 (그대로 둡니다)
   - **Build and Output Settings**: 기본값 그대로 둡니다.
5. 파란색 **`Deploy`** 버튼을 클릭합니다!
6. 약 20초~30초 후 폭죽 애니메이션과 함께 **`Congratulations!`** 화면이 나타납니다.
7. 화면에 표시된 배포 도메인 URL(예: `https://duty-schedule-manager-xxx.vercel.app`)을 클릭하여 접속합니다!

---

## 🔗 [4단계] 배포된 웹사이트에서 Supabase 최종 연결하기

1. 배포된 Vercel 웹사이트 URL로 접속합니다.
2. 사이트 상단 헤더의 **`[⚙️ 설정]`** 또는 **`[연동 확인중 / 로컬 데모 모드]`** 버튼을 클릭합니다.
3. [1단계]에서 복사해 둔:
   - **Project URL**
   - **Anon Public Key**
   를 각각 입력하고 **`저장 및 연결`** 버튼을 클릭합니다.
4. 상단의 상태 표시등이 초록색 **`🟢 Supabase 연결됨`** 으로 변경되며, 이제 수파베이스 클라우드 DB와 실시간으로 동기화됩니다!
5. 관리자 모드 전환을 원하시면 우측 상단 **`관리자 모드`** 클릭 후 기본 PIN `1234`를 입력하시면 즉시 일정 등록 및 수정이 가능합니다.
