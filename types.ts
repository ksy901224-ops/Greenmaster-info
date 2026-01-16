
export enum Department {
  SALES = '영업',
  RESEARCH = '연구소', 
  CONSTRUCTION = '건설사업',
  CONSULTING = '컨설팅',
  MANAGEMENT = '관리',
}

export enum UserRole {
  SENIOR = '상급자 (Senior)',
  INTERMEDIATE = '중급자 (Intermediate)',
  JUNIOR = '하급자 (Junior)',
  ADMIN = '시스템 관리자 (Admin)',
}

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  avatar?: string;
  status: UserStatus;
}

export enum CourseType {
  MEMBER = '회원제',
  PUBLIC = '대중제',
}

export enum GrassType {
  ZOYSIA = '한국잔디',
  BENTGRASS = '벤트그라스',
  KENTUCKY = '캔터키블루그라스',
  MIXED = '혼합',
}

export type Region = '서울' | '경기' | '강원' | '충북' | '충남' | '전북' | '전남' | '경북' | '경남' | '제주' | '인천' | '부산' | '대구' | '울산' | '대전' | '광주' | '세종' | '기타';

// --- New Types for Management Details ---
export type ManagementModel = '직영' | '위탁';

// Allow multiple types: e.g. Direct management but outsources Pest Control
export type OutsourcingType = '전면위탁(턴키)' | '지급자재' | '인력용역' | '방제용역' | '장비용역' | '기타';

export interface CourseManagementInfo {
  model: ManagementModel;
  outsourcingCompany?: string; // 위탁사 명 (OO)
  outsourcingTypes?: OutsourcingType[]; // Changed from single contractType to array
  
  staff: {
    regularCount: number; // 관리직/정규직
    dailyMale: number;    // 일용직 남
    dailyFemale: number;  // 일용직 여
  };
  
  budget: {
    pesticide: number; // 농약 예산
    fertilizer: number; // 비료 예산
    material: number; // 자재 예산
    total: number; // 총 관리 비용
  };
}
// ---------------------------------------

export interface GolfCoursePerson {
  personId: string;
  name: string;
  role: string;
  affinity: AffinityLevel;
  isCurrent: boolean;
}

export interface GolfCourse {
  id: string;
  name: string;
  region: Region;
  holes: number;
  type: CourseType;
  openYear: string;
  address: string;
  grassType: GrassType; 
  grassInfo?: {
    green: string;
    tee: string;
    fairway: string;
  };
  area: string; 
  areaInfo?: {
    total: string;
    green: string;
    tee: string;
    fairway: string;
  };
  management?: CourseManagementInfo; // New Field
  length?: string;
  description: string;
  lat?: number;
  lng?: number;
  issues?: string[];
  staffCount?: number; // Legacy simple count, prefer management.staff.regularCount
  associatedPeople?: GolfCoursePerson[];
  managerId?: string; // Designated Key Contact / Manager ID
}

export interface CareerRecord {
  courseId: string;
  courseName: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export enum AffinityLevel {
  HOSTILE = -2,
  UNFRIENDLY = -1,
  NEUTRAL = 0,
  FRIENDLY = 1,
  ALLY = 2,
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  currentRole: string;
  currentRoleStartDate?: string;
  currentCourseId?: string;
  careers: CareerRecord[];
  affinity: AffinityLevel;
  notes: string;
}

export interface LogEntry {
  id: string;
  date: string;
  author: string;
  department: Department;
  courseId: string; // Primary Course ID
  courseName: string; // Primary Course Name
  relatedCourses?: { id: string; name: string }[]; // New: Support for multiple courses
  title: string;
  content: string;
  imageUrls?: string[];
  tags?: string[];
  contactPerson?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type EventType = 'MEETING' | 'VISIT' | 'CONSTRUCTION' | 'OTHER';

export interface ExternalEvent {
  id: string;
  title: string;
  date: string;
  source: 'Google' | 'Outlook' | 'Manual';
  time?: string;
  location?: string;
  type?: EventType; 
  courseId?: string; 
  personId?: string;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'REJECT';
  targetType: 'LOG' | 'COURSE' | 'PERSON' | 'USER' | 'FINANCE' | 'MATERIAL';
  targetName: string;
  details?: string;
}

export interface FinancialRecord {
  id: string;
  courseId: string;
  year: number;
  revenue: number;
  profit?: number;
  updatedAt: number;
}

export enum MaterialCategory {
  PESTICIDE = '농약',
  FERTILIZER = '비료',
  GRASS = '잔디/종자',
  MATERIAL = '기타자재',
}

export interface MaterialRecord {
  id: string;
  courseId: string;
  supplyDate: string; // 공급일 (YYYY-MM-DD)
  category: MaterialCategory;
  name: string; // 제품명
  standard: string; // 규격
  quantity: number; // 수량
  unit: string; // 단위 (kg, L, box)
  unitPrice: number; // 단가
  manager: string; // 담당자
  lastUpdated: string;
  notes?: string;
}
