
// @google/genai service for intelligence processing
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Enhanced Document Analysis for Master DB Bulk Ingestion and Log Extraction
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

  const courseListStr = existingCourseNames.slice(0, 300).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 데이터 및 인프라 관리 전문가입니다.
      제공된 파일(PDF, 이미지, 텍스트)에서 정보를 정밀하게 추출하여 JSON 데이터로 변환하세요.
      
      [분석 목표]
      1. 마스터 정보: 골프장의 공식 명칭, 지역, 상세 주소, 홀 수(Holes), 운영 형태(회원제/대중제).
      2. 업무 정보: 해당 골프장에서 발생한 특정 날짜의 업무 내용, 이슈, 담당자 등.

      [추출 및 매칭 규칙]
      - 기존 DB 목록: [${courseListStr}]
      - 위 목록에 명칭이 포함되어 있으면 기존 골프장으로 간주하고, 없으면 신규(New)로 표시할 준비를 하세요.
      - 지역(region): 반드시 '서울, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 인천, 부산, 대구, 울산, 대전, 광주, 세종, 기타' 중 하나로 정확히 매핑하세요.
      - 날짜: YYYY-MM-DD 형식을 엄격히 준수하세요.

      반드시 제공된 JSON 스키마 배열([]) 형식으로만 답변하세요.
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
            title: { type: Type.STRING, description: "업무 제목" },
            date: { type: Type.STRING, description: "발생일 (YYYY-MM-DD)" },
            department: { type: Type.STRING, description: "담당 부서 (영업, 연구소, 건설사업, 컨설팅, 관리)" },
            brief_summary: { type: Type.STRING, description: "업무 내용의 핵심 요약" },
            detailed_content: { type: Type.STRING, description: "추출된 전체 상세 내용" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            contact_person: { type: Type.STRING, description: "관련 인물 성함" },
            course_info: {
                type: Type.OBJECT,
                properties: {
                    address: { type: Type.STRING, description: "상세 주소" },
                    region: { type: Type.STRING, description: "행정구역" },
                    holes: { type: Type.NUMBER, description: "홀 수" },
                    type: { type: Type.STRING, description: "운영 형태" },
                    openYear: { type: Type.STRING, description: "개장년도" },
                    area: { type: Type.STRING, description: "총 면적" }
                }
            },
            description: { type: Type.STRING, description: "해당 골프장에 대한 AI의 종합적인 특징 설명" }
          },
          required: ["courseName", "title", "date", "brief_summary"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

// Streaming Chat Session for Multi-turn Conversation
export const createChatSession = (
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] }
): Chat => {
  const prunedLogs = appContextData.logs.slice(0, 50).map(l => ({ 
    date: l.date, course: l.courseName, title: l.title, content: l.content.substring(0, 150) 
  }));
  const prunedCourses = appContextData.courses.slice(0, 100).map(c => ({ 
    name: c.name, region: c.region, holes: c.holes, type: c.type 
  }));
  const prunedPeople = appContextData.people.slice(0, 100).map(p => ({ 
    name: p.name, role: p.currentRole, course: prunedCourses.find(c => c.name === p.currentCourseId)?.name || '기타', affinity: p.affinity 
  }));

  const systemInstruction = `
    당신은 골프장 비즈니스 및 인적 네트워크 전문가 '그린마스터 AI'입니다.
    다음 제공되는 시스템 데이터를 바탕으로 사용자의 질문에 답하세요.
    데이터에는 골프장 정보, 업무 일지, 인물 관계도가 포함되어 있습니다.
    
    [시스템 데이터 요약]
    - 골프장: ${JSON.stringify(prunedCourses)}
    - 인물: ${JSON.stringify(prunedPeople)}
    - 주요 일지: ${JSON.stringify(prunedLogs)}

    사용자가 특정 인물이나 골프장의 이력을 물으면 데이터를 검색하여 정확히 답변하세요.
    데이터에 없는 내용은 추측하지 말고 모른다고 답변하세요.
    답변은 전문적이면서도 친절한 한국어로 작성하세요.
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });
};

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
