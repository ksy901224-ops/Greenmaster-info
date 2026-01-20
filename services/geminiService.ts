
// @google/genai service for intelligence processing
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { LogEntry, GolfCourse, Person } from '../types';

// Safely retrieve key, default to empty string if missing to prevent constructor crash
const API_KEY = process.env.API_KEY || '';
const hasKey = !!API_KEY && API_KEY !== 'undefined' && API_KEY !== '';

// Initialize only if key exists, otherwise we handle it inside functions
let ai: GoogleGenAI | null = null;
try {
    if (hasKey) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } else {
        console.warn("Gemini API Key is missing. AI features will be simulated.");
    }
} catch (e) {
    console.warn("Failed to initialize GoogleGenAI client:", e);
}

const getMockResponse = (message: string) => {
  return {
    text: `[System Warning] AI API Key가 설정되지 않았습니다. \n(.env 파일 또는 Vercel 환경 변수 'API_KEY'를 확인하세요.)\n\n요청하신 내용에 대한 시뮬레이션 응답입니다: ${message.substring(0, 50)}...`,
    extractedCourses: [],
    extractedLogs: [],
    extractedPeople: [],
    documentSummary: "API 키 미설정으로 인한 시뮬레이션 결과입니다.",
    documentDetailedReport: "환경 변수를 확인해주세요."
  };
};

/**
 * Utility to clean markdown code blocks from JSON string
 */
const cleanAndParseJson = (text: string | undefined): any => {
    if (!text) return {};
    let cleanText = text.trim();
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '');
    }
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error:", e, cleanText);
        return {}; // Return empty object on failure to prevent crash
    }
};

/**
 * Advanced Multi-Entity Extraction with Hierarchical Context & Categorization
 */
export const analyzeDocument = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }[],
  existingCourseNames: string[] = [],
  contextHint: string = ""
): Promise<any | null> => {
  if (!hasKey || !ai) return getMockResponse("Document Analysis");

  const contentParts: any[] = [];
  
  for (const item of inputData) {
      if (item.base64Data && item.mimeType) {
        contentParts.push({ inlineData: { mimeType: item.mimeType, data: item.base64Data } });
      } else if (item.textData) {
        contentParts.push({ text: `[입력 데이터]\n${item.textData}` });
      }
  }

  const courseListString = existingCourseNames.join(", ");

  contentParts.push({
    text: `
      당신은 골프장 현장 업무 보고서 전문 분석 AI입니다. 
      입력된 문서(이미지, PDF, 텍스트)를 구조화된 데이터로 변환하십시오.

      [분석 컨텍스트 힌트]
      "${contextHint}"

      [매칭 기준 데이터베이스 (Reference DB)]
      시스템 보유 골프장 명칭: [${courseListString}]
      * 추출된 이름이 위 목록과 유사하면 표준 명칭으로 변환하십시오.

      [고급 분석 알고리즘 - 계층적 맥락 상속 (Hierarchical Context Inheritance)]

      1. **헤더 정보의 상속 (Header Inheritance)**:
         - 문서의 최상단이나 표의 제목(Title Row)에 있는 정보(골프장명, 날짜)는 '부모 컨텍스트'입니다.
         - 아래 나열되는 개별 항목(Items)에 골프장 이름이 명시되지 않았다면, 무조건 '부모 컨텍스트'의 골프장을 상속받아야 합니다.
         - 예: 제목이 "태릉CC 주간 업무 보고"이고, 항목 1이 "그린 시비 작업"이라면, 항목 1의 골프장은 "태릉CC"입니다.

      2. **날짜 전파 (Date Propagation)**:
         - 문서 전체를 관통하는 기준 날짜(작성일, 보고일)를 찾으십시오.
         - 개별 항목에 날짜가 없으면 기준 날짜를 적용하십시오.

      3. **표 구조의 수평/수직 스캔**:
         - 표(Grid) 형태인 경우, 같은 행(Row)에 있는 정보는 하나의 세트입니다.
         - 만약 셀이 병합(Merged)되어 있다면, 병합된 셀의 내용을 해당되는 모든 행에 적용하십시오.

      4. **업무 유형 자동 분류 (Category Classification)**:
         - 각 로그의 내용을 분석하여 다음 중 하나로 분류하십시오:
           ['코스관리', '공사/설비', '운영/지원', '영업/마케팅', '미팅/행사', '기타']

      5. **증거 기반 검증**:
         - \`evidenceSnippet\`에 판단 근거가 된 원본 텍스트를 반드시 포함하십시오.

      반드시 제공된 JSON 스키마를 엄격히 준수하여 답변하세요. Markdown 포맷 없이 순수 JSON만 출력하세요.
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: contentParts },
      config: {
        temperature: 0.0, // Zero temperature for maximum logic adherence
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentSummary: { type: Type.STRING },
            documentDetailedReport: { type: Type.STRING },
            extractedCourses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  region: { type: Type.STRING },
                  address: { type: Type.STRING },
                  holes: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['회원제', '대중제', '기타'] },
                  openYear: { type: Type.STRING },
                  description: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                }
              }
            },
            extractedLogs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  courseName: { type: Type.STRING, description: "Normalized course name from Reference DB" },
                  rawCourseName: { type: Type.STRING, description: "The exact course name found or 'Inherited from Header'" },
                  category: { type: Type.STRING, enum: ['코스관리', '공사/설비', '운영/지원', '영업/마케팅', '미팅/행사', '기타'] },
                  title: { type: Type.STRING, description: "Specific topic" },
                  summary: { type: Type.STRING },
                  details: { type: Type.STRING, description: "Full details with bullet points" },
                  evidenceSnippet: { type: Type.STRING, description: "Source text row or section header + item text" },
                  department: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  confidence: { type: Type.NUMBER },
                  confidenceReason: { type: Type.STRING, description: "Why confidence is low/high?" }
                }
              }
            },
            extractedPeople: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  courseName: { type: Type.STRING },
                  affinity: { type: Type.NUMBER },
                  notes: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["extractedCourses", "extractedLogs", "extractedPeople", "documentSummary"]
        }
      }
    });
    return cleanAndParseJson(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const createChatSession = (
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] }
): Chat => {
  const prunedLogs = appContextData.logs.slice(0, 50).map(l => ({ 
    d: l.date, c: l.courseName, t: l.title, content: l.content.substring(0, 200) 
  }));
  const prunedCourses = appContextData.courses.slice(0, 100).map(c => ({ 
    n: c.name, r: c.region, h: c.holes, t: c.type 
  }));
  const prunedPeople = appContextData.people.slice(0, 100).map(p => ({ 
    n: p.name, r: p.currentRole, c: p.currentCourseId, a: p.affinity
  }));

  const systemInstruction = `
    당신은 대한민국 골프장 업계의 최고 전략가 'GreenMaster AI'입니다.
    모든 답변은 전문적이고 정중한 한국어로 작성하세요.
    데이터에 기반하여 요약, 상세 설명, 리스크 및 기회 요인을 구분하여 답변하세요.
    [컨텍스트 데이터]
    - 골프장: ${JSON.stringify(prunedCourses)}
    - 인물: ${JSON.stringify(prunedPeople)}
    - 히스토리: ${JSON.stringify(prunedLogs)}
  `;

  if (!hasKey || !ai) {
      return {
          sendMessage: async () => ({ text: "시스템 오류: API 키가 설정되지 않았습니다." }),
          sendMessageStream: async function* () { yield { text: "시스템 오류: API 키가 설정되지 않았습니다. 관리자에게 문의하세요." } as any; }
      } as unknown as Chat;
  }

  return ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.4
    },
  });
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  if (!hasKey || !ai) return "AI 분석 기능을 사용할 수 없습니다. (API Key Missing)";

  const prompt = `
    다음 업무 일지를 정밀 분석하여 임원 보고용 비즈니스 인텔리전스 리포트를 작성하세요.
    
    [일지 데이터]
    - 메인 골프장: ${log.courseName}
    - 부서: ${log.department}
    - 제목: ${log.title}
    - 내용: ${log.content}

    [작성 포맷]
    1. **핵심 요약 (Executive Summary)**
    2. **상세 분석 (Detailed Analysis)**
    3. **전략적 시사점 (Strategic Implications)**
    4. **잠재적 리스크 및 대응 (Risks & Countermeasures)**
    
    톤앤매너: 전문적, 객관적, 통찰력 있음. Markdown 형식을 준수하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text || "분석 실패";
  } catch (e) {
    return "분석 서비스 일시적 오류";
  }
};

export const generateCourseRelationshipIntelligence = async (
  course: GolfCourse,
  people: Person[],
  logs: LogEntry[]
): Promise<string> => {
  if (!hasKey || !ai) return "인텔리전스 기능을 사용할 수 없습니다. (API Key Missing)";

  const staffInfo = people.map(p => `- ${p.name} (${p.currentRole}, 우호도: ${p.affinity}): ${p.notes}`).join('\n');
  const prunedLogs = logs.slice(0, 30).map(l => `[${l.date}] ${l.author}: ${l.title} - ${l.content.substring(0, 100)}...`).join('\n');
  
  const prompt = `
    골프장 '${course.name}'의 인적 네트워크 및 관계 리스크 정밀 분석 리포트를 비즈니스 한국어로 작성하세요.
    
    [입력 데이터]
    - 골프장 현황: ${course.description}
    - 현재 소속 인원:\n${staffInfo}
    - 관련 업무 이력 히스토리:\n${prunedLogs}

    [분석 요청 사항]
    1. **핵심 이해관계자 (Key-Men) 파악**: 의사결정에 결정적 영향을 미치는 인물 및 이들과의 연결 고리 분석.
    2. **관계 건전성 진단**: 당사와의 전체적인 우호도 추이 및 협력 수준 평가.
    3. **잠재적 인적 리스크**: 비우호적 인물, 최근의 소속 변경, 업무 일지에서 발견된 갈등 징후 포착.
    4. **전략적 관계 강화 가이드**: 향후 비즈니스 확장을 위해 누구에게, 어떻게 접근해야 하는지 실질적인 행동 지침 제안.

    전문적이고 통찰력 있는 '인텔리전스 보고서' 형식으로 한국어로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text || "분석 실패";
  } catch (e) { return "분석 중 오류 발생"; }
};

export const analyzeMaterialInventory = async (
  fileData: { base64Data: string, mimeType: string }
): Promise<any[]> => {
  if (!hasKey || !ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: fileData.mimeType, data: fileData.base64Data } },
          { text: "골프장 거래 명세서 또는 자재 목록 추출. [필수 항목] supplyDate(YYYY-MM-DD), category(농약/비료/잔디/기타), name(제품명), standard(규격), quantity(수량), unit(단위), unitPrice(단가), manager(담당자), notes(비고). 결과는 반드시 JSON Array 형태로 출력하세요." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              supplyDate: { type: Type.STRING },
              category: { type: Type.STRING },
              name: { type: Type.STRING },
              standard: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              unitPrice: { type: Type.NUMBER },
              manager: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ["supplyDate", "category", "name", "quantity", "unit"]
          }
        }
      }
    });
    return cleanAndParseJson(response.text) || [];
  } catch (e) { return []; }
};

export const generatePersonReputationReport = async (
  person: Person,
  logs: LogEntry[]
): Promise<string> => {
  if (!hasKey || !ai) return "서비스 연결 불가: API Key를 확인하세요.";

  const prunedLogs = logs.slice(0, 15).map(l => `${l.date}: ${l.title}`).join('\n');
  const prompt = `
    인물 프로파일링 및 전략 분석: ${person.name} (${person.currentRole}). 
    [관련 업무 기록 히스토리]
    ${prunedLogs}
    [인물 특징 메모]
    ${person.notes}
    
    위 데이터를 기반으로 심층 분석 리포트를 작성하세요.
    
    [출력 양식]
    1. **전문성 및 성향 평가**: 업무 스타일, 강점, 전문 분야 상세 분석.
    2. **핵심 리스크 요인 (Potential Risks)**: (중요) 우리 회사와의 관계에서 발생할 수 있는 부정적 요소, 갈등 가능성, 또는 해당 인물의 약점.
    3. **비즈니스 기회 (Strategic Opportunities)**: (중요) 이 인물을 통해 얻을 수 있는 전략적 이점, 키맨으로서의 가치, 네트워크 확장 가능성.
    4. **네트워크 영향력**: 업계 내 평판 및 영향력 수준.
    5. **접근 및 설득 전략**: 관계를 강화하기 위한 구체적인 행동 가이드 (Action Plan).

    정중하고 통찰력 있는 비즈니스 한국어로 작성해 주세요.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text || "분석 실패";
  } catch (e) { return "분석 중 오류 발생"; }
};

export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  if (!hasKey || !ai) return "API Key 누락으로 분석 불가";

  const prunedLogs = logs.slice(0, 20).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 15).map(p => `${p.name}(${p.currentRole}, 우호도:${p.affinity})`).join(' | ');
  const prompt = `
    골프장 종합 전략 진단: '${course.name}'. 
    - 현황: ${course.description} 
    - 인적 자산: ${prunedPeople} 
    - 히스토리 요약: ${prunedLogs}

    [작성 가이드]
    모든 항목을 논리적이고 정제된 한국어로 작성하세요.
    1. **운영 현황 진단**: 현재 골프장의 상태 및 주요 이슈 요약
    2. **인적 네트워크 분석**: 키맨(Key-man) 파악 및 영향력 분석
    3. **비즈니스 기회 (Opportunities)**: 당사가 파고들 수 있는 틈새 전략
    4. **향후 전망**: 업계 트렌드 대비 이 골프장의 포지셔닝
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text || "분석 실패";
  } catch (e) { return "분석 중 오류 발생"; }
};
