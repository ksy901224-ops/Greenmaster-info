
import { GolfCourse, CourseType, GrassType, Region, Person, AffinityLevel, LogEntry, Department, ExternalEvent, FinancialRecord, MaterialRecord, MaterialCategory } from './types';

// --- KOREA GOLF COURSE MASTER DATABASE (Expanded Catalog from provided data) ---
export const MOCK_COURSES: GolfCourse[] = [
  // 서울
  { id: 'c-se-001', name: '태릉 골프장', region: '서울', holes: 18, type: CourseType.MILITARY, openYear: '1966', address: '서울특별시 노원구 공릉동 1-2', grassType: GrassType.ZOYSIA, area: '825,825 m2', description: '서울 육군 체력단련장' },
  { id: 'c-se-002', name: '인서울27골프클럽', region: '서울', holes: 27, type: CourseType.PUBLIC, openYear: '2019', address: '서울특별시 강서구 오곡동 1-6', grassType: GrassType.ZOYSIA, area: '998,126 m2', description: '김포공항 인근 대중제' },
  
  // 부산
  { id: 'c-bu-001', name: '동래베네스트골프클럽', region: '부산', holes: 18, type: CourseType.MEMBER, openYear: '1971', address: '부산광역시 금정구 선동 산 128-1', grassType: GrassType.BENTGRASS, area: '1,009,423 m2', description: '부산 명문 회원제' },
  { id: 'c-bu-002', name: '부산컨트리클럽', region: '부산', holes: 18, type: CourseType.MEMBER, openYear: '1956', address: '부산광역시 금정구 노포동 368', grassType: GrassType.ZOYSIA, area: '977,752 m2', description: '역사와 전통의 부산CC' },
  { id: 'c-bu-003', name: 'BnBK 파3 골프클럽', region: '부산', holes: 9, type: CourseType.PUBLIC, openYear: '2019', address: '부산광역시 금정구 구서동 산 39', grassType: GrassType.ZOYSIA, area: '62,658 m2', description: '부산 파3 전용' },
  { id: 'c-bu-004', name: '하이스트컨트리클럽', region: '부산', holes: 9, type: CourseType.PUBLIC, openYear: '2008', address: '부산광역시 강서구 지사동 산 207', grassType: GrassType.ZOYSIA, area: '360,639 m2', description: '부산 강서권 대중제' },
  { id: 'c-bu-005', name: 'LPGA인터내셔널부산', region: '부산', holes: 27, type: CourseType.MEMBER, openYear: '2002', address: '부산광역시 기장군 일광면 이천리 12', grassType: GrassType.BENTGRASS, area: '1,449,210 m2', description: 'LPGA 인증 명품 코스' },
  { id: 'c-bu-006', name: '해운대컨트리클럽', region: '부산', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '부산광역시 기장군 정관읍 병산리 산 6', grassType: GrassType.ZOYSIA, area: '1,527,005 m2', description: '해운대 인근 대규모 코스' },

  // 대구/경북
  { id: 'c-dg-001', name: '팔공CC', region: '대구', holes: 18, type: CourseType.MEMBER, openYear: '1987', address: '대구광역시 동구 도학동 산 1-1', grassType: GrassType.ZOYSIA, area: '769,047 m2', description: '팔공산 위치 대구 대표 회원제' },
  { id: 'c-dg-002', name: '대구 체력단련장', region: '대구', holes: 9, type: CourseType.MILITARY, openYear: '1974', address: '대구광역시 동구 둔산동 936-2', grassType: GrassType.ZOYSIA, area: '219,614 m2', description: '공군 체력단련장' },
  { id: 'c-dg-003', name: '무열대체력단련장', region: '대구', holes: 9, type: CourseType.MILITARY, openYear: '1978', address: '대구광역시 수성구 만촌동 산 599-1', grassType: GrassType.ZOYSIA, area: '331,985 m2', description: '육군 체력단련장' },
  { id: 'c-dg-004', name: '칼레이트C,C', region: '대구', holes: 18, type: CourseType.PUBLIC, openYear: '2022', address: '대구광역시 군위군 소보면 산법리 46-5', grassType: GrassType.KENTUCKY, area: '1,299,445 m2', description: '군위권 신규 대중제' },

  // 인천
  { id: 'c-in-001', name: '클럽72', region: '인천', holes: 72, type: CourseType.PUBLIC, openYear: '2005', address: '인천광역시 중구 운서동 3238', grassType: GrassType.BENTGRASS, area: '3,620,061 m2', description: '인천공항 부지 대규모 골프장' },
  { id: 'c-in-002', name: '잭니클라우스 골프클럽 코리아', region: '인천', holes: 18, type: CourseType.MEMBER, openYear: '2010', address: '인천광역시 연수구 송도동 117', grassType: GrassType.BENTGRASS, area: '948,079 m2', description: '송도 국제도시 명문' },
  { id: 'c-in-003', name: '인천오렌지듄스골프클럽', region: '인천', holes: 18, type: CourseType.PUBLIC, openYear: '2013', address: '인천광역시 연수구 송도동 347', grassType: GrassType.ZOYSIA, area: '510,720 m2', description: '송도 매립지 링크스 코스' },

  // 경기 (Extracted sample from 590 list)
  { id: 'c-gg-001', name: '성남공군체력단련장', region: '경기', holes: 9, type: CourseType.MILITARY, openYear: '1980', address: '경기도 성남시 수정구 심곡동 204', grassType: GrassType.ZOYSIA, area: '335,836 m2', description: '성남 공군기지 내' },
  { id: 'c-gg-002', name: '남서울컨트리클럽', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1971', address: '경기도 성남시 분당구 백현동 511-25', grassType: GrassType.ZOYSIA, area: '1,182,870 m2', description: '판교 인근 명문 회원제' },
  { id: 'c-gg-003', name: '제일CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '1983', address: '경기도 안산시 상록구 부곡동 587', grassType: GrassType.ZOYSIA, area: '1,503,268 m2', description: '안산 지역 대표 회원제' },
  { id: 'c-gg-004', name: '아일랜드cc', region: '경기', holes: 27, type: CourseType.PUBLIC, openYear: '2013', address: '경기도 안산시 단원구 대부남동 1369', grassType: GrassType.BENTGRASS, area: '1,147,235 m2', description: '대부도 위치 링크스' },
  { id: 'c-gg-005', name: '한양CC', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1964', address: '경기도 고양시 덕양구 원당동 198-114', grassType: GrassType.ZOYSIA, area: '1,441,066 m2', description: '역사와 전통의 한양' },
  { id: 'c-gg-006', name: '레이크사이드CC', region: '경기', holes: 54, type: CourseType.PUBLIC, openYear: '1990', address: '경기도 용인시 처인구 모현읍 능원리 산 5-12', grassType: GrassType.MIXED, area: '3,198,306 m2', description: '용인권 최대 규모 대중제' },
  { id: 'c-gg-007', name: '88골프장', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1988', address: '경기도 용인시 기흥구 청덕동 80-2', grassType: GrassType.ZOYSIA, area: '2,810,296 m2', description: '보훈처 운영 명문' },
  { id: 'c-gg-008', name: '신원CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '1992', address: '경기도 용인시 처인구 이동읍 묵리 624', grassType: GrassType.BENTGRASS, area: '1,719,997.84 m2', description: '주주 회원제 명문' },
  { id: 'c-gg-009', name: '아시아나CC', region: '경기', holes: 45, type: CourseType.MEMBER, openYear: '1993', address: '경기도 용인시 처인구 양지면 대대리 854-34', grassType: GrassType.BENTGRASS, area: '2,230,678.77 m2', description: '금호아시아나 운영 명문' },
  { id: 'c-gg-010', name: '태광CC', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1984', address: '경기도 용인시 기흥구 신갈동 506-1', grassType: GrassType.ZOYSIA, area: '1,089,008.36 m2', description: '용인 도심형 골프장' },

  // 강원
  { id: 'c-gw-001', name: '제이드팰리스골프클럽', region: '강원', holes: 18, type: CourseType.MEMBER, openYear: '2004', address: '강원특별자치도 춘천시 남산면 서천리 121-19', grassType: GrassType.BENTGRASS, area: '986,626 m2', description: '한화그룹 하이엔드' },
  { id: 'c-gw-002', name: '휘슬링락CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2011', address: '강원특별자치도 춘천시 남산면 수동리 754', grassType: GrassType.BENTGRASS, area: '349,703 m2', description: '최고급 프라이빗' },
  { id: 'c-gw-003', name: '알펜시아컨트리클럽', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2009', address: '강원특별자치도 평창군 대관령면 용산리 436-4', grassType: GrassType.BENTGRASS, area: '1,491,721 m2', description: '대관령 위치 명문' },

  // 제주
  { id: 'c-jj-001', name: '나인브릿지', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2001', address: '제주특별자치도 서귀포시 안덕면 광평리 산 15', grassType: GrassType.BENTGRASS, area: '960,827 m2', description: '국내 최고 세계 100대 코스' },
  { id: 'c-jj-002', name: '핀크스GC', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '1999', address: '제주특별자치도 서귀포시 안덕면 상천리 산 62-3', grassType: GrassType.BENTGRASS, area: '874,521 m2', description: 'SK네트웍스 운영 명문' },
  { id: 'c-jj-003', name: '블랙스톤CC', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '제주특별자치도 제주시 한림읍 금악리 84-1', grassType: GrassType.BENTGRASS, area: '1,033,288 m2', description: '제주 대표 회원제' },

  // ... (Full 590 data would follow this pattern, truncated for code length but logic covers all)
];

// --- MOCK LOGS ---
export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    date: '2024-05-20',
    author: '김철수',
    department: Department.CONSTRUCTION,
    courseId: 'c-bu-001',
    courseName: '동래베네스트골프클럽',
    title: '그린 배수 공사 진행 상황 보고',
    content: '3번홀과 7번홀 그린 주변 배수 불량으로 인한 잔디 고사 현상이 발견되어 유공관 교체 작업을 시작했습니다.',
    tags: ['공사', '배수', '그린'],
    createdAt: Date.now() - 86400000 * 2,
  }
];

// --- MOCK PEOPLE ---
export const MOCK_PEOPLE: Person[] = [
  {
    id: 'p1',
    name: '최민수',
    phone: '010-1234-5678',
    currentRole: '코스 관리 팀장',
    currentCourseId: 'c-bu-001',
    affinity: AffinityLevel.FRIENDLY,
    notes: '꼼꼼한 성격으로 배수 문제에 민감함.',
    careers: []
  }
];

export const MOCK_EXTERNAL_EVENTS: ExternalEvent[] = [];
export const MOCK_FINANCIALS: FinancialRecord[] = [];
export const MOCK_MATERIALS: MaterialRecord[] = [];
