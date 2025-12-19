
// @google/genai service for intelligence processing
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

// Use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Enhanced Document Analysis for Master DB Syncing and Strategic Extraction
export const analyzeDocument = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }[],
  existingCourseNames: string[] = []
): Promise<any[] | null> => {
  const contentParts: any[] = [];
  
  for (const item of inputData) {
      if (item.base64Data && item.mimeType) {
        contentParts.push({ inlineData: { mimeType: item.mimeType, data: item.base64Data } });
      } else if (item.textData) {
        contentParts.push({ text: `[입력 데이터]\n${item.textData}` });
      }
  }

  // Prune course list to top 200 for prompt size stability
  const courseListStr = existingCourseNames.slice(0, 200).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 전문가입니다.
      제공된 텍스트/파일을 분석하여 구조화된 업무 리포트 데이터를 추출하세요.

      [추출 미션]
      1. 핵심 요약(brief_summary): 해당 문서의 가장 중요한 내용을 1~2문장으로 압축하세요.
      2. 상세 내용(detailed_content): 원문의 맥락과 수치, 구체적인 진행 상황을 누락 없이 구조화하여 작성하세요.
      3. 정보 추출: 골프장명, 날짜, 부서, 제목, 관련 인물 등을 정확히 찾아내세요.
      4. 전략적 분석: 문제점(Issues)과 기회 요인을 도출하세요.
      5. 명칭 매칭: 기존 DB 목록 [${courseListStr}] 중 유사한 이름이 있다면 해당 명칭으로 통일하세요.

      [골프장 정보(course_info) 추출 특이사항]
      - 지역(region): 반드시 다음 값 중 하나로만 매핑하세요: 서울, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 인천, 부산, 대구, 울산, 대전, 광주, 세종, 기타. (예: "강원도" -> "강원")
      - 홀수(holes): 문서에 언급된 코스 규모(9, 18, 27, 36 등)를 숫자로 추출하세요.
      - 운영형태(type): '회원제' 또는 '대중제' 여부를 판단하세요.

      반드시 제공된 JSON 스키마에 맞춰 배열([]) 형식으로 출력하세요.
    `
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            courseName: { type: Type.STRING, description: "골프장 명칭" },
            date: { type: Type.STRING, description: "YYYY-MM-DD 형식의 날짜" },
            department: { type: Type.STRING, description: "부서명 (영업, 연구소, 건설사업, 컨설팅 중 하나)" },
            title: { type: Type.STRING, description: "문서의 핵심 제목" },
            brief_summary: { type: Type.STRING, description: "비즈니스 관점의 핵심 요약 (1~2문장)" },
            detailed_content: { type: Type.STRING, description: "본문의 모든 정보를 포함한 상세 서술 내용" },
            contact_person: { type: Type.STRING, description: "언급된 주요 인물 성함" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "관련 태그 리스트" },
            course_info: {
                type: Type.OBJECT,
                properties: {
                    address: { type: Type.STRING, description: "상세 주소" },
                    region: { type: Type.STRING, description: "광역 자치단체 명칭 (예: 경기, 강원)" },
                    holes: { type: Type.NUMBER, description: "홀 수" },
                    type: { type: Type.STRING, description: "운영 형태 (회원제/대중제)" }
                }
            },
            strategic_analysis: {
                type: Type.OBJECT,
                properties: {
                    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["issues", "opportunities"]
            }
          },
          required: ["courseName", "title", "brief_summary", "detailed_content", "date"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

// Course Strategy Summary Enhancement
export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 15).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 10).map(p => `${p.name}(${p.currentRole}, 친밀도:${p.affinity})`).join(' | ');

  const prompt = `
    당신은 골프장 운영 컨설턴트입니다. '${course.name}' 골프장에 대한 데이터 분석 리포트를 작성하세요.
    
    데이터 요약:
    - 지역/규모: ${course.region} / ${course.holes}홀
    - 현황: ${course.description?.substring(0, 500)}
    - 최근 일지 요약: ${prunedLogs}
    - 주요 인물: ${prunedPeople}

    요구사항:
    1. **현황 진단**: 현재 코스 및 운영 상태를 진단하세요.
    2. **관계 전략**: 주요 인물들과의 친밀도를 바탕으로 한 비즈니스 접근법을 제시하세요.
    3. **Action Plan**: 향후 핵심 업무 3가지를 제시하세요.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};

// Search App with AI Streaming - PRUNED CONTEXT TO PREVENT STACK OVERFLOW
export const searchAppWithAIStream = async (
  query: string, 
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] },
  onChunk: (text: string) => void
): Promise<void> => {
  const prunedLogs = (appContextData.logs || []).slice(0, 30).map(l => ({ 
    d: l.date, 
    c: l.courseName, 
    t: l.title, 
    content: l.content.substring(0, 100) 
  }));
  
  const prunedCourses = (appContextData.courses || []).slice(0, 50).map(c => ({ 
    n: c.name, 
    r: c.region, 
    h: c.holes 
  }));
  
  const prunedPeople = (appContextData.people || []).slice(0, 20).map(p => ({ 
    n: p.name, 
    r: p.currentRole, 
    a: p.affinity 
  }));

  let contextString = "";
  try {
      contextString = JSON.stringify({ 
          logs: prunedLogs, 
          courses: prunedCourses, 
          people: prunedPeople 
      });
  } catch (e) {
      contextString = "Context error: Data too large.";
  }
  
  const prompt = `당신은 GreenMaster AI 비서입니다. 다음 데이터를 바탕으로 사용자의 질문에 답하세요.
  [Context (Pruned)]: ${contextString}
  [Question]: "${query}"
  답변은 한국어로, 날짜와 골프장명을 언급하며 구체적으로 작성하세요.`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `
    당신은 골프장 관리 전문가입니다. 다음 일지를 분석하여 요약, 리스크, 권장 액션 순으로 리포트를 작성하세요.
    골프장: ${log.courseName}
    제목: ${log.title}
    내용: ${log.content.substring(0, 1000)}
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "분석 실패";
};

export const analyzeMaterialInventory = async (
  fileData: { base64Data: string, mimeType: string }
): Promise<any[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: fileData.mimeType, data: fileData.base64Data } },
        { text: "골프장 자재 목록 추출 (JSON ARRAY: year, category, name, quantity, unit, supplier, notes)" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.NUMBER },
            category: { type: Type.STRING },
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            supplier: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["year", "category", "name", "quantity", "unit"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const generatePersonReputationReport = async (
  person: Person,
  logs: LogEntry[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 10).map(l => `${l.date}: ${l.title}`).join('\n');
  const prompt = `인물 평판 분석: ${person.name} (${person.currentRole}). 관련 기록 요약:\n${prunedLogs}\n위 정보를 바탕으로 비즈니스 관점의 신뢰도 및 위험요인 보고서를 작성하세요.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text;
};
