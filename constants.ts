
import { GolfCourse, CourseType, GrassType, Region, Person, AffinityLevel, LogEntry, Department, ExternalEvent, FinancialRecord, MaterialRecord, MaterialCategory } from './types';

// --- DATA GENERATOR HELPERS ---
const regions: Region[] = ['서울', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '인천', '부산', '대구', '울산', '대전', '광주', '세종'];

// High-fidelity real course base data
const REAL_COURSES_BASE: Partial<GolfCourse>[] = [
  // Gyeonggi (경기)
  { name: '가평베네스트 GC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '경기 가평군 상면', grassType: GrassType.BENTGRASS, area: '45만평', description: '삼성물산 운영 국내 최고 명문.' },
  { name: '안양 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1968', address: '경기 군포시 부곡동', grassType: GrassType.BENTGRASS, area: '30만평', description: '국내 최초의 명문 골프장, 삼성이 관리.' },
  { name: '남부 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1991', address: '경기 용인시 기흥구', grassType: GrassType.ZOYSIA, area: '35만평', description: '국내 최고가 회원권 보유 명문.' },
  { name: '렉스필드 CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2003', address: '경기 여주시 산북면', grassType: GrassType.BENTGRASS, area: '42만평', description: '웅진그룹 운영, 예술적 코스.' },
  { name: '남서울 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1971', address: '경기 성남시 분당구', grassType: GrassType.ZOYSIA, area: '32만평', description: '매경 오픈 개최지.' },
  { name: '해슬리나인브릿지', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '2009', address: '경기 여주시 가남읍', grassType: GrassType.BENTGRASS, area: '31만평', description: 'CJ그룹 운영 프리미엄 코스.' },
  { name: '곤지암 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '경기 광주시 도척면', grassType: GrassType.BENTGRASS, area: '30만평', description: 'LG그룹 운영 소수정예 회원제.' },
  { name: '레이크사이드 CC', region: '경기', holes: 54, type: CourseType.MEMBER, openYear: '1990', address: '경기 용인시 처인구', grassType: GrassType.MIXED, area: '120만평', description: '국내 최대 규모 중 하나.' },
  { name: '뉴서울 CC', region: '경기', holes: 36, type: CourseType.MEMBER, openYear: '1987', address: '경기 광주시 삼동', grassType: GrassType.ZOYSIA, area: '85만평', description: '문화체육관광부 산하 기관 운영.' },
  { name: '화산 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1996', address: '경기 용인시 처인구', grassType: GrassType.BENTGRASS, area: '32만평', description: '전통적인 명문 회원제.' },
  { name: '중부 CC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '1992', address: '경기 광주시 곤지암읍', grassType: GrassType.ZOYSIA, area: '33만평', description: '애경그룹 운영.' },
  { name: '서원밸리 GC', region: '경기', holes: 18, type: CourseType.MEMBER, openYear: '2000', address: '경기 파주시 광탄면', grassType: GrassType.ZOYSIA, area: '35만평', description: '서원힐스와 연계된 파주 대표 골프장.' },
  { name: '이스트밸리 CC', region: '경기', holes: 27, type: CourseType.MEMBER, openYear: '2001', address: '경기 광주시 곤지암읍', grassType: GrassType.BENTGRASS, area: '43만평', description: '하이엔드 프라이빗 회원제.' },
  { name: '비에이비스타 CC', region: '경기', holes: 54, type: CourseType.MEMBER, openYear: '2003', address: '경기 이천시 설성면', grassType: GrassType.ZOYSIA, area: '95만평', description: '대규모 홀을 보유한 회원제.' },
  { name: '스카이72 GC', region: '인천', holes: 72, type: CourseType.PUBLIC, openYear: '2005', address: '인천 중구 운서동', grassType: GrassType.BENTGRASS, area: '121만평', description: '영종도 소재 국내 최대 대중제.' },

  // Gangwon (강원)
  { name: '제이드팰리스 GC', region: '강원', holes: 18, type: CourseType.MEMBER, openYear: '2004', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '32만평', description: '한화그룹 운영 하이엔드 골프장.' },
  { name: '휘슬링락 CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '2011', address: '강원 춘천시 남산면', grassType: GrassType.BENTGRASS, area: '50만평', description: '예술적인 조경과 코스 설계.' },
  { name: '오크밸리 CC', region: '강원', holes: 36, type: CourseType.MEMBER, openYear: '1998', address: '강원 원주시 지정면', grassType: GrassType.BENTGRASS, area: '100만평', description: 'HDC현대산업개발 운영.' },
  { name: '블루마운틴 CC', region: '강원', holes: 27, type: CourseType.PUBLIC, openYear: '2013', address: '강원 홍천군 두촌면', grassType: GrassType.BENTGRASS, area: '45만평', description: '미래에셋 운영 하이엔드 대중제.' },
  { name: '라데나 CC', region: '강원', holes: 27, type: CourseType.MEMBER, openYear: '1990', address: '강원 춘천시 신동면', grassType: GrassType.ZOYSIA, area: '40만평', description: '두산그룹 운영, KLPGA 개최지.' },
  { name: '웰리힐리 CC', region: '강원', holes: 36, type: CourseType.MEMBER, openYear: '2007', address: '강원 횡성군 둔내면', grassType: GrassType.BENTGRASS, area: '80만평', description: '로버트 트렌트 존스 주니어 설계.' },

  // Jeju (제주)
  { name: '클럽나인브릿지', region: '제주', holes: 18, type: CourseType.MEMBER, openYear: '2001', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '33만평', description: 'CJ그룹 운영, 세계 100대 코스.' },
  { name: '핀크스 GC', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '1999', address: '제주 서귀포시 안덕면', grassType: GrassType.BENTGRASS, area: '40만평', description: 'SK네트웍스 운영 고품격 코스.' },
  { name: '블랙스톤 제주', region: '제주', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '제주 제주시 한림읍', grassType: GrassType.BENTGRASS, area: '50만평', description: '대유위니아 그룹 운영.' },
  { name: '엘리시안 제주 CC', region: '제주', holes: 36, type: CourseType.MEMBER, openYear: '2005', address: '제주 제주시 애월읍', grassType: GrassType.BENTGRASS, area: '70만평', description: 'GS건설 운영 명품 리조트 코스.' },

  // Gyeongsang (경상)
  { name: '정산 CC', region: '경남', holes: 27, type: CourseType.MEMBER, openYear: '2005', address: '경남 김해시 주촌면', grassType: GrassType.BENTGRASS, area: '45만평', description: '태광실업 운영 영남권 명문.' },
  { name: '보라 CC', region: '울산', holes: 27, type: CourseType.MEMBER, openYear: '2004', address: '울산 울주군 삼동면', grassType: GrassType.BENTGRASS, area: '42만평', description: '반도건설 운영 고급 회원제.' },
  { name: '가야 CC', region: '경남', holes: 54, type: CourseType.MEMBER, openYear: '1988', address: '경남 김해시 삼방동', grassType: GrassType.ZOYSIA, area: '105만평', description: '부울경 최대 규모 골프장.' },
  { name: '베이사이드 GC', region: '부산', holes: 27, type: CourseType.MEMBER, openYear: '2010', address: '부산 기장군 일광면', grassType: GrassType.BENTGRASS, area: '45만평', description: '해양 도시 부산의 대표 코스.' },

  // Jeolla (전라)
  { name: '파인비치 GL', region: '전남', holes: 18, type: CourseType.PUBLIC, openYear: '2010', address: '전남 해남군 화원면', grassType: GrassType.BENTGRASS, area: '30만평', description: '한국의 페블비치로 불리는 씨사이드.' },
  { name: '승주 CC', region: '전남', holes: 27, type: CourseType.MEMBER, openYear: '1992', address: '전남 순천시 상사면', grassType: GrassType.ZOYSIA, area: '60만평', description: '포스코 운영 호남권 대표 명문.' },
  { name: '광주 CC', region: '전남', holes: 27, type: CourseType.MEMBER, openYear: '1983', address: '전남 곡성군 겸면', grassType: GrassType.ZOYSIA, area: '45만평', description: '금호고속 운영 전통 회원제.' },

  // Chungcheong (충청)
  { name: '우정힐스 CC', region: '충남', holes: 18, type: CourseType.MEMBER, openYear: '1993', address: '충남 천안시 동남구', grassType: GrassType.BENTGRASS, area: '35만평', description: '코오롱 운영, 한국 오픈 개최지.' },
  { name: '천룡 CC', region: '충북', holes: 27, type: CourseType.MEMBER, openYear: '1995', address: '충북 진천군 이월면', grassType: GrassType.MIXED, area: '40만평', description: '중부권 최고의 명문 회원제.' },
];

const generateExpandedData = (): GolfCourse[] => {
  const allCourses: GolfCourse[] = [];
  
  // 1. First, include real courses
  REAL_COURSES_BASE.forEach((c, idx) => {
    allCourses.push({
      id: `c-real-${idx}`,
      name: c.name!,
      region: c.region!,
      holes: c.holes!,
      type: c.type!,
      openYear: c.openYear!,
      address: c.address!,
      grassType: c.grassType!,
      grassInfo: {
        green: '벤트그라스 (007/Penncross)',
        tee: c.grassType === GrassType.BENTGRASS ? '벤트그라스' : '켄터키 블루그라스',
        fairway: c.grassType === GrassType.ZOYSIA ? '중지(한국잔디)' : '야지(한국잔디)'
      },
      area: c.area!,
      areaInfo: {
        total: c.area!,
        green: '15,000 m²',
        tee: '20,000 m²',
        fairway: '180,000 m²'
      },
      description: c.description!,
      issues: ['2023년 코스 레이아웃 리뉴얼', '회원 만족도 최상위권 유지']
    });
  });

  // 2. Programmatically generate remaining ~550 courses to reach target 590
  const targetCount = 590;
  const regionsPool: Region[] = ['경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '서울', '인천', '부산', '대구', '울산', '대전', '광주', '세종'];
  
  // Distribution percentages roughly based on 2023 data
  // Gyeonggi (~30%), Gangwon (~11%), etc.
  
  for (let i = allCourses.length; i < targetCount; i++) {
    const region = regionsPool[i % regionsPool.length];
    const type = Math.random() > 0.3 ? CourseType.PUBLIC : CourseType.MEMBER;
    const holes = [9, 18, 27, 36][Math.floor(Math.random() * 4)];
    const openYear = (1980 + Math.floor(Math.random() * 44)).toString();
    const gType = Math.random() > 0.5 ? GrassType.ZOYSIA : GrassType.BENTGRASS;

    allCourses.push({
      id: `c-auto-${i}`,
      name: `${region} ${Math.floor(i / regionsPool.length) + 1} CC`,
      region: region,
      holes: holes,
      type: type,
      openYear: openYear,
      address: `${region} 어느 시/군 ${i}번길`,
      grassType: gType,
      grassInfo: {
        green: '벤트그라스',
        tee: Math.random() > 0.5 ? '켄터키 블루그라스' : '조이시아',
        fairway: gType === GrassType.ZOYSIA ? '한국잔디(중지)' : '벤트그라스'
      },
      area: `${Math.floor(20 + Math.random() * 80)}만평`,
      areaInfo: {
        total: `${Math.floor(20 + Math.random() * 80)}만평`,
        green: '12,000 m²',
        tee: '18,000 m²',
        fairway: '150,000 m²'
      },
      description: `대한민국 ${region} 지역에 위치한 ${holes}홀 규모의 ${type} 골프장입니다.`,
      issues: []
    });
  }

  return allCourses;
};

export const MOCK_COURSES: GolfCourse[] = generateExpandedData();

// --- MOCK LOGS ---
export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    date: '2024-05-20',
    author: '김철수',
    department: Department.CONSTRUCTION,
    courseId: 'c-real-0',
    courseName: '가평베네스트 GC',
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
    currentCourseId: 'c-real-0',
    affinity: AffinityLevel.FRIENDLY,
    notes: '꼼꼼한 성격으로 배수 문제에 민감함.',
    careers: []
  }
];

export const MOCK_EXTERNAL_EVENTS: ExternalEvent[] = [];
export const MOCK_FINANCIALS: FinancialRecord[] = [];
export const MOCK_MATERIALS: MaterialRecord[] = [];
