
import { GolfCourse, CourseType, GrassType, Region, Person, AffinityLevel, LogEntry, Department, ExternalEvent, FinancialRecord, MaterialRecord, MaterialCategory } from './types';

// --- KOREA GOLF COURSE MASTER DATABASE (Comprehensive Expansion) ---
// This list provides a foundation for ~590 courses, categorized by region.
export const MOCK_COURSES: GolfCourse[] = [
  // 경기권 (Gyeonggi) - Large cluster
  { id: 'c-gg-001', name: '가평베네스트 GC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '경기 가평군 상면', grassType: GrassType.BENTGRASS, area: '45만평', description: '삼성물산 운영 명문 골프장.' },
  { id: 'c-gg-002', name: '곤지암 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '경기 광주시 도척면', grassType: GrassType.BENTGRASS, area: '30만평', description: 'LG그룹 운영 소수정예 회원제.' },
  { id: 'c-gg-003', name: '남부 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1991', address: '경기 용인시 기흥구', grassType: GrassType.ZOYSIA, area: '35만평', description: '국내 최고가 회원권 보유 명문.' },
  { id: 'c-gg-004', name: '레이크사이드 CC', region: '경기', holes: 54, type: CourseType.MEMBER, openYear: '1990', address: '경기 용인시 처인구', grassType: GrassType.MIXED, area: '120만평', description: '국내 최대 규모 중 하나.' },
  { id: 'c-gg-005', name: '스카이뷰 CC', region: '경기', holes: 18, type: CourseType.PUBLIC, openYear: '2015', address: '경기 여주시 북내면', grassType: GrassType.ZOYSIA, area: '42만평', description: '산악형 난이도 높은 코스.' },
  { id: 'c-gg-006', name: '해비치 CC 서울', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1999', address: '경기 남양주시 화도읍', grassType: GrassType.BENTGRASS, area: '48만평', description: '현대자동차그룹 운영.' },
  { id: 'c-gg-007', name: '뉴서울 CC', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1987', address: '경기 광주시 삼동', grassType: GrassType.ZOYSIA, area: '85만평', description: '문화체육관광부 산하 기관 운영.' },
  { id: 'c-gg-008', name: '화산 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1996', address: '경기 용인시 처인구', grassType: GrassType.BENTGRASS, area: '32만평', description: '전통적인 명문 회원제.' },
  { id: 'c-gg-009', name: '안양 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1968', address: '경기 군포시 부곡동', grassType: GrassType.BENTGRASS, area: '30만평', description: '국내 최초의 명문 골프장, 삼성이 관리.' },
  { id: 'c-gg-010', name: '중부 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1992', address: '경기 광주시 곤지암읍', grassType: GrassType.ZOYSIA, area: '33만평', description: '애경그룹 운영.' },
  { id: 'c-gg-011', name: '남촌 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '2003', address: '경기 광주시 곤지암읍', grassType: GrassType.BENTGRASS, area: '31만평', description: '수도권 동남부 대표 명문.' },
  { id: 'c-gg-012', name: '렉스필드 CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2003', address: '경기 여주시 산북면', grassType: GrassType.BENTGRASS, area: '42만평', description: '웅진그룹 운영, 예술적 코스.' },
  { id: 'c-gg-013', name: '서원밸리 GC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '2000', address: '경기 파주시 광탄면', grassType: GrassType.ZOYSIA, area: '35만평', description: '서원힐스와 연계된 파주 대표 골프장.' },
  { id: 'c-gg-014', name: '송추 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1995', address: '경기 양주시 광적면', grassType: GrassType.ZOYSIA, area: '30만평', description: '수도권 북부의 정통 회원제.' },

  // 강원권 (Gangwon)
  { id: 'c-gw-001', name: '제이드팰리스 GC', region: '강원', holes: 18, type: CourseType.MEMBER, openYear: '2004', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '32만평', description: '한화그룹 운영 하이엔드 골프장.' },
  { id: 'c-gw-002', name: '휘슬링락 CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2011', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '50만평', description: '예술적인 조경과 코스 설계.' },
  { id: 'c-gw-003', name: '오크밸리 CC', region: '강원', holes: 36, type: CourseType.MEMBER, openYear: '1998', address: '강원 원주시 지정면', grassType: GrassType.BENTGRASS, area: '100만평', description: 'HDC현대산업개발 운영.' },
  { id: 'c-gw-004', name: '블루마운틴 CC', region: '강원', holes: 27, type: CourseType.PUBLIC, openYear: '2013', address: '강원 홍천군 두촌면', grassType: GrassType.BENTGRASS, area: '45만평', description: '미래에셋 운영 하이엔드 대중제.' },
  { id: 'c-gw-005', name: '파인리즈 CC', region: '강원', holes: 27, type: CourseType.PUBLIC, openYear: '2006', address: '강원 고성군 토성면', grassType: GrassType.ZOYSIA, area: '52만평', description: '천연 맥반석 모래 시공 코스.' },
  { id: 'c-gw-006', name: '라데나 CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '1990', address: '강원 춘천시 신동면', grassType: GrassType.ZOYSIA, area: '40만평', description: '두산그룹 운영, KLPGA 개최지.' },

  // 충청권 (Chungcheong)
  { id: 'c-cc-001', name: '우정힐스 CC', region: '충청', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '충남 천안시 동남구', grassType: GrassType.BENTGRASS, area: '35만평', description: '코오롱 운영, 한국 오픈 개최지.' },
  { id: 'c-cc-002', name: '천룡 CC', region: '충청', holes: 27, type: CourseType.MEMBER, openYear: '1995', address: '충북 진천군 이월면', grassType: GrassType.MIXED, area: '40만평', description: '중부권 최고의 명문 회원제.' },
  { id: 'c-cc-003', name: '세종필드 GC', region: '충청', holes: 18, type: CourseType.PUBLIC, openYear: '2012', address: '세종시 연기면', grassType: GrassType.ZOYSIA, area: '38만평', description: '건설공제조합 운영 대중제.' },
  { id: 'c-cc-004', name: '에머슨 GC', region: '충청', holes: 27, type: CourseType.MEMBER, openYear: '1992', address: '충북 진천군 백곡면', grassType: GrassType.ZOYSIA, area: '48만평', description: '아난티 그룹 운영.' },
  { id: 'c-cc-005', name: '실크리버 CC', region: '충청', holes: 18, type: CourseType.MEMBER, openYear: '2003', address: '충북 청주시 서원구', grassType: GrassType.BENTGRASS, area: '33만평', description: '고급 회원제 운영.' },

  // 영남권 (Gyeongsang)
  { id: 'c-gs-001', name: '정산 CC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '경남 김해시 주촌면', grassType: GrassType.BENTGRASS, area: '45만평', description: '태광실업 운영 영남권 명문.' },
  { id: 'c-gs-002', name: '보라 CC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '울산 울주군 삼동면', grassType: GrassType.BENTGRASS, area: '42만평', description: '반도건설 운영 고급 회원제.' },
  { id: 'c-gs-003', name: '에이원 CC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '1999', address: '경남 양산시 매곡동', grassType: GrassType.ZOYSIA, area: '50만평', description: 'KPGA 선수권 대회 개최지.' },
  { id: 'c-gs-004', name: '가야 CC', region: '경상', holes: 54, type: CourseType.MEMBER, openYear: '1988', address: '경남 김해시 삼방동', grassType: GrassType.ZOYSIA, area: '105만평', description: '부울경 최대 규모 골프장.' },
  { id: 'c-gs-005', name: '베이사이드 GC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '2010', address: '부산 기장군 일광면', grassType: GrassType.BENTGRASS, area: '45만평', description: '해양 도시 부산의 대표 코스.' },

  // 호남권 (Jeolla)
  { id: 'c-jl-001', name: '파인비치 골프링크스', region: '전라', holes: 18, type: CourseType.PUBLIC, openYear: '2010', address: '전남 해남군 화원면', grassType: GrassType.BENTGRASS, area: '30만평', description: '한국의 페블비치로 불리는 씨사이드.' },
  { id: 'c-jl-002', name: '승주 CC', region: '전라', holes: 27, type: CourseType.MEMBER, openYear: '1992', address: '전남 순천시 상사면', grassType: GrassType.ZOYSIA, area: '60만평', description: '포스코 운영 호남권 대표 명문.' },
  { id: 'c-jl-003', name: '광주 CC', region: '전라', holes: 27, type: CourseType.MEMBER, openYear: '1983', address: '전남 곡성군 겸면', grassType: GrassType.ZOYSIA, area: '45만평', description: '금호고속 운영 전통 회원제.' },
  { id: 'c-jl-004', name: '무등산 CC', region: '전라', holes: 27, type: CourseType.MEMBER, openYear: '2008', address: '전남 화순군 화순읍', grassType: GrassType.ZOYSIA, area: '43만평', description: '광주 인접 산악형 코스.' },

  // 제주권 (Jeju)
  { id: 'c-jj-001', name: '나인브릿지', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2001', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '33만평', description: 'CJ그룹 운영, 세계 100대 코스.' },
  { id: 'c-jj-002', name: '핀크스 GC', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '1999', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '40만평', description: 'SK네트웍스 운영 고품격 코스.' },
  { id: 'c-jj-003', name: '블랙스톤 제주', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '제주 제주시 한림읍', grassType: GrassType.BENTGRASS, area: '50만평', description: '대유위니아 그룹 운영.' },
  { id: 'c-jj-004', name: '테디밸리 CC', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2007', address: '제주 서귀포시 안덕면', grassType: GrassType.ZOYSIA, area: '30만평', description: '가장 제주다운 경관의 코스.' },
];

// --- MOCK LOGS ---
export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    date: '2024-05-20',
    author: '김철수',
    department: Department.CONSTRUCTION,
    courseId: 'c-gg-005',
    courseName: '스카이뷰 CC',
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
    currentCourseId: 'c-gg-005',
    affinity: AffinityLevel.FRIENDLY,
    notes: '꼼꼼한 성격으로 배수 문제에 민감함.',
    careers: []
  }
];

export const MOCK_EXTERNAL_EVENTS: ExternalEvent[] = [];
export const MOCK_FINANCIALS: FinancialRecord[] = [];
export const MOCK_MATERIALS: MaterialRecord[] = [];
