
import { GolfCourse, CourseType, GrassType, Region, Person, AffinityLevel, LogEntry, Department, ExternalEvent, FinancialRecord, MaterialRecord, MaterialCategory } from './types';

// --- KOREA GOLF COURSE MASTER DATABASE (Expanded from Data Analysis) ---
export const MOCK_COURSES: GolfCourse[] = [
  // 서울
  { id: 'c-se-001', name: '태릉 골프장', region: '서울', holes: 18, type: CourseType.MILITARY, openYear: '1966', address: '서울특별시 노원구 공릉동 1-2', grassType: GrassType.ZOYSIA, area: '825,825 m2', description: '서울 내 위치한 군 전용 체력단련장.' },
  { id: 'c-se-002', name: '인서울27골프클럽', region: '서울', holes: 27, type: CourseType.PUBLIC, openYear: '2019', address: '서울특별시 강서구 오곡동 1-6', grassType: GrassType.ZOYSIA, area: '998,126 m2', description: '김포공항 인근 대중제 골프장.' },
  
  // 부산
  { id: 'c-bu-001', name: '동래베네스트GC', region: '부산', holes: 18, type: CourseType.MEMBER, openYear: '1971', address: '부산광역시 금정구 선동 산 128-1', grassType: GrassType.BENTGRASS, area: '1,009,423 m2', description: '전통의 삼성물산 운영 명문 회원제.' },
  { id: 'c-bu-002', name: '부산컨트리클럽', region: '부산', holes: 18, type: CourseType.MEMBER, openYear: '1956', address: '부산광역시 금정구 노포동 368', grassType: GrassType.ZOYSIA, area: '977,752 m2', description: '부산 지역 역사 깊은 회원제 골프장.' },
  { id: 'c-bu-003', name: '베이사이드GC', region: '부산', holes: 27, type: CourseType.MEMBER, openYear: '2010', address: '부산광역시 기장군 일광면 이천리 산 32', grassType: GrassType.BENTGRASS, area: '1,406,063 m2', description: '기장군 소재의 세련된 회원제 코스.' },
  { id: 'c-bu-004', name: '해운대컨트리클럽', region: '부산', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '부산광역시 기장군 정관읍 병산리 산 6', grassType: GrassType.ZOYSIA, area: '1,527,005 m2', description: '해운대 배후 정관신도시에 위치.' },
  
  // 대구
  { id: 'c-dg-001', name: '팔공CC', region: '대구', holes: 18, type: CourseType.MEMBER, openYear: '1987', address: '대구광역시 동구 도학동 산 1-1', grassType: GrassType.ZOYSIA, area: '769,047 m2', description: '대구 팔공산 국립공원 인근 위치.' },
  { id: 'c-dg-002', name: '대구 체력단련장', region: '대구', holes: 9, type: CourseType.MILITARY, openYear: '1974', address: '대구광역시 동구 둔산동 936-2', grassType: GrassType.ZOYSIA, area: '219,614 m2', description: '공군 전용 체력단련장.' },

  // 인천
  { id: 'c-in-001', name: '클럽72', region: '인천', holes: 72, type: CourseType.PUBLIC, openYear: '2005', address: '인천광역시 중구 운서동 3238', grassType: GrassType.BENTGRASS, area: '3,620,061 m2', description: '인천공항 부지 내 대규모 대중제 골프장.' },
  { id: 'c-in-002', name: '잭니클라우스 골프클럽 코리아', region: '인천', holes: 18, type: CourseType.MEMBER, openYear: '2010', address: '인천광역시 연수구 송도동 117', grassType: GrassType.BENTGRASS, area: '948,079 m2', description: '송도 국제도시 내 하이엔드 회원제.' },
  { id: 'c-in-003', name: '인천오렌지듄스GC', region: '인천', holes: 18, type: CourseType.PUBLIC, openYear: '2013', address: '인천광역시 연수구 송도동 347', grassType: GrassType.ZOYSIA, area: '510,720 m2', description: '송도 매립지 내 링크스 스타일 코스.' },

  // 경기 (Large Cluster)
  { id: 'c-gg-001', name: '남서울컨트리클럽', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1971', address: '경기도 성남시 분당구 백현동 511-25', grassType: GrassType.ZOYSIA, area: '1,182,870 m2', description: '분당 명문 회원제, 매경오픈 개최지.' },
  { id: 'c-gg-002', name: '제일CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '1983', address: '경기도 안산시 상록구 부곡동 587', grassType: GrassType.ZOYSIA, area: '1,503,268 m2', description: '안산 지역 대표 회원제 골프장.' },
  { id: 'c-gg-003', name: '한양CC', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1964', address: '경기도 고양시 덕양구 원당동 198-114', grassType: GrassType.ZOYSIA, area: '1,441,066 m2', description: '역사와 전통의 경기 북부 명문.' },
  { id: 'c-gg-004', name: '레이크사이드CC', region: '경기', holes: 54, type: CourseType.PUBLIC, openYear: '1990', address: '경기도 용인시 처인구 모현읍 능원리 산 5-12', grassType: GrassType.MIXED, area: '3,198,306 m2', description: '삼성물산 운영, 국내 최다 내장객 수준.' },
  { id: 'c-gg-005', name: '안양컨트리클럽', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1968', address: '경기도 군포시 부곡동 1', grassType: GrassType.BENTGRASS, area: '878,287 m2', description: '국내 최고 권위의 프라이빗 회원제.' },
  { id: 'c-gg-006', name: '화산CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1996', address: '경기도 용인시 처인구 이동읍 화산리 산 28-2', grassType: GrassType.BENTGRASS, area: '1,039,272 m2', description: '코스 레이아웃이 뛰어난 용인권 명문.' },
  { id: 'c-gg-007', name: '88골프장', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1988', address: '경기도 용인시 기흥구 청덕동 80-2', grassType: GrassType.ZOYSIA, area: '2,810,296 m2', description: '국가보훈부 운영, 넓은 페어웨이.' },

  // 강원
  { id: 'c-gw-001', name: '제이드팰리스GC', region: '강원', holes: 18, type: CourseType.MEMBER, openYear: '2004', address: '강원특별자치도 춘천시 남산면 서천리 121-19', grassType: GrassType.BENTGRASS, area: '986,626 m2', description: '한화그룹 운영, 프라이빗 하이엔드.' },
  { id: 'c-gw-002', name: '휘슬링락CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2011', address: '강원특별자치도 춘천시 남산면 수동리 754', grassType: GrassType.BENTGRASS, area: '349,703 m2', description: '예술적인 조경과 독보적인 클럽하우스.' },
  { id: 'c-gw-003', name: '하이원CC', region: '강원', holes: 18, type: CourseType.PUBLIC, openYear: '2005', address: '강원특별자치도 정선군 고한읍 고한리 산 1-166', grassType: GrassType.ZOYSIA, area: '1,092,323 m2', description: '고원 지대 위치, 여름에도 시원한 라운딩.' },

  // 충청
  { id: 'c-cc-001', name: '우정힐스CC', region: '충남', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '충청남도 천안시 동남구 목천읍 운전리 401', grassType: GrassType.BENTGRASS, area: '1,061,835 m2', description: '코오롱 운영, 한국오픈 개최지.' },
  { id: 'c-cc-002', name: '세종필드GC', region: '세종', holes: 18, type: CourseType.PUBLIC, openYear: '2012', address: '세종특별자치시 산울동 644', grassType: GrassType.ZOYSIA, area: '1,007,159 m2', description: '세종시 중심부에 위치한 대중제.' },

  // 호남
  { id: 'c-jn-001', name: '파인비치 골프링크스', region: '전남', holes: 18, type: CourseType.PUBLIC, openYear: '2010', address: '전라남도 해남군 화원면 주광리 산 19', grassType: GrassType.BENTGRASS, area: '827,488 m2', description: '한국의 페블비치, 씨사이드 링크스.' },
  { id: 'c-jn-002', name: '무안CC', region: '전남', holes: 54, type: CourseType.MEMBER, openYear: '1997', address: '전라남도 무안군 청계면 도대리 818', grassType: GrassType.ZOYSIA, area: '1,969,760 m2', description: '광활한 평지형 대규모 골프장.' },

  // 제주
  { id: 'c-jj-001', name: '핀크스GC', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '1999', address: '제주특별자치도 서귀포시 안덕면 상천리 산 62-3', grassType: GrassType.BENTGRASS, area: '874,521 m2', description: 'SK네트웍스 운영, 세계 100대 코스 선정.' },
  { id: 'c-jj-002', name: '나인브릿지', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2001', address: '제주특별자치도 서귀포시 안덕면 광평리 산 15', grassType: GrassType.BENTGRASS, area: '960,827 m2', description: '국내 최초 PGA 대회 개최지.' },
];

// --- MOCK LOGS ---
export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    date: '2024-05-20',
    author: '김철수',
    department: Department.CONSTRUCTION,
    courseId: 'c-bu-001',
    courseName: '동래베네스트GC',
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
