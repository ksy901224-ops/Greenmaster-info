
// @google/genai service for intelligence processing
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Enhanced Document Analysis for Master DB Syncing and Log Extraction
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

  const courseListStr = existingCourseNames.slice(0, 200).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 및 데이터 관리 전문가입니다.
      제공된 파일(PDF, 이미지, 텍스트)에서 정보를 추출하여 구조화된 JSON 데이터로 변환하세요.
      
      정보는 두 가지 유형으로 분류됩니다:
      1. 마스터 정보: 골프장의 주소, 지역, 홀수, 운영 형태 등 고정 데이터.
      2. 업무/활동 정보: 특정 날짜에 발생한 업무 일지, 현황 보고, 이슈 등.

      [추출 규칙]
      - 각 항목을 개별 골프장 단위로 객체를 생성하세요.
      - 기존 DB 목록 [${courseListStr}]과 대조하여 동일 골프장인지 판단하세요.
      - 지역(region): 반드시 '서울, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 인천, 부산, 대구, 울산, 대전, 광주, 세종, 기타' 중 하나로 매핑하세요.
      - 날짜: YYYY-MM-DD 형식을 유지하세요.
      - 부서(department): '영업', '연구소', '건설사업', '컨설팅', '관리' 중 선택하세요.

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
            title: { type: Type.STRING, description: "항목의 제목 또는 일지 제목" },
            date: { type: Type.STRING, description: "발생일 (YYYY-MM-DD)" },
            department: { type: Type.STRING, description: "담당 부서" },
            brief_summary: { type: Type.STRING, description: "핵심 요약 (한 문장)" },
            detailed_content: { type: Type.STRING, description: "상세 업무 내용 또는 특징 설명" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "관련 키워드 태그" },
            contact_person: { type: Type.STRING, description: "관련 인물 성함" },
            course_info: {
                type: Type.OBJECT,
                properties: {
                    address: { type: Type.STRING, description: "상세 주소" },
                    region: { type: Type.STRING, description: "행정구역 (예: 경기, 강원)" },
                    holes: { type: Type.NUMBER, description: "홀 수" },
                    type: { type: Type.STRING, description: "운영 형태 (회원제/대중제/체력단련장)" },
                    openYear: { type: Type.STRING, description: "개장년도 (YYYY)" },
                    area: { type: Type.STRING, description: "총 면적" }
                }
            },
            strategic_analysis: {
                type: Type.OBJECT,
                properties: {
                    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            description: { type: Type.STRING, description: "골프장 전반에 대한 AI 분석 평" }
          },
          required: ["courseName", "title", "date", "brief_summary"]
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
    1. 현황 진단
    2. 관계 전략
    3. Action Plan
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};

// Search App with AI Streaming
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

  const contextString = JSON.stringify({ 
      logs: prunedLogs, 
      courses: prunedCourses, 
      people: prunedPeople 
  });
  
  const prompt = `당신은 GreenMaster AI 비서입니다. 다음 데이터를 바탕으로 사용자의 질문에 답하세요.
  [Context]: ${contextString}
  [Question]: "${query}"
  답변은 한국어로 작성하세요.`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `일지 분석 리포트: ${log.courseName} - ${log.title}\n${log.content.substring(0, 1000)}`;
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
  const prompt = `인물 평판 분석: ${person.name} (${person.currentRole}). 관련 기록 요약:\n${prunedLogs}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text;
};
