
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, GolfCourse, Person, GrassType, CourseType, MaterialCategory, MaterialRecord } from '../types';

// Safety check for API Key
const getApiKey = () => {
  const key = process.env.API_KEY || '';
  if (!key || key.includes('YOUR_API_KEY')) {
    console.error("API Key is missing or invalid.");
    return '';
  }
  return key;
};

// Initialize Gemini client with fallback to empty string to prevent startup crash
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper for retry logic with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>, 
  retries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const msg = error.message || '';
      
      // Retry on 429 (Quota), 503 (Overloaded), 500 (Internal), or Fetch failures
      const isTransient = 
        msg.includes('429') || 
        msg.includes('503') || 
        msg.includes('500') || 
        msg.includes('INTERNAL') || 
        msg.includes('overloaded') ||
        msg.includes('fetch');
      
      if (isTransient && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API Warning (Attempt ${i + 1}/${retries}): ${msg}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry on client errors (400-404)
      if (msg.includes('400') || msg.includes('401') || msg.includes('403') || msg.includes('404')) {
        throw error;
      }
      
      throw error;
    }
  }
  throw lastError;
}

export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "API Key가 설정되지 않아 AI 요약을 사용할 수 없습니다.";
  }

  const peopleInfo = people.map(p => `${p.name}(${p.currentRole}, 친밀도: ${p.affinity}, 특징: ${p.notes})`).join(' | ');
  const logsInfo = logs.map(l => `[${l.date}] ${l.department} - ${l.title}: ${l.content}`).join('\n');

  const prompt = `
    당신은 골프장 관리 전문가이자 비즈니스 전략가입니다.
    **특히, "골프장 업계는 매우 좁아서 평판과 인간관계가 비즈니스의 핵심"이라는 점을 명심하고 분석하세요.**
    
    다음은 '${course.name}' 골프장에 대한 정보, 주요 인물, 그리고 최근 업무 일지들입니다.
    
    이 정보를 심층 분석하여 다음 항목을 포함한 "전략적 경영 및 코스 관리 인사이트 보고서"를 작성해주세요. 
    단순한 요약보다는 **이면의 맥락(Context)과 관계 역학(Dynamics)을 읽어내는 통찰력 있는 분석**을 제공해야 합니다. 보고서는 전문적인 톤앤매너를 유지하며 약 600자 내외로 작성하세요.

    1. **종합 현황 진단 및 리스크 (Status & Risks)**: 
       - 코스 상태(잔디 품질, 시설 노후화)와 공사 진행 상황을 점검하세요.
       - **잠재적 리스크**: 일정 지연, 예산 초과, 민원 발생, 날씨 영향 등 구체적인 위험 요소를 식별하고 경고하세요.

    2. **비즈니스 기회 및 확장 전략 (Opportunities)**: 
       - 업무 일지에서 발견되는 니즈(Needs)를 바탕으로 신규 계약, 자재 납품, 컨설팅 등의 구체적인 세일즈 기회를 포착하세요.
       - 골프장의 특징(산악형, 링크스 등)에 맞춘 맞춤형 제안 포인트를 도출하세요.

    3. **경쟁 시장 및 평판 분석 (Competitive & Reputation)**: 
       - **경쟁사 활동**: 경쟁사의 저가 공세, 로비 활동, 신제품 시연 등 정황을 포착하세요.
       - **시장 내 평판**: 해당 골프장의 업계 내 평판이나, 우리 회사에 대한 인식 변화를 감지하세요.

    4. **인적 네트워크 및 관계 관리 (Human Relations)**: 
       - **업계의 좁은 특성**을 고려하여, 주요 인물(Key Person)과의 관계를 어떻게 활용할지 제안하세요.
       - 과거 이력(Career History)이나 성향을 바탕으로 적대적 인물을 설득하거나 우군을 활용하는 구체적인 화법/접근법을 제시하세요.

    5. **Action Plan (우선순위 과제)**: 
       - 지금 당장 실행해야 할 가장 시급하고 임팩트 있는 3가지 과제를 우선순위대로 제안하세요.

    -- 데이터 --
    [골프장 개요]
    - 이름: ${course.name} (${course.openYear}년 개장)
    - 규모: ${course.holes}홀 (${course.type})
    - 잔디: ${course.grassType}
    - 특징: ${course.description}
    
    [주요 인물 프로필]
    ${peopleInfo}

    [최근 업무 일지 히스토리]
    ${logsInfo}
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
    });
    return response.text || "요약 생성에 실패했습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message || '';
    if (msg.includes('429')) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (429)";
    return `AI 분석 중 오류가 발생했습니다: ${msg.substring(0, 50)}...`;
  }
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "API Key가 없어 분석할 수 없습니다.";
  }

  const prompt = `
    당신은 비즈니스 인텔리전스(BI) 전문가입니다. 아래의 업무 일지를 분석하여 의사결정에 도움이 되는 핵심 인사이트를 추출해주세요.
    
    **[산업 특성 고려]**
    골프장 산업은 폐쇄적이고 인적 네트워크가 중요합니다. 단순한 업무 내용뿐만 아니라, 이면에 숨겨진 "관계의 역학"이나 "과거 이력으로 인한 영향", "평판 리스크"를 읽어내세요.

    [업무 일지 정보]
    - 날짜/부서: ${log.date} / ${log.department}
    - 제목: ${log.title}
    - 내용: ${log.content}
    - 태그: ${log.tags?.join(', ') || '없음'}

    다음 3가지 섹션으로 나누어 간결하게(총 400자 이내) 분석해주세요. 
    가독성을 위해 각 섹션 제목은 **(Bold)** 처리를 해주세요.

    1. **📋 핵심 요약**: 
       업무의 본질과 현재 상황을 한 줄로 명확하게 요약하세요.

    2. **🔍 숨겨진 함의/리스크 (Hidden Implications)**: 
       텍스트 이면에 숨겨진 맥락, 잠재적 위험, 또는 기회를 포착하세요.
       * 특히 인물 간의 갈등이나 협력 관계, 경쟁사의 움직임에 주목하세요.
       * 공사/계약 건의 경우 지연 리스크나 비용 문제를 점검하세요.

    3. **🚀 추천 액션**: 
       담당자가 취해야 할 구체적이고 실행 가능한(Actionable) 행동 2가지를 제안하세요.
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
    });
    return response.text || "분석 결과를 생성하지 못했습니다.";
  } catch (error) {
    console.error("Gemini Log Analysis Error:", error);
    return "AI 분석 중 오류가 발생했습니다.";
  }
};

// Interface for the structured response
export interface AnalyzedLogData {
  title: string;
  content: string;
  date: string;
  department: string;
  courseName: string;
  tags: string[];
  project_name?: string;
  contact_person?: string;
  delivery_date?: string;
  key_issues?: string[]; 
  participants?: string[]; 
  weather?: string;
  summary_report?: string; // New: Deep summary report
  course_info?: { // New field for auto-creating courses
    address?: string;
    holes?: number;
    type?: string;
  };
}

// Helper to validate AI response structure
const validateAnalyzedData = (data: any): AnalyzedLogData => {
  if (!data || typeof data !== 'object') {
    throw new Error("AI 응답 데이터가 올바르지 않습니다.");
  }
  
  // Ensure required fields exist with default fallbacks if missing
  return {
    title: typeof data.title === 'string' ? data.title : '',
    content: typeof data.content === 'string' ? data.content : '',
    date: typeof data.date === 'string' ? data.date : new Date().toISOString().split('T')[0],
    department: typeof data.department === 'string' ? data.department : '영업',
    courseName: typeof data.courseName === 'string' ? data.courseName : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    project_name: typeof data.project_name === 'string' ? data.project_name : undefined,
    contact_person: typeof data.contact_person === 'string' ? data.contact_person : undefined,
    delivery_date: typeof data.delivery_date === 'string' ? data.delivery_date : undefined,
    key_issues: Array.isArray(data.key_issues) ? data.key_issues : [],
    participants: Array.isArray(data.participants) ? data.participants : [],
    weather: typeof data.weather === 'string' ? data.weather : undefined,
    summary_report: typeof data.summary_report === 'string' ? data.summary_report : undefined,
    course_info: data.course_info || {},
  };
};

export const analyzeDocument = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }[], // Updated to accept Array
  existingCourseNames: string[] = []
): Promise<AnalyzedLogData[] | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key가 설정되지 않았습니다. 시스템 관리자에게 문의하세요.");
  }

  // Construct content parts based on input type
  const contentParts: any[] = [];
  const validMimeTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/heic', 
    'image/heif'
  ];

  let totalSizeInBytes = 0;
  const MAX_BATCH_SIZE_BYTES = 18 * 1024 * 1024; // Lowered limit for safety (18MB)

  // Iterate over all inputs (Batch Processing)
  for (const item of inputData) {
      if (item.base64Data && item.mimeType) {
        if (!validMimeTypes.includes(item.mimeType)) {
             throw new Error(`지원하지 않는 파일 형식(${item.mimeType})이 포함되어 있습니다. (PDF, JPG, PNG 지원)`);
        }
        
        // Approximate size check
        const size = (item.base64Data.length * 3) / 4;
        totalSizeInBytes += size;

        contentParts.push({
            inlineData: {
                mimeType: item.mimeType,
                data: item.base64Data
            }
        });
      } else if (item.textData) {
        contentParts.push({
            text: `[입력 텍스트 데이터]\n${item.textData}`
        });
      }
  }

  if (contentParts.length === 0) {
      throw new Error("분석할 데이터가 없습니다.");
  }

  if (totalSizeInBytes > MAX_BATCH_SIZE_BYTES) {
      throw new Error(`전체 파일 크기가 제한(${Math.floor(MAX_BATCH_SIZE_BYTES / (1024*1024))}MB)을 초과했습니다. 파일을 나누어 업로드해주세요.`);
  }

  // Serialize course list for the prompt
  const courseListStr = existingCourseNames.join(', ');

  // Add the prompt instruction
  contentParts.push({
    text: `
      당신은 골프장 비즈니스 전문 AI 비서입니다. 
      제공된 ${contentParts.length}개의 **업무 보고서 파일(PDF, Excel 스크린샷, 이미지 등)**을 심층 분석하여 구조화된 데이터로 추출하세요.
      
      [필수 작업 지침]
      1. **다중 문서 처리**: 여러 개의 파일이 입력되었습니다. 각 파일의 내용을 개별적으로 분석하여 **각각 별도의 업무 일지 항목**으로 추출하세요.
         - 하나의 파일에 여러 골프장 이슈가 섞여 있다면, 이를 분리하여 여러 개의 항목으로 만드세요.
      
      2. **형식 준수**: 결과는 반드시 단일 **JSON 배열(Array)**로 반환해야 합니다.

      [골프장 식별 및 신규 생성 규칙 (Entity Resolution & Creation)]
      현재 시스템에 등록된 골프장 표준 명칭 목록: [${courseListStr}]
      
      1. **Course Name Matching (Fuzzy Matching - 매우 중요)**: 
         - 문서에서 추출한 골프장 이름이 위 "등록된 골프장 표준 명칭 목록"의 항목과 유사하다면(철자, 띄어쓰기, 접미사 차이 등), **반드시 목록에 있는 정확한 이름을 사용**하세요.
         - **중요**: 이름의 일부분만 일치해도 문맥상 동일하다고 판단되면 표준 명칭을 사용하세요.
         - 예시: "스카이뷰" -> "스카이뷰 CC" (목록에 있는 경우 변환)
      
      2. **신규 생성 감지**: 
         - 위 규칙대로 매칭을 시도했으나 목록에 없는 완전히 새로운 골프장이라면, 문서에 나온 이름을 그대로 사용하세요.
      
      3. **신규 골프장 상세 정보 추출**:
         - **기존 목록에 없는 골프장일 경우**, 문서 내용이나 일반적인 지식을 바탕으로 다음 정보를 **course_info** 객체에 최대한 채워주세요.
         - **address**: 골프장 주소 (시/군/구 단위라도 추출).
         - **holes**: 홀 수 (18, 27, 36 등). 모르면 18로 추정.
         - **type**: '회원제' 또는 '대중제(퍼블릭)'. 문맥상 회원권 이야기가 있으면 회원제.

      [일지 정보 추출]
      4. title: 내용을 요약한 구체적인 제목.
      5. content: 업무 내용의 상세 본문을 가능한 누락 없이 추출하세요. 
      6. date: 날짜 (YYYY-MM-DD). 문서 내 날짜가 없으면 오늘.
      7. department: ('영업', '연구소', '건설사업', '컨설팅', '관리') 중 문맥에 맞게 추론.
      8. tags: 상황별 구체적 태그 5~7개.
      9. summary_report: (필수) 전체 내용을 3~4문장으로 요약한 보고서. (골프장 업계의 좁은 인간관계 및 평판 리스크 관점 포함)

      출력은 반드시 JSON 배열([]) 형식이어야 합니다.
    `
  });

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: contentParts
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                title: { type: Type.STRING, description: "문서 제목" },
                content: { type: Type.STRING, description: "업무 내용 상세 본문" },
                date: { type: Type.STRING, description: "날짜 (YYYY-MM-DD)" },
                department: { type: Type.STRING, description: "관련 부서" },
                courseName: { type: Type.STRING, description: "골프장 이름 (매칭된 표준명 또는 신규명)" },
                project_name: { type: Type.STRING, description: "프로젝트명", nullable: true },
                contact_person: { type: Type.STRING, description: "담당자", nullable: true },
                delivery_date: { type: Type.STRING, description: "기한", nullable: true },
                participants: { type: Type.ARRAY, items: { type: Type.STRING }, description: "참석자/관련자" },
                weather: { type: Type.STRING, description: "날씨", nullable: true },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "태그 목록" },
                key_issues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "핵심 이슈 및 리스크" },
                summary_report: { type: Type.STRING, description: "심층 요약 보고서" },
                course_info: {
                    type: Type.OBJECT,
                    properties: {
                        address: { type: Type.STRING, nullable: true },
                        holes: { type: Type.NUMBER, nullable: true },
                        type: { type: Type.STRING, nullable: true }
                    },
                    nullable: true,
                    description: "신규 골프장일 경우에만 채워짐"
                }
                },
                required: ["title", "content", "date", "department", "courseName", "tags", "summary_report"]
            }
          }
        }
      });
    });

    const text = response.text;
    
    if (!text && response.candidates?.[0]?.finishReason) {
        const reason = response.candidates[0].finishReason;
        if (reason === 'SAFETY') throw new Error("문서 내용이 AI 안전 정책(Safety Policy)에 의해 차단되었습니다.");
        if (reason === 'RECITATION') throw new Error("저작권 관련 사유로 답변이 차단되었습니다.");
        throw new Error(`AI 분석이 중단되었습니다 (사유: ${reason}).`);
    }

    if (!text) throw new Error("AI 응답이 비어있습니다. (No Content)");
    
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error:", text);
      throw new Error("AI 응답 형식이 올바르지 않습니다. (JSON Parse Error)");
    }

    if (Array.isArray(parsedData)) {
        return parsedData.map(validateAnalyzedData);
    } else if (typeof parsedData === 'object') {
        return [validateAnalyzedData(parsedData)];
    } else {
        throw new Error("AI 응답 데이터 형식이 맞지 않습니다.");
    }

  } catch (error: any) {
    const msg = error.message || "";
    
    // Explicit Error Mapping for User Feedback
    if (msg.includes("지원하지 않는") || msg.includes("파일 크기")) throw error;
    if (msg.includes('413') || msg.includes('too large')) throw new Error("파일 크기가 너무 큽니다. (Server 413 Error)");
    if (msg.includes('400')) throw new Error("잘못된 요청입니다. 파일 형식을 확인하세요. (400 Error)");
    if (msg.includes('401') || msg.includes('403')) throw new Error("AI 서비스 권한 오류입니다. API Key가 유효하지 않습니다.");
    if (msg.includes('429')) throw new Error("요청량이 너무 많습니다. 잠시 후 다시 시도하세요. (Quota Exceeded)");
    if (msg.includes('503') || msg.includes('500')) throw new Error("AI 서비스 서버가 일시적으로 불안정합니다. (Service Unavailable)");
    
    console.error("Unhandled Gemini Error:", error);
    throw new Error(`분석 중 오류 발생: ${msg.substring(0, 100)}...`);
  }
};

/**
 * Parses an image or text document containing Material/Inventory table data.
 * Designed for Excel screenshots or CSV data.
 */
export const analyzeMaterialInventory = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }
): Promise<Omit<MaterialRecord, 'id' | 'courseId' | 'lastUpdated'>[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key가 필요합니다.");

  const contentPart = inputData.base64Data 
    ? { inlineData: { mimeType: inputData.mimeType || 'image/png', data: inputData.base64Data } }
    : { text: inputData.textData || '' };

  const prompt = `
    당신은 골프장 자재 재고 관리 전문가입니다.
    제공된 이미지(엑셀/표 스크린샷) 또는 텍스트 데이터에서 자재 재고 목록을 추출하세요.

    [필수 추출 항목]
    1. **category**: 품목의 특성에 따라 다음 중 하나로 정확히 분류하세요.
       - '농약' (살균제, 살충제, 제초제, 성장조절제 등)
       - '비료' (복합비료, 요소, 칼슘제, 미량요소 등)
       - '잔디/종자' (벤트그라스, 켄터키, 중지, 씨앗 등)
       - '기타자재' (배관, 모래, 장비부품, 작업도구 등)
    2. **name**: 제품명 또는 품목명.
    3. **quantity**: 수량 (숫자만 추출, 콤마 제거).
    4. **unit**: 단위 (kg, L, bag, 포, 개, m 등).
    5. **supplier**: 공급처 또는 제조사 (없으면 null).
    6. **year**: 데이터의 기준 연도 (문서 내에 날짜가 있다면 해당 연도, 없으면 ${new Date().getFullYear()}).
    7. **notes**: 비고 사항 (규격, 용도 등 추가 정보).

    [주의사항]
    - 표의 헤더(Category, Name 등)는 제외하고 실제 데이터 행만 추출하세요.
    - 수량이 명확하지 않은 행은 제외하세요.
    - JSON 배열 형태로 반환하세요.
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [contentPart, { text: prompt }]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.INTEGER },
                category: { type: Type.STRING, enum: Object.values(MaterialCategory) },
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                supplier: { type: Type.STRING, nullable: true },
                notes: { type: Type.STRING, nullable: true }
              },
              required: ['year', 'category', 'name', 'quantity', 'unit']
            }
          }
        }
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);

  } catch (error: any) {
    console.error("Material Analysis Error:", error);
    throw new Error("자재 데이터 분석 중 오류가 발생했습니다.");
  }
};

export interface AICourseDetails {
  address: string;
  holes: number;
  type: CourseType;
  grassType: GrassType;
  description: string;
  lat?: number;
  lng?: number;
}

export const getCourseDetailsFromAI = async (courseName: string): Promise<AICourseDetails> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key가 필요합니다.");
  }

  // Enhanced prompt to simulate Naver Maps lookup with GPS
  const prompt = `
    당신은 한국 골프장 데이터베이스 및 지도 전문가입니다. 
    "${courseName}"라는 골프장을 네이버 지도(Naver Maps)나 공식 웹사이트에서 검색한다고 가정하고, 다음 정보를 정확하게 추출해주세요.
    
    **정보를 찾을 수 없다면 가장 가능성 높은 정보를 추론하여 제공하세요.**

    요구사항:
    1. **주소**: 반드시 '도로명 주소'를 우선으로 찾아주세요. (예: 경기도 여주시 북내면 여양1로 500)
    2. **GPS 좌표**: 해당 주소의 대략적인 위도(lat)와 경도(lng)를 추정하여 제공하세요. (소수점 6자리까지)
    3. **홀 수**: 총 홀 수(Holes)를 정확히 기재하세요. (18, 27, 36 등). 모르면 18로 가정.
    4. **운영 형태**: '회원제'인지 '대중제(퍼블릭)'인지 구분하세요.
    5. **잔디 종류**: 한국잔디(중지/금잔디)인지 양잔디(벤트그라스/켄터키블루그라스)인지 확인하고, 모르면 '혼합'으로 하세요.
    6. **설명**: 골프장의 지형적 특징(산악형, 평지형, 링크스 등), 난이도, 주요 이슈를 2문장 내외로 요약하세요.

    Response Schema (JSON):
    {
      "address": "도로명 주소 (필수)",
      "lat": 위도(숫자),
      "lng": 경도(숫자),
      "holes": 숫자,
      "type": "회원제" 또는 "대중제",
      "grassType": "한국잔디", "벤트그라스", "캔터키블루그라스", 또는 "혼합",
      "description": "설명 텍스트"
    }
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
           responseSchema: {
            type: Type.OBJECT,
            properties: {
              address: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              holes: { type: Type.NUMBER },
              type: { type: Type.STRING },
              grassType: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['address', 'holes', 'type', 'grassType', 'description']
          }
        }
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);

    // Map string values to enums safely
    const mapType = (t: string): CourseType => {
      if (t?.includes('회원')) return CourseType.MEMBER;
      return CourseType.PUBLIC;
    };

    const mapGrass = (g: string): GrassType => {
      if (g?.includes('벤트')) return GrassType.BENTGRASS;
      if (g?.includes('캔터키') || g?.includes('켄터키')) return GrassType.KENTUCKY;
      if (g?.includes('한국') || g?.includes('조이시아') || g?.includes('금잔디')) return GrassType.ZOYSIA;
      return GrassType.MIXED;
    };

    return {
      address: data.address || '주소 정보 없음',
      lat: data.lat || 37.5665,
      lng: data.lng || 126.9780,
      holes: data.holes || 18,
      type: mapType(data.type),
      grassType: mapGrass(data.grassType),
      description: data.description || '정보를 찾을 수 없습니다.'
    };

  } catch (error) {
    console.error("AI Course Search Error:", error);
    throw new Error("골프장 정보를 가져오는 데 실패했습니다.");
  }
};

/**
 * Searches through the application's stored data using Gemini AI.
 * Uses the fast 'gemini-2.5-flash-lite' model for quick lookups.
 */
export const searchAppWithAI = async (query: string, appContextData: {
  logs: LogEntry[],
  courses: GolfCourse[],
  people: Person[]
}): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key가 필요합니다.");
  }

  // Serialize the context data to a string format the AI can understand
  // Minimizing tokens by selecting only relevant fields could be an optimization,
  // but sending the JSON structure is usually efficient enough for this scale.
  const contextString = JSON.stringify({
    courses: appContextData.courses.map(c => ({ name: c.name, type: c.type, desc: c.description, issues: c.issues })),
    people: appContextData.people.map(p => ({ name: p.name, role: p.currentRole, courseId: p.currentCourseId, notes: p.notes })),
    recent_logs: appContextData.logs.slice(0, 30).map(l => ({ // Limit to recent 30 logs
      date: l.date,
      course: l.courseName,
      title: l.title,
      content: l.content
    }))
  });

  const todayDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const prompt = `
    You are an intelligent internal search engine for a Golf Course Management System (GreenMaster).
    The user is asking a question about their stored data (Logs, People, Golf Courses).
    
    [Current System Date]: ${todayDate} (Use this for relative date calculations like 'last week', 'yesterday', 'recent')
    [User Query]: "${query}"

    [Database Context]:
    ${contextString}

    [Instructions]:
    1. Search through the provided Database Context to find the answer.
    2. **Date Handling**: Carefully interpret relative dates (e.g., "recent 1 week", "last month") using [Current System Date].
    3. Answer strictly based on the provided data. Do not use outside knowledge unless it's general common sense.
    4. If the answer is found, summarize it clearly in Korean.
       - **Citation Requirement**: You MUST cite the source date and title for every fact. (e.g., "(출처: 2024-05-20 [제목])").
    5. If the information is not in the database, explicitly state: "시스템 데이터에서 관련 정보를 찾을 수 없습니다."
    6. Be concise and professional.
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest', // Using the fast model as requested
        contents: prompt,
      });
    });

    return response.text || "답변을 생성할 수 없습니다.";
  } catch (error) {
    console.error("AI Search Error:", error);
    throw new Error("AI 검색 중 오류가 발생했습니다.");
  }
};

/**
 * Analyzes a person's reputation based on logs and profile data.
 * Focuses on relationship dynamics and hidden risks in the narrow golf industry.
 */
export const generatePersonReputationReport = async (
  person: Person,
  relatedLogs: LogEntry[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key가 필요합니다.";

  const logsText = relatedLogs.map(l => `[${l.date}] ${l.title}: ${l.content}`).join('\n');

  const prompt = `
    당신은 골프장 업계의 평판 관리 및 인사 검증 전문가입니다.
    대상 인물에 대한 정보를 바탕으로, 업계 내 **"평판(Reputation)", "숨겨진 네트워크(Hidden Network)", "잠재적 리스크(Risk)"**를 심층 분석한 **대외비(Confidential) 보고서**를 작성해주세요.
    
    **[산업 특성 - 필수 고려 사항]**: 
    골프장 업계는 매우 좁고 폐쇄적입니다. 공식적인 업무 능력뿐만 아니라, **누구 라인인지, 과거에 누구와 갈등이 있었는지, 업계 소문은 어떠한지**가 채용 및 비즈니스 결정의 핵심입니다. 행간에 숨겨진 정치적 역학 관계를 읽어내세요.
    
    [대상 인물 프로필]
    - 이름: ${person.name}
    - 현 직책: ${person.currentRole}
    - 성향/메모: ${person.notes}
    - 친밀도 등급: ${person.affinity}

    [관련 업무 기록 및 행적]
    ${logsText || "관련된 직접적인 업무 기록이 없습니다. 인물 프로필과 일반적인 업계 경향을 바탕으로 추론하세요."}

    다음 4가지 항목으로 분석 보고서를 작성하세요:
    1. **평판 요약 (Reputation Overview)**: 업무 역량과 함께 업계 내 '평판 온도'를 진단하세요. (예: "실력은 좋으나 적이 많음", "무난하지만 결정력이 부족함")
    2. **관계 역학 및 파벌 (Power Dynamics)**: 누구와 친하고 누구와 갈등이 있었는가? (우호 세력 vs 적대 세력 식별)
    3. **Red Flag (잠재적 리스크)**: 과거 실수, 금전적 이슈, 이직 잦음, 혹은 '배신' 가능성 등 치명적인 약점을 파헤치세요.
    4. **관리/대응 전략 (Management Strategy)**: 이 사람을 내 편으로 만들기 위한 회유책, 혹은 견제하기 위한 구체적이고 은밀한 조언.

    *말투는 냉철하고 객관적이며, 고위 경영진에게 보고하는 '정보 보고서' 톤으로 작성하세요.*
  `;

  try {
    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
    });
    return response.text || "평판 보고서를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Reputation Analysis Error:", error);
    return "AI 분석 중 오류가 발생했습니다.";
  }
};
