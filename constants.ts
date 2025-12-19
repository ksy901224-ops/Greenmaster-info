
import { GolfCourse, CourseType, GrassType, Region, Person, AffinityLevel, LogEntry, Department, ExternalEvent, FinancialRecord, MaterialRecord, MaterialCategory } from './types';

// --- KOREA GOLF COURSE MASTER DATABASE (Expanded to ~590 structure) ---
export const MOCK_COURSES: GolfCourse[] = [
  // 경기권 (가장 많음)
  { id: 'c-gg-001', name: '가평베네스트 GC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '경기 가평군 상면', grassType: GrassType.BENTGRASS, area: '45만평', description: '삼성물산 운영 명문 골프장.' },
  { id: 'c-gg-002', name: '곤지암 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '경기 광주시 도척면', grassType: GrassType.BENTGRASS, area: '30만평', description: 'LG그룹 운영 소수정예 회원제.' },
  { id: 'c-gg-003', name: '남부 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1991', address: '경기 용인시 기흥구', grassType: GrassType.ZOYSIA, area: '35만평', description: '국내 최고가 회원권 보유 명문.' },
  { id: 'c-gg-004', name: '레이크사이드 CC', region: '경기', holes: 54, type: CourseType.MEMBER, openYear: '1990', address: '경기 용인시 처인구', grassType: GrassType.MIXED, area: '120만평', description: '국내 최대 규모 중 하나.' },
  { id: 'c-gg-005', name: '스카이뷰 CC', region: '경기', holes: 18, type: CourseType.PUBLIC, openYear: '2015', address: '경기 여주시 북내면', grassType: GrassType.ZOYSIA, area: '42만평', description: '산악형 난이도 높은 코스.' },
  { id: 'c-gg-006', name: '해비치 CC 서울', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1999', address: '경기 남양주시 화도읍', grassType: GrassType.BENTGRASS, area: '48만평', description: '현대자동차그룹 운영.' },
  
  // 강원권
  { id: 'c-gw-001', name: '제이드팰리스 GC', region: '강원', holes: 18, type: CourseType.MEMBER, openYear: '2004', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '32만평', description: '한화그룹 운영 하이엔드 골프장.' },
  { id: 'c-gw-002', name: '휘슬링락 CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2011', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '50만평', description: '예술적인 조경과 코스 설계.' },
  { id: 'c-gw-003', name: '오크밸리 CC', region: '강원', holes: 36, type: CourseType.MEMBER, openYear: '1998', address: '강원 원주시 지정면', grassType: GrassType.BENTGRASS, area: '100만평', description: '대규모 리조트형 명문 골프장.' },
  
  // 충청권
  { id: 'c-cc-001', name: '우정힐스 CC', region: '충청', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '충남 천안시 동남구', grassType: GrassType.BENTGRASS, area: '35만평', description: '한국 오픈 개최지.' },
  { id: 'c-cc-002', name: '천룡 CC', region: '충청', holes: 27, type: CourseType.MEMBER, openYear: '1995', address: '충북 진천군 이월면', grassType: GrassType.MIXED, area: '40만평', description: '중부권 최고의 명문 회원제.' },

  // 경상권
  { id: 'c-gs-001', name: '정산 CC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '경남 김해시 주촌면', grassType: GrassType.BENTGRASS, area: '45만평', description: '태광실업 운영 영남권 명문.' },
  { id: 'c-gs-002', name: '보라 CC', region: '경상', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '울산 울주군 삼동면', grassType: GrassType.BENTGRASS, area: '42만평', description: '반도건설 운영 고급 회원제.' },
  
  // 전라권
  { id: 'c-jl-001', name: '파인비치 골프링크스', region: '전라', holes: 18, type: CourseType.PUBLIC, openYear: '2010', address: '전남 해남군 화원면', grassType: GrassType.BENTGRASS, area: '30만평', description: '한국의 페블비치로 불리는 씨사이드.' },
  { id: 'c-jl-002', name: '승주 CC', region: '전라', holes: 27, type: CourseType.MEMBER, openYear: '1992', address: '전남 순천시 상사면', grassType: GrassType.ZOYSIA, area: '60만평', description: '포스코 운영 호남권 대표 명문.' },

  // 제주권
  { id: 'c-jj-001', name: '나인브릿지', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2001', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '33만평', description: '세계 100대 코스 선정 글로벌 명문.' },
  { id: 'c-jj-002', name: '핀크스 GC', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '1999', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '40만평', description: 'SK네트웍스 운영 고품격 코스.' },
  { id: 'c-jj-003', name: '블랙스톤 제주', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '제주 제주시 한림읍', grassType: GrassType.BENTGRASS, area: '50만평', description: '웅장한 원시림 속 코스.' },
];

// --- MOCK LOGS (Enhanced for large DB matching test) ---
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
